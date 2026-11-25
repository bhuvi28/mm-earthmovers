import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { query, FlagRecord } from './db';

export type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '1y' | 'all';

function getTimeCondition(timeRange: TimeRange, column: string = 'created_at'): string {
  switch (timeRange) {
    case 'today':
      return `${column} >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;
    case 'yesterday':
      return `${column} >= ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata') AND ${column} < (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;
    case '7d':
      return `${column} >= ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '6 days') AT TIME ZONE 'Asia/Kolkata')`;
    case '30d':
      return `${column} >= ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '29 days') AT TIME ZONE 'Asia/Kolkata')`;
    case '90d':
      return `${column} >= ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '89 days') AT TIME ZONE 'Asia/Kolkata')`;
    case '1y':
      return `${column} >= ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '364 days') AT TIME ZONE 'Asia/Kolkata')`;
    case 'all':
    default:
      return '1=1';
  }
}

const BASE_ADMIN_EXCLUDE_SQL =
  "e.page_path NOT LIKE '/admin%' AND (e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%') AND (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))";

const LEAD_CLICK_SQL =
  "(e.element_target LIKE '%wa.me%' OR e.element_target ILIKE '%whatsapp%' OR e.element_text ILIKE '%whatsapp%' OR e.element_target LIKE 'tel:%' OR e.element_text ILIKE '%call%')";

export interface PlacementAttributionRow {
  placement: string;
  total_clicks: number;
  unique_visitors: number;
  unique_sessions: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  form_submits: number;
  last_clicked_at: string | null;
}

export interface SearchFunnelStats {
  bySurface: Array<{ surface: string; searches: number; zero_results: number }>;
  totalSelects: number;
  keyboardSelects: number;
  mouseSelects: number;
  rankBuckets: Array<{ rank_bucket: string; selects: number; sharePct: number }>;
  zeroResultSessions: number;
  recoveredSessions: number;
  zeroResultWhatsappClicks: number;
  recoveryRate: number;
}

export interface FormFunnelRow {
  form_name: string;
  starts: number;
  validation_errors: number;
  abandons: number;
  submit_errors: number;
  submits: number;
  completion_rate: number;
}

export interface FormFunnelStats {
  forms: FormFunnelRow[];
  totals: {
    starts: number;
    validation_errors: number;
    abandons: number;
    submit_errors: number;
    submits: number;
    completion_rate: number;
  };
}

/**
 * Fetches complete executive & behavioral analytics via 3 CTE-consolidated SQL queries
 * to stay comfortably within the `max: 4` serverless pool budget (`OBS-03`).
 */
export async function getDashboardStats(timeRange: TimeRange = 'today') {
  const eventTimeCond = `(${getTimeCondition(timeRange, 'e.created_at')}) AND ${BASE_ADMIN_EXCLUDE_SQL}`;
  const sessionTimeCond = `(${getTimeCondition(timeRange, 's.started_at')}) AND (s.entry_page IS NULL OR s.entry_page NOT LIKE '/admin%')`;
  const leadTimeCond = getTimeCondition(timeRange, 'created_at');

  const isSingleDay = timeRange === 'today' || timeRange === 'yesterday';
  const isMonthly = timeRange === '1y' || timeRange === 'all';
  const dateFormat = isSingleDay ? 'HH24:00' : isMonthly ? 'YYYY-MM' : 'YYYY-MM-DD';

  // Query 1/3: KPIs, Dwell Buckets, Backup Form Count, Time Series, Tech & Referrers, Flags
  const summaryPromise = query<{
    active_users_now: string;
    persisted_form_submissions: string;
    kpis_json: Record<string, string | number> | null;
    session_agg_json: Record<string, string | number> | null;
    time_series_json: Array<{
      period: string;
      visitors: string;
      pageviews: string;
      clicks: string;
      leads: string;
    }>;
    devices_json: Array<{ device_type: string; count: string }>;
    browsers_json: Array<{ browser: string; count: string }>;
    os_json: Array<{ os: string; count: string }>;
    referrers_json: Array<{ referrer: string; count: string }>;
    utm_json: Array<{
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
      count: string;
    }>;
    flags_json: FlagRecord[];
  }>(
    `
    WITH filtered_events AS (
      SELECT
        e.id,
        e.visitor_id,
        e.session_id,
        e.event_type,
        e.page_path,
        e.page_title,
        e.element_text,
        e.element_target,
        e.element_tag,
        e.metadata,
        e.created_at,
        v.device_type,
        v.browser,
        v.os
      FROM analytics_events e
      LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
      WHERE ${eventTimeCond}
    ),
    filtered_sessions AS (
      SELECT s.*
      FROM analytics_sessions s
      LEFT JOIN analytics_visitors v ON s.visitor_id = v.visitor_id
      WHERE ${sessionTimeCond}
        AND (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))
    ),
    kpi_agg AS (
      SELECT
        COUNT(DISTINCT visitor_id) AS total_visitors,
        COUNT(DISTINCT session_id) AS total_sessions,
        COUNT(CASE WHEN event_type = 'pageview' THEN 1 END) AS total_pageviews,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS total_clicks,
        COUNT(CASE WHEN event_type = 'click' AND (element_target LIKE '%wa.me%' OR element_text ILIKE '%whatsapp%' OR element_target ILIKE '%whatsapp%') THEN 1 END) AS whatsapp_clicks,
        COUNT(CASE WHEN event_type = 'click' AND (element_target LIKE 'tel:%' OR element_text ILIKE '%call%') THEN 1 END) AS phone_calls,
        COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) AS form_leads,
        COUNT(CASE WHEN event_type = 'rage_click' THEN 1 END) AS rage_clicks,
        COUNT(CASE WHEN event_type = 'dead_click' THEN 1 END) AS dead_clicks
      FROM filtered_events
    ),
    session_agg AS (
      SELECT
        COALESCE(ROUND(AVG(duration_seconds)), 0) AS avg_duration_seconds,
        COUNT(CASE WHEN duration_seconds < 10 THEN 1 END) AS bounce_under_10s,
        COUNT(CASE WHEN duration_seconds >= 10 AND duration_seconds < 60 THEN 1 END) AS skim_10_60s,
        COUNT(CASE WHEN duration_seconds >= 60 AND duration_seconds < 300 THEN 1 END) AS engaged_1_5m,
        COUNT(CASE WHEN duration_seconds >= 300 AND duration_seconds < 900 THEN 1 END) AS deep_5_15m,
        COUNT(CASE WHEN duration_seconds >= 900 THEN 1 END) AS zombie_over_15m
      FROM filtered_sessions
    )
    SELECT
      (SELECT COUNT(DISTINCT visitor_id)::text FROM analytics_sessions WHERE last_active_at >= NOW() - INTERVAL '5 minutes') AS active_users_now,
      (SELECT COUNT(*)::text FROM analytics_leads WHERE ${leadTimeCond}) AS persisted_form_submissions,
      (SELECT row_to_json(k) FROM kpi_agg k) AS kpis_json,
      (SELECT row_to_json(sa) FROM session_agg sa) AS session_agg_json,
      (SELECT COALESCE(json_agg(t ORDER BY t.period ASC), '[]'::json) FROM (
        SELECT
          TO_CHAR(e.created_at AT TIME ZONE 'Asia/Kolkata', '${dateFormat}') AS period,
          COUNT(DISTINCT e.visitor_id)::text AS visitors,
          COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END)::text AS pageviews,
          COUNT(CASE WHEN e.event_type = 'click' THEN 1 END)::text AS clicks,
          COUNT(CASE WHEN e.event_type = 'form_submit' OR (e.event_type = 'click' AND ${LEAD_CLICK_SQL}) THEN 1 END)::text AS leads
        FROM filtered_events e
        GROUP BY period
      ) t) AS time_series_json,
      (SELECT COALESCE(json_agg(d), '[]'::json) FROM (
        SELECT
          COALESCE(device_type, 'desktop') AS device_type,
          COUNT(DISTINCT visitor_id)::text AS count
        FROM filtered_events
        GROUP BY device_type
        ORDER BY COUNT(DISTINCT visitor_id) DESC
      ) d) AS devices_json,
      (SELECT COALESCE(json_agg(b), '[]'::json) FROM (
        SELECT
          COALESCE(browser, 'Other') AS browser,
          COUNT(DISTINCT visitor_id)::text AS count
        FROM filtered_events
        GROUP BY browser
        ORDER BY COUNT(DISTINCT visitor_id) DESC
        LIMIT 6
      ) b) AS browsers_json,
      (SELECT COALESCE(json_agg(o), '[]'::json) FROM (
        SELECT
          COALESCE(os, 'Other') AS os,
          COUNT(DISTINCT visitor_id)::text AS count
        FROM filtered_events
        GROUP BY os
        ORDER BY COUNT(DISTINCT visitor_id) DESC
        LIMIT 6
      ) o) AS os_json,
      (SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT
          COALESCE(referrer, 'Direct / None') AS referrer,
          COUNT(*)::text AS count
        FROM filtered_sessions
        GROUP BY referrer
        ORDER BY COUNT(*) DESC
        LIMIT 20
      ) r) AS referrers_json,
      (SELECT COALESCE(json_agg(u), '[]'::json) FROM (
        SELECT
          COALESCE(utm_source, '') AS utm_source,
          COALESCE(utm_medium, '') AS utm_medium,
          COALESCE(utm_campaign, '') AS utm_campaign,
          COUNT(*)::text AS count
        FROM filtered_sessions
        WHERE utm_source IS NOT NULL OR utm_campaign IS NOT NULL
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) u) AS utm_json,
      (SELECT COALESCE(json_agg(f ORDER BY f.created_at DESC), '[]'::json) FROM analytics_flags f) AS flags_json
    `
  );

  // Query 2/3: Geo, Placement Attribution, Uncapped Search Summary + Funnels, Copies, Pages, Form Funnel
  const behaviorPromise = query<{
    top_countries_json: Array<{ country: string; country_code: string; visitor_count: string; inquiries_count: string }>;
    top_regions_json: Array<{ region: string; country: string; country_code: string; visitor_count: string; inquiries_count: string }>;
    top_cities_json: Array<{ city: string; region: string; country: string; country_code: string; visitor_count: string; inquiries_count: string }>;
    top_clicks_json: Array<{ element_text: string; element_target: string; element_tag: string; page_path: string; click_count: string }>;
    placement_attribution_json: PlacementAttributionRow[];
    search_queries_json: Array<{ query_text: string; zero_results: boolean; count: string }>;
    search_summary_json: { totalSearches: number; zeroResultsSearches: number; topSearchQuery: string } | null;
    search_surfaces_json: Array<{ surface: string; searches: number; zero_results: number }>;
    search_selects_json: { totalSelects: number; keyboardSelects: number; mouseSelects: number } | null;
    search_rank_buckets_json: Array<{ rank_bucket: string; selects: number }>;
    zero_recovery_json: { zeroResultSessions: number; recoveredSessions: number; zeroResultWhatsappClicks: number } | null;
    top_copied_json: Array<{ copied_text: string; item_type: string; count: string }>;
    section_attention_json: Array<{ section_id: string; page_path: string; views: string; avg_dwell_seconds: string }>;
    top_pages_json: Array<{ page_path: string; page_title: string; views: string }>;
    page_dwell_json: Array<{ page_path: string; page_title: string; sessions: string; views: string; avg_dwell_seconds: string }>;
    form_funnel_json: Array<{
      form_name: string;
      starts: number;
      validation_errors: number;
      abandons: number;
      submit_errors: number;
      submits: number;
    }>;
  }>(
    `
    WITH filtered_events AS (
      SELECT
        e.id,
        e.visitor_id,
        e.session_id,
        e.event_type,
        e.page_path,
        e.page_title,
        e.element_text,
        e.element_target,
        e.element_tag,
        e.metadata,
        e.created_at,
        v.country,
        v.country_code,
        v.region,
        v.city
      FROM analytics_events e
      LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
      WHERE ${eventTimeCond}
    ),
    search_events AS (
      SELECT *
      FROM filtered_events
      WHERE event_type = 'search' AND (metadata->>'query') IS NOT NULL
    ),
    search_grouped AS (
      SELECT
        (metadata->>'query') AS query_text,
        COALESCE((metadata->>'zeroResults')::boolean, false) AS zero_results,
        COUNT(*) AS cnt
      FROM search_events
      GROUP BY 1, 2
    ),
    zero_sessions AS (
      SELECT DISTINCT session_id
      FROM search_events
      WHERE COALESCE((metadata->>'zeroResults')::boolean, false) = TRUE
        AND session_id IS NOT NULL
        AND session_id <> ''
    ),
    zero_session_recovery AS (
      SELECT
        z.session_id,
        BOOL_OR(
          (e.event_type = 'search' AND COALESCE((e.metadata->>'zeroResults')::boolean, false) = FALSE)
          OR (e.event_type = 'click' AND (
            e.metadata->>'action' IN ('search_zero_result_whatsapp_click', 'search_excavator_whatsapp_click', 'search_modal_select_product', 'search_machine_hub_select')
            OR e.metadata->>'placement' IN ('search_zero_results', 'search_excavator_whatsapp', 'products_zero_results', 'model_zero_results')
            OR ${LEAD_CLICK_SQL}
          ))
        ) AS recovered,
        BOOL_OR(
          e.event_type = 'click' AND (
            e.metadata->>'action' IN ('search_zero_result_whatsapp_click', 'search_excavator_whatsapp_click')
            OR e.metadata->>'placement' IN ('search_zero_results', 'search_excavator_whatsapp', 'products_zero_results', 'model_zero_results')
          )
        ) AS zero_whatsapp_clicked
      FROM zero_sessions z
      JOIN filtered_events e ON z.session_id = e.session_id
      GROUP BY z.session_id
    )
    SELECT
      (SELECT COALESCE(json_agg(c), '[]'::json) FROM (
        SELECT
          COALESCE(e.country, 'Unknown') AS country,
          COALESCE(e.country_code, 'UN') AS country_code,
          COUNT(DISTINCT e.visitor_id)::text AS visitor_count,
          COUNT(DISTINCT CASE WHEN e.event_type = 'form_submit' OR (e.event_type = 'click' AND ${LEAD_CLICK_SQL}) THEN e.id END)::text AS inquiries_count
        FROM filtered_events e
        GROUP BY e.country, e.country_code
        ORDER BY COUNT(DISTINCT e.visitor_id) DESC
        LIMIT 25
      ) c) AS top_countries_json,
      (SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT
          COALESCE(e.region, 'Unknown') AS region,
          COALESCE(e.country, 'Unknown') AS country,
          COALESCE(e.country_code, 'UN') AS country_code,
          COUNT(DISTINCT e.visitor_id)::text AS visitor_count,
          COUNT(DISTINCT CASE WHEN e.event_type = 'form_submit' OR (e.event_type = 'click' AND ${LEAD_CLICK_SQL}) THEN e.id END)::text AS inquiries_count
        FROM filtered_events e
        WHERE e.region IS NOT NULL AND e.region != ''
        GROUP BY e.region, e.country, e.country_code
        ORDER BY COUNT(DISTINCT e.visitor_id) DESC
        LIMIT 25
      ) r) AS top_regions_json,
      (SELECT COALESCE(json_agg(ci), '[]'::json) FROM (
        SELECT
          COALESCE(e.city, 'Unknown') AS city,
          COALESCE(e.region, '') AS region,
          COALESCE(e.country, 'Unknown') AS country,
          COALESCE(e.country_code, 'UN') AS country_code,
          COUNT(DISTINCT e.visitor_id)::text AS visitor_count,
          COUNT(DISTINCT CASE WHEN e.event_type = 'form_submit' OR (e.event_type = 'click' AND ${LEAD_CLICK_SQL}) THEN e.id END)::text AS inquiries_count
        FROM filtered_events e
        GROUP BY e.city, e.region, e.country, e.country_code
        ORDER BY COUNT(DISTINCT e.visitor_id) DESC
        LIMIT 35
      ) ci) AS top_cities_json,
      (SELECT COALESCE(json_agg(cl), '[]'::json) FROM (
        SELECT
          COALESCE(element_text, 'Unknown Button') AS element_text,
          COALESCE(element_target, '') AS element_target,
          COALESCE(element_tag, 'button') AS element_tag,
          page_path,
          COUNT(*)::text AS click_count
        FROM filtered_events
        WHERE event_type = 'click'
        GROUP BY element_text, element_target, element_tag, page_path
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) cl) AS top_clicks_json,
      (SELECT COALESCE(json_agg(pa), '[]'::json) FROM (
        SELECT
          COALESCE(
            NULLIF(e.metadata->>'placement', ''),
            NULLIF(e.metadata->>'trackLabel', ''),
            CASE WHEN e.event_type = 'form_submit' THEN COALESCE(NULLIF(e.element_text, ''), 'form_submit') ELSE 'untagged_cta' END
          ) AS placement,
          COUNT(*)::int AS total_clicks,
          COUNT(DISTINCT e.visitor_id)::int AS unique_visitors,
          COUNT(DISTINCT e.session_id)::int AS unique_sessions,
          COUNT(CASE WHEN e.element_target LIKE '%wa.me%' OR e.element_target ILIKE '%whatsapp%' OR e.element_text ILIKE '%whatsapp%' OR e.metadata->>'trackLabel' LIKE '%enquire%' OR e.element_text ILIKE '%enquire%' THEN 1 END)::int AS whatsapp_clicks,
          COUNT(CASE WHEN e.element_target LIKE 'tel:%' OR e.element_text ILIKE '%call%' THEN 1 END)::int AS phone_clicks,
          COUNT(CASE WHEN e.event_type = 'form_submit' THEN 1 END)::int AS form_submits,
          MAX(e.created_at)::text AS last_clicked_at
        FROM filtered_events e
        WHERE (e.event_type = 'click' AND (${LEAD_CLICK_SQL} OR e.metadata->>'placement' IS NOT NULL))
           OR e.event_type = 'form_submit'
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 30
      ) pa) AS placement_attribution_json,
      (SELECT COALESCE(json_agg(sq), '[]'::json) FROM (
        SELECT query_text, zero_results, cnt::text AS count
        FROM search_grouped
        ORDER BY cnt DESC
        LIMIT 50
      ) sq) AS search_queries_json,
      (SELECT json_build_object(
        'totalSearches', COUNT(*)::int,
        'zeroResultsSearches', (COUNT(*) FILTER (WHERE COALESCE((metadata->>'zeroResults')::boolean, false)))::int,
        'topSearchQuery', COALESCE((SELECT query_text FROM search_grouped ORDER BY cnt DESC LIMIT 1), 'None')
      ) FROM search_events) AS search_summary_json,
      (SELECT COALESCE(json_agg(sf), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'searchSurface', ''), 'unspecified') AS surface,
          COUNT(*)::int AS searches,
          COUNT(*) FILTER (WHERE COALESCE((metadata->>'zeroResults')::boolean, false))::int AS zero_results
        FROM search_events
        GROUP BY 1
        ORDER BY COUNT(*) DESC
      ) sf) AS search_surfaces_json,
      (SELECT json_build_object(
        'totalSelects', COUNT(*)::int,
        'keyboardSelects', (COUNT(*) FILTER (WHERE metadata->>'selectionMethod' = 'keyboard'))::int,
        'mouseSelects', (COUNT(*) FILTER (WHERE COALESCE(metadata->>'selectionMethod', 'mouse') = 'mouse'))::int
      ) FROM filtered_events WHERE event_type = 'click' AND metadata->>'action' IN ('search_modal_select_product', 'search_machine_hub_select')) AS search_selects_json,
      (SELECT COALESCE(json_agg(rb), '[]'::json) FROM (
        SELECT
          CASE
            WHEN (CASE WHEN LENGTH(metadata->>'resultRank') <= 6 THEN (metadata->>'resultRank')::int ELSE 999999 END) = 1 THEN 'Rank #1'
            WHEN (CASE WHEN LENGTH(metadata->>'resultRank') <= 6 THEN (metadata->>'resultRank')::int ELSE 999999 END) BETWEEN 2 AND 3 THEN 'Rank #2-3'
            WHEN (CASE WHEN LENGTH(metadata->>'resultRank') <= 6 THEN (metadata->>'resultRank')::int ELSE 999999 END) BETWEEN 4 AND 10 THEN 'Rank #4-10'
            ELSE 'Rank #11+'
          END AS rank_bucket,
          COUNT(*)::int AS selects
        FROM filtered_events
        WHERE event_type = 'click'
          AND metadata->>'action' = 'search_modal_select_product'
          AND (metadata->>'resultRank') ~ '^[0-9]+$'
        GROUP BY 1
        ORDER BY MIN(CASE WHEN LENGTH(metadata->>'resultRank') <= 6 THEN (metadata->>'resultRank')::int ELSE 999999 END) ASC
      ) rb) AS search_rank_buckets_json,
      (SELECT json_build_object(
        'zeroResultSessions', COUNT(*)::int,
        'recoveredSessions', (COUNT(*) FILTER (WHERE recovered = TRUE))::int,
        'zeroResultWhatsappClicks', (COUNT(*) FILTER (WHERE zero_whatsapp_clicked = TRUE))::int
      ) FROM zero_session_recovery) AS zero_recovery_json,
      (SELECT COALESCE(json_agg(cp), '[]'::json) FROM (
        SELECT
          (metadata->>'copiedText') AS copied_text,
          COALESCE(metadata->>'itemType', 'part_number') AS item_type,
          COUNT(*)::text AS count
        FROM filtered_events
        WHERE event_type = 'copy' AND (metadata->>'copiedText') IS NOT NULL
        GROUP BY copied_text, item_type
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) cp) AS top_copied_json,
      (SELECT COALESCE(json_agg(sa), '[]'::json) FROM (
        SELECT
          (metadata->>'sectionId') AS section_id,
          page_path,
          COUNT(*)::text AS views,
          ROUND(AVG(COALESCE((metadata->>'dwellSeconds')::numeric, 0)), 1)::text AS avg_dwell_seconds
        FROM filtered_events
        WHERE event_type = 'section_view' AND (metadata->>'sectionId') IS NOT NULL
        GROUP BY section_id, page_path
        ORDER BY COUNT(*) DESC
        LIMIT 16
      ) sa) AS section_attention_json,
      (SELECT COALESCE(json_agg(tp), '[]'::json) FROM (
        SELECT
          page_path,
          COALESCE(page_title, page_path) AS page_title,
          COUNT(*)::text AS views
        FROM filtered_events
        WHERE event_type = 'pageview'
        GROUP BY page_path, page_title
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) tp) AS top_pages_json,
      (SELECT COALESCE(json_agg(pd), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(RTRIM(LOWER(SPLIT_PART(e.page_path, '?', 1)), '/'), ''), '/') AS page_path,
          COALESCE(MAX(e.page_title), MAX(e.page_path)) AS page_title,
          COUNT(DISTINCT e.session_id)::text AS sessions,
          COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END)::text AS views,
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN e.event_type = 'section_view'
                   AND (e.metadata->>'dwellSeconds') ~ '^[0-9]+([.][0-9]+)?$'
                  THEN (e.metadata->>'dwellSeconds')::numeric
                END
              ),
              1
            ),
            0
          )::text AS avg_dwell_seconds
        FROM filtered_events e
        WHERE e.event_type IN ('pageview', 'section_view')
        GROUP BY 1
        ORDER BY COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END) DESC
        LIMIT 20
      ) pd) AS page_dwell_json,
      (SELECT COALESCE(json_agg(ff), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(e.element_text, ''), COALESCE(e.metadata->>'placement', 'Website Form')) AS form_name,
          COUNT(*) FILTER (WHERE e.event_type = 'form_start')::int AS starts,
          COUNT(*) FILTER (WHERE e.event_type = 'form_validation_error')::int AS validation_errors,
          COUNT(*) FILTER (WHERE e.event_type = 'form_abandon')::int AS abandons,
          COUNT(*) FILTER (WHERE e.event_type = 'form_submit_error')::int AS submit_errors,
          COUNT(*) FILTER (WHERE e.event_type = 'form_submit')::int AS submits
        FROM filtered_events e
        WHERE e.event_type IN ('form_start', 'form_validation_error', 'form_abandon', 'form_submit_error', 'form_submit')
        GROUP BY 1
        ORDER BY COUNT(*) FILTER (WHERE e.event_type = 'form_start') DESC, COUNT(*) FILTER (WHERE e.event_type = 'form_submit') DESC
      ) ff) AS form_funnel_json
    `
  );

  // Query 3/3: Competitor & Nuisance Surveillance Sessions
  const suspiciousDwellPromise = query<{
    session_id: string;
    visitor_id: string;
    duration_seconds: number;
    entry_page: string;
    exit_page: string;
    device_type: string;
    city: string;
    country: string;
    ip_address: string | null;
    identified_name?: string | null;
    identified_contact?: string | null;
    event_count: string;
    distinct_pages: string;
    clicks_count: string;
    copies_count: string;
    part_copies_count?: string;
    lead_actions: string;
    session_time: string;
  }>(
    `
    SELECT
      s.session_id,
      s.visitor_id,
      s.duration_seconds,
      s.entry_page,
      s.exit_page,
      s.device_type,
      COALESCE(s.city, 'Unknown') AS city,
      COALESCE(s.country, 'Unknown') AS country,
      v.ip_address,
      v.identified_name,
      v.identified_contact,
      COUNT(e.id) AS event_count,
      COUNT(DISTINCT e.page_path) AS distinct_pages,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS clicks_count,
      COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END) AS copies_count,
      COUNT(CASE WHEN e.event_type = 'copy' AND (e.metadata->>'itemType' = 'part_number' OR e.page_path LIKE '/products%') THEN 1 END) AS part_copies_count,
      COUNT(CASE WHEN (e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%')) OR e.event_type = 'form_submit' THEN 1 END) AS lead_actions,
      MAX(s.started_at) AS session_time
    FROM analytics_sessions s
    JOIN analytics_visitors v ON s.visitor_id = v.visitor_id
    LEFT JOIN analytics_events e ON s.session_id = e.session_id
    WHERE ${sessionTimeCond}
      AND (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))
    GROUP BY s.session_id, s.visitor_id, s.duration_seconds, s.entry_page, s.exit_page, s.device_type, s.city, s.country, v.ip_address, v.identified_name, v.identified_contact
    HAVING (s.duration_seconds >= 600 AND COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) = 0)
       OR (COUNT(DISTINCT e.page_path) >= 3 AND s.duration_seconds < 25)
       OR (COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END) >= 3)
       OR (s.duration_seconds >= 1200)
    ORDER BY session_time DESC
    LIMIT 25
    `
  );

  const [summaryRows, behaviorRows, suspiciousDwellRaw] = await Promise.all([
    summaryPromise,
    behaviorPromise,
    suspiciousDwellPromise,
  ]);

  const summary = summaryRows[0];
  const behavior = behaviorRows[0];
  const kpiRaw = summary?.kpis_json || {};
  const sessionRaw = summary?.session_agg_json || {};

  const kpis = {
    activeUsersNow: parseInt(String(summary?.active_users_now || '0'), 10),
    totalVisitors: parseInt(String(kpiRaw.total_visitors || '0'), 10),
    totalSessions: parseInt(String(kpiRaw.total_sessions || '0'), 10),
    totalPageviews: parseInt(String(kpiRaw.total_pageviews || '0'), 10),
    totalClicks: parseInt(String(kpiRaw.total_clicks || '0'), 10),
    avgDurationSeconds: parseInt(String(sessionRaw.avg_duration_seconds || '0'), 10),
    whatsappClicks: parseInt(String(kpiRaw.whatsapp_clicks || '0'), 10),
    phoneCalls: parseInt(String(kpiRaw.phone_calls || '0'), 10),
    formLeads: parseInt(String(kpiRaw.form_leads || '0'), 10),
    persistedFormSubmissions: parseInt(String(summary?.persisted_form_submissions || '0'), 10),
    rageClicks: parseInt(String(kpiRaw.rage_clicks || '0'), 10),
    deadClicks: parseInt(String(kpiRaw.dead_clicks || '0'), 10),
  };

  const dwellBuckets = {
    bounce_under_10s: String(sessionRaw.bounce_under_10s || '0'),
    skim_10_60s: String(sessionRaw.skim_10_60s || '0'),
    engaged_1_5m: String(sessionRaw.engaged_1_5m || '0'),
    deep_5_15m: String(sessionRaw.deep_5_15m || '0'),
    zombie_over_15m: String(sessionRaw.zombie_over_15m || '0'),
  };

  const searchQueries = behavior?.search_queries_json || [];
  const rawSearchSummary = behavior?.search_summary_json || {
    totalSearches: 0,
    zeroResultsSearches: 0,
    topSearchQuery: 'None',
  };
  const totalSearches = Number(rawSearchSummary.totalSearches) || 0;
  const zeroResultsSearches = Number(rawSearchSummary.zeroResultsSearches) || 0;
  const catalogGapRate =
    totalSearches > 0 ? Math.round((zeroResultsSearches / totalSearches) * 100) : 0;

  const searchSummary = {
    totalSearches,
    zeroResultsSearches,
    catalogGapRate,
    topSearchQuery: rawSearchSummary.topSearchQuery || searchQueries[0]?.query_text || 'None',
  };

  const rawSelects = behavior?.search_selects_json || {
    totalSelects: 0,
    keyboardSelects: 0,
    mouseSelects: 0,
  };
  const totalSelects = Number(rawSelects.totalSelects) || 0;
  const rawRankBuckets = behavior?.search_rank_buckets_json || [];
  const rawRecovery = behavior?.zero_recovery_json || {
    zeroResultSessions: 0,
    recoveredSessions: 0,
    zeroResultWhatsappClicks: 0,
  };
  const zeroResultSessions = Number(rawRecovery.zeroResultSessions) || 0;
  const recoveredSessions = Number(rawRecovery.recoveredSessions) || 0;

  const searchFunnelStats: SearchFunnelStats = {
    bySurface: (behavior?.search_surfaces_json || []).map((row) => ({
      surface: row.surface,
      searches: Number(row.searches) || 0,
      zero_results: Number(row.zero_results) || 0,
    })),
    totalSelects,
    keyboardSelects: Number(rawSelects.keyboardSelects) || 0,
    mouseSelects: Number(rawSelects.mouseSelects) || 0,
    rankBuckets: rawRankBuckets.map((row) => {
      const selects = Number(row.selects) || 0;
      return {
        rank_bucket: row.rank_bucket,
        selects,
        sharePct: totalSelects > 0 ? Math.round((selects / totalSelects) * 100) : 0,
      };
    }),
    zeroResultSessions,
    recoveredSessions,
    zeroResultWhatsappClicks: Number(rawRecovery.zeroResultWhatsappClicks) || 0,
    recoveryRate:
      zeroResultSessions > 0 ? Math.min(100, Math.round((recoveredSessions / zeroResultSessions) * 100)) : 0,
  };

  const formFunnelRows: FormFunnelRow[] = (behavior?.form_funnel_json || []).map((f) => {
    const starts = Number(f.starts) || 0;
    const submits = Number(f.submits) || 0;
    return {
      form_name: f.form_name,
      starts,
      validation_errors: Number(f.validation_errors) || 0,
      abandons: Number(f.abandons) || 0,
      submit_errors: Number(f.submit_errors) || 0,
      submits,
      completion_rate:
        starts > 0 ? Math.min(100, Math.round((submits / starts) * 100)) : submits > 0 ? 100 : 0,
    };
  });

  const formTotals = formFunnelRows.reduce(
    (acc, row) => {
      acc.starts += row.starts;
      acc.validation_errors += row.validation_errors;
      acc.abandons += row.abandons;
      acc.submit_errors += row.submit_errors;
      acc.submits += row.submits;
      return acc;
    },
    { starts: 0, validation_errors: 0, abandons: 0, submit_errors: 0, submits: 0 }
  );

  const formFunnelStats: FormFunnelStats = {
    forms: formFunnelRows,
    totals: {
      ...formTotals,
      completion_rate:
        formTotals.starts > 0
          ? Math.min(100, Math.round((formTotals.submits / formTotals.starts) * 100))
          : formTotals.submits > 0
          ? 100
          : 0,
    },
  };

  const flags = (summary?.flags_json || []) as FlagRecord[];
  const flagMap = new Map<string, FlagRecord>();
  flags.forEach((f) => {
    flagMap.set(f.target_value.toLowerCase(), f);
  });

  const exemptContacts = (process.env.EXEMPT_TEST_CONTACTS || '9830164610')
    .split(',')
    .map((v) => v.replace(/\D/g, ''))
    .filter(Boolean);
  const exemptNames = (process.env.EXEMPT_TEST_NAMES || 'bhuvan')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const suspiciousDwellSessions = suspiciousDwellRaw.map((s) => {
    const duration = Number(s.duration_seconds) || 0;
    const pages = Number(s.distinct_pages) || 0;
    const clicks = Number(s.clicks_count) || 0;
    const copies = Number(s.copies_count) || 0;
    const partCopies =
      s.part_copies_count !== undefined && s.part_copies_count !== null
        ? Number(s.part_copies_count)
        : copies;
    const leadActions = Number(s.lead_actions) || 0;
    const contactDigits = String(s.identified_contact || '').replace(/\D/g, '');
    const nameStr = String(s.identified_name || '').toLowerCase();
    const isBhuvanTest =
      exemptContacts.some((c) => contactDigits.includes(c)) ||
      exemptNames.some((n) => nameStr.includes(n));

    let heuristic: 'rapid_scraper' | 'lurker_zombie' | 'competitor_recon' | 'deep_evaluator' = 'lurker_zombie';
    if (isBhuvanTest) {
      heuristic = 'deep_evaluator';
    } else if (leadActions === 0 && (partCopies >= 3 || (partCopies >= 2 && pages >= 4 && duration >= 300) || (s.city?.toLowerCase().includes('krishnagiri') && partCopies >= 1))) {
      heuristic = 'competitor_recon';
    } else if (pages >= 3 && duration < 25) {
      heuristic = 'rapid_scraper';
    } else if (duration >= 600 && clicks <= 1) {
      heuristic = 'lurker_zombie';
    } else if (duration >= 1200) {
      heuristic = 'competitor_recon';
    } else {
      heuristic = 'deep_evaluator';
    }

    const matchedFlag =
      flagMap.get(s.visitor_id.toLowerCase()) ||
      (s.ip_address ? flagMap.get(s.ip_address.toLowerCase()) : undefined);

    return {
      ...s,
      heuristic,
      flag: matchedFlag
        ? {
            id: matchedFlag.id,
            flag_type: matchedFlag.flag_type,
            note: matchedFlag.note,
          }
        : undefined,
    };
  });

  return {
    kpis,
    topClicks: behavior?.top_clicks_json || [],
    placementAttribution: (behavior?.placement_attribution_json || []) as PlacementAttributionRow[],
    timeSeries: summary?.time_series_json || [],
    topCountries: behavior?.top_countries_json || [],
    topCities: behavior?.top_cities_json || [],
    topRegions: behavior?.top_regions_json || [],
    devices: summary?.devices_json || [],
    browsers: summary?.browsers_json || [],
    operatingSystems: summary?.os_json || [],
    topReferrers: summary?.referrers_json || [],
    utmCampaigns: summary?.utm_json || [],
    searchQueries,
    searchSummary,
    searchFunnelStats,
    topCopiedItems: behavior?.top_copied_json || [],
    sectionAttention: behavior?.section_attention_json || [],
    topPages: behavior?.top_pages_json || [],
    dwellBuckets,
    pageDwellStats: behavior?.page_dwell_json || [],
    formFunnelStats,
    suspiciousDwellSessions,
    flags,
  };
}

export async function getRecentEvents(options: {
  limit?: number;
  offset?: number;
  visitorId?: string;
  ipAddress?: string;
  correlateByIp?: boolean;
  eventType?: string;
  includeHeartbeat?: boolean;
  timeRange?: TimeRange;
}) {
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;
  const params: any[] = [];
  const whereClauses: string[] = [
    "e.page_path NOT LIKE '/admin%'",
    "(e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%')",
    "(v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))",
  ];

  // BUG-14: Exclude noisy 30s idle heartbeat pings from live feed by default
  if (!options.includeHeartbeat && options.eventType !== 'heartbeat') {
    whereClauses.push("e.event_type <> 'heartbeat'");
  }

  let targetIp = options.ipAddress;
  if (options.visitorId && options.correlateByIp && !targetIp) {
    try {
      const visRows = await query<{ ip_address: string | null }>(
        `SELECT ip_address FROM analytics_visitors WHERE visitor_id = $1 LIMIT 1`,
        [options.visitorId]
      );
      if (visRows.length > 0 && visRows[0]?.ip_address) {
        targetIp = visRows[0].ip_address;
      }
    } catch (e) {
      console.warn('[Analytics] Failed to lookup visitor IP for correlation:', e);
    }
  }

  if (options.visitorId && options.correlateByIp && targetIp) {
    params.push(options.visitorId);
    const p1 = `$${params.length}`;
    params.push(targetIp);
    const p2 = `$${params.length}`;
    whereClauses.push(`(e.visitor_id = ${p1} OR e.ip_address = ${p2} OR v.ip_address = ${p2})`);
  } else if (options.visitorId) {
    params.push(options.visitorId);
    whereClauses.push(`e.visitor_id = $${params.length}`);
  } else if (targetIp) {
    params.push(targetIp);
    whereClauses.push(`(e.ip_address = $${params.length} OR v.ip_address = $${params.length})`);
  }

  if (options.eventType) {
    params.push(options.eventType);
    whereClauses.push(`e.event_type = $${params.length}`);
  }

  if (options.timeRange && options.timeRange !== 'all') {
    whereClauses.push(getTimeCondition(options.timeRange, 'e.created_at'));
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const events = await query<any>(
    `
    SELECT
      e.id,
      e.visitor_id,
      e.session_id,
      e.event_type,
      e.page_path,
      e.page_title,
      e.element_text,
      e.element_target,
      e.element_tag,
      e.metadata,
      e.created_at,
      v.country,
      v.city,
      v.region,
      v.device_type,
      v.browser,
      v.os,
      v.identified_name,
      v.identified_contact,
      v.first_seen_at,
      v.last_seen_at,
      COALESCE(e.ip_address, v.ip_address) AS ip_address,
      (v.first_seen_at IS NOT NULL AND DATE(v.first_seen_at AT TIME ZONE 'Asia/Kolkata') < DATE(e.created_at AT TIME ZONE 'Asia/Kolkata')) AS is_return_day,
      EXISTS (
        SELECT 1 FROM analytics_restrictions r
        WHERE LOWER(r.value) = LOWER(e.visitor_id)
           OR (COALESCE(e.ip_address, v.ip_address) IS NOT NULL AND LOWER(r.value) = LOWER(COALESCE(e.ip_address, v.ip_address)))
      ) AS is_restricted
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    ${whereSql}
    ORDER BY e.created_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    params
  );

  return events;
}

/**
 * Fetches dedicated product-level events directly from PostgreSQL (`BUG-11`),
 * eliminating dependency on the 100-event Live Feed buffer.
 */
export async function getProductEvents(options: {
  slug: string;
  title?: string;
  partNumber?: string;
  timeRange?: TimeRange;
  limit?: number;
}) {
  const cleanSlug = (options.slug || '').trim().toLowerCase();
  if (!cleanSlug) return [];

  const limit = Math.min(options.limit || 100, 200);
  const params: any[] = [];
  const orMatchers: string[] = [];

  params.push(cleanSlug);
  orMatchers.push(`LOWER(COALESCE(e.metadata->>'productSlug', '')) = $${params.length}`);

  params.push(`%/${cleanSlug}`);
  orMatchers.push(`LOWER(RTRIM(SPLIT_PART(e.page_path, '?', 1), '/')) LIKE $${params.length}`);

  if (options.title && options.title.trim()) {
    params.push(options.title.trim().toLowerCase());
    orMatchers.push(`LOWER(TRIM(COALESCE(e.metadata->>'productTitle', ''))) = $${params.length}`);
  }

  const cleanPartTokens = (options.partNumber || '')
    .split(/[\/,\s]+/)
    .map((s) => s.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter((s) => s.length >= 4);

  if (cleanPartTokens.length > 0) {
    params.push(cleanPartTokens);
    orMatchers.push(
      `REGEXP_REPLACE(LOWER(COALESCE(e.metadata->>'partNumber', '')), '[^a-z0-9]', '', 'g') = ANY($${params.length}::text[])`
    );
  }

  const whereClauses: string[] = [
    BASE_ADMIN_EXCLUDE_SQL,
    "e.event_type <> 'heartbeat'",
    `(${orMatchers.join(' OR ')})`,
  ];

  if (options.timeRange && options.timeRange !== 'all') {
    whereClauses.push(getTimeCondition(options.timeRange, 'e.created_at'));
  }

  params.push(limit);
  const limitParam = `$${params.length}`;

  return query<any>(
    `
    SELECT
      e.id,
      e.visitor_id,
      e.session_id,
      e.event_type,
      e.page_path,
      e.page_title,
      e.element_text,
      e.element_target,
      e.element_tag,
      e.metadata,
      e.created_at,
      v.country,
      v.city,
      v.region,
      v.device_type,
      v.browser,
      v.os,
      v.identified_name,
      v.identified_contact,
      COALESCE(e.ip_address, v.ip_address) AS ip_address
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY e.created_at DESC
    LIMIT ${limitParam}
    `,
    params
  );
}

export async function getVisitorsList(limit = 100, offset = 0, timeRange?: TimeRange) {
  const visitorTimeFilter = timeRange && timeRange !== 'all' ? `AND ${getTimeCondition(timeRange, 'v.last_seen_at')}` : '';
  const eventTimeFilter = timeRange && timeRange !== 'all' ? `AND ${getTimeCondition(timeRange, 'e.created_at')}` : '';

  const visitors = await query<any>(
    `
    SELECT
      v.visitor_id,
      v.ip_address,
      v.first_seen_at,
      v.last_seen_at,
      v.total_sessions,
      v.country,
      v.country_code,
      v.region,
      v.city,
      v.device_type,
      v.browser,
      v.os,
      v.identified_name,
      v.identified_contact,
      EXISTS (
        SELECT 1 FROM analytics_restrictions r
        WHERE LOWER(r.value) = LOWER(v.visitor_id)
           OR (v.ip_address IS NOT NULL AND LOWER(r.value) = LOWER(v.ip_address))
           OR EXISTS (
             SELECT 1 FROM analytics_events e2
             WHERE e2.visitor_id = v.visitor_id
               AND e2.ip_address IS NOT NULL
               AND LOWER(r.value) = LOWER(e2.ip_address)
           )
      ) AS is_restricted,
      EXISTS (
        SELECT 1 FROM analytics_flags f
        WHERE f.target_value = v.visitor_id OR (v.ip_address IS NOT NULL AND f.target_value = v.ip_address)
      ) AS is_flagged,
      (
        SELECT f.flag_type FROM analytics_flags f
        WHERE f.target_value = v.visitor_id OR (v.ip_address IS NOT NULL AND f.target_value = v.ip_address)
        ORDER BY f.created_at DESC
        LIMIT 1
      ) AS flag_type,
      COUNT(e.id) AS total_events,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS total_clicks,
      COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END) AS total_copies,
      COUNT(CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_text ILIKE '%whatsapp%' OR e.element_target LIKE 'tel:%' OR e.element_text ILIKE '%call%') THEN 1 END) AS whatsapp_clicks,
      COUNT(DISTINCT DATE_TRUNC('day', e.created_at AT TIME ZONE 'Asia/Kolkata')) AS distinct_days_count,
      (
        SELECT e3.page_path FROM analytics_events e3
        WHERE e3.visitor_id = v.visitor_id AND e3.page_path NOT LIKE '/admin%'
        ORDER BY e3.created_at DESC
        LIMIT 1
      ) AS last_page_viewed,
      (
        SELECT e4.element_text FROM analytics_events e4
        WHERE e4.visitor_id = v.visitor_id AND (e4.element_target LIKE '%wa.me%' OR e4.element_text ILIKE '%whatsapp%')
        ORDER BY e4.created_at DESC
        LIMIT 1
      ) AS last_rfq_part
    FROM analytics_visitors v
    LEFT JOIN analytics_events e ON v.visitor_id = e.visitor_id AND e.page_path NOT LIKE '/admin%' ${eventTimeFilter}
    WHERE (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))
      ${visitorTimeFilter}
      AND EXISTS (
        SELECT 1 FROM analytics_events e2 WHERE e2.visitor_id = v.visitor_id AND e2.page_path NOT LIKE '/admin%'
      )
    GROUP BY v.visitor_id
    ORDER BY v.last_seen_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return visitors;
}

export interface ProductEnquiryStat {
  slug: string;
  title: string;
  category: string;
  part_number: string;
  brand: string;
  enquire_clicks: number;
  detail_enquiries: number;
  listing_enquiries: number;
  total_enquiries: number;
  views: number;
  view_sessions: number;
  detail_enquiry_sessions: number;
  conversion_rate: number;
  last_enquired_at: string | null;
  status: 'active' | 'zero_enquiries';
}

export async function getProductEnquiryPerformance(timeRange: TimeRange = 'all') {
  const timeCond = getTimeCondition(timeRange, 'e.created_at');
  const allProducts = getProducts();

  // 1. Fetch enquire clicks with session IDs and admin/bot exclusion (`BUG-05`)
  const clickPromise = query<{
    product_title: string;
    part_number: string;
    product_slug: string;
    page_path: string;
    session_ids: string[] | null;
    clicks: string;
    last_enquiry: string;
  }>(
    `
    SELECT
      COALESCE(e.metadata->>'productTitle', '') AS product_title,
      COALESCE(e.metadata->>'partNumber', '') AS part_number,
      COALESCE(e.metadata->>'productSlug', '') AS product_slug,
      COALESCE(NULLIF(RTRIM(LOWER(SPLIT_PART(e.page_path, '?', 1)), '/'), ''), '/') AS page_path,
      ARRAY_AGG(DISTINCT e.session_id) FILTER (WHERE e.session_id IS NOT NULL AND e.session_id <> '') AS session_ids,
      COUNT(*) AS clicks,
      MAX(e.created_at) AS last_enquiry
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE (
        (e.event_type = 'click' AND (
          e.element_target LIKE '%wa.me%'
          OR e.element_text ILIKE '%whatsapp%'
          OR e.element_target LIKE 'tel:%'
          OR e.element_text ILIKE '%call%'
          OR e.metadata->>'trackLabel' LIKE '%enquire%'
          OR e.element_text ILIKE '%enquire%'
          OR e.element_text ILIKE '%quote%'
        ))
        OR (e.event_type = 'form_submit')
      )
      AND ${BASE_ADMIN_EXCLUDE_SQL}
      AND ${timeCond}
    GROUP BY 1, 2, 3, 4
    `
  );

  // 2. Fetch product detail views + unique viewing sessions with admin/bot exclusion
  const viewPromise = query<{ page_path: string; views: string; view_sessions: string }>(
    `
    SELECT
      COALESCE(NULLIF(RTRIM(LOWER(SPLIT_PART(e.page_path, '?', 1)), '/'), ''), '/') AS page_path,
      COUNT(*) AS views,
      COUNT(DISTINCT e.session_id) AS view_sessions
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'pageview'
      AND LOWER(SPLIT_PART(e.page_path, '?', 1)) LIKE '/products/%/%'
      AND ${BASE_ADMIN_EXCLUDE_SQL}
      AND ${timeCond}
    GROUP BY 1
    `
  );

  const [clickRows, viewRows] = await Promise.all([clickPromise, viewPromise]);

  const viewsMap = new Map<string, number>();
  const viewSessionsMap = new Map<string, number>();
  viewRows.forEach((row) => {
    const normPath = (row.page_path || '').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/';
    viewsMap.set(normPath, (viewsMap.get(normPath) || 0) + parseInt(row.views || '0', 10));
    viewSessionsMap.set(
      normPath,
      (viewSessionsMap.get(normPath) || 0) + parseInt(row.view_sessions || '0', 10)
    );
  });

  // 3. Map all catalog products against analytics records
  const result: ProductEnquiryStat[] = allProducts.map((p) => {
    const canonicalSlug = getProductUrlSlug(p).toLowerCase();
    const catSlug = (
      p.category === 'Motor Grader' || p.category === 'Grader' ? 'grader' : p.category.toLowerCase()
    ).trim();
    const productPath = `/products/${catSlug}/${canonicalSlug}`.toLowerCase();
    const views = viewsMap.get(productPath) || 0;
    const viewSessions = viewSessionsMap.get(productPath) || 0;

    const pTitle = p.title.toLowerCase().trim();
    const pPartClean = (p.part_number || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const pPartsList = (p.part_number || '')
      .split(/[\/,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isDetailPagePath = (cPath: string): boolean => {
      if (!cPath) return false;
      return (
        cPath === productPath ||
        cPath === `/products/${canonicalSlug}` ||
        cPath.endsWith(`/${canonicalSlug}`)
      );
    };

    const matchedClicks = clickRows.filter((c) => {
      const cSlug = (c.product_slug || '').toLowerCase().trim();
      const cTitle = (c.product_title || '').toLowerCase().trim();
      const cPart = (c.part_number || '').toLowerCase().trim();
      const cPath = (c.page_path || '').split('?')[0].replace(/\/+$/, '').toLowerCase().trim();

      if (cSlug && (cSlug === canonicalSlug || cSlug === p.slug.toLowerCase())) {
        return true;
      }

      if (isDetailPagePath(cPath)) {
        return true;
      }

      if (cTitle && cTitle === pTitle) {
        return true;
      }

      if (cPart && p.part_number) {
        if (pPartsList.includes(cPart)) return true;
        const cleanCPart = cPart.replace(/[^a-z0-9]/gi, '');
        if (cleanCPart.length >= 4 && pPartClean.length >= 4) {
          for (const pp of pPartsList) {
            const cleanPP = pp.replace(/[^a-z0-9]/gi, '');
            if (cleanPP.length >= 4 && cleanPP === cleanCPart) return true;
          }
        }
      }

      return false;
    });

    let detailEnquiries = 0;
    let listingEnquiries = 0;
    const detailSessionSet = new Set<string>();

    for (const c of matchedClicks) {
      const cCount = parseInt(c.clicks, 10) || 0;
      const cPath = (c.page_path || '').split('?')[0].replace(/\/+$/, '').toLowerCase().trim();
      if (isDetailPagePath(cPath)) {
        detailEnquiries += cCount;
        if (Array.isArray(c.session_ids)) {
          for (const sid of c.session_ids) {
            if (sid) detailSessionSet.add(sid);
          }
        }
      } else {
        listingEnquiries += cCount;
      }
    }

    const totalEnquiries = detailEnquiries + listingEnquiries;
    const detailEnquirySessions = detailSessionSet.size;
    const sortedEnquiries = matchedClicks.map((c) => c.last_enquiry).filter(Boolean).sort().reverse();
    const lastEnquiry = sortedEnquiries[0] || null;

    // BUG-05: Strict unique-session detail conversion capped at 100%; listing-grid clicks do not inflate detail conversion
    let conversion = 0;
    if (viewSessions > 0) {
      conversion = Math.min(100, Math.round((detailEnquirySessions / viewSessions) * 100));
    } else if (views > 0) {
      conversion = Math.min(100, Math.round((detailEnquiries / views) * 100));
    }

    return {
      slug: canonicalSlug,
      title: p.title,
      category: p.category,
      part_number: p.part_number || '',
      brand: Array.isArray(p.brand) ? p.brand.join(', ') : p.brand || '',
      enquire_clicks: totalEnquiries,
      detail_enquiries: detailEnquiries,
      listing_enquiries: listingEnquiries,
      total_enquiries: totalEnquiries,
      views,
      view_sessions: viewSessions,
      detail_enquiry_sessions: detailEnquirySessions,
      conversion_rate: conversion,
      last_enquired_at: lastEnquiry,
      status: totalEnquiries > 0 ? 'active' : 'zero_enquiries',
    };
  });

  // Sort by total enquiries DESC, then views DESC
  result.sort((a, b) => b.enquire_clicks - a.enquire_clicks || b.views - a.views);

  const productsWithEnquiries = result.filter((p) => p.enquire_clicks > 0);
  const productsZeroEnquiries = result.filter((p) => p.enquire_clicks === 0);
  const highDemandCount = result.filter((p) => p.enquire_clicks >= 2).length;
  const opportunityCount = result.filter((p) => p.views > 0 && p.enquire_clicks === 0).length;
  const totalEnquireClicks = result.reduce((sum, p) => sum + p.enquire_clicks, 0);
  const totalDetailEnquiries = result.reduce((sum, p) => sum + p.detail_enquiries, 0);
  const totalListingEnquiries = result.reduce((sum, p) => sum + p.listing_enquiries, 0);
  const totalViews = result.reduce((sum, p) => sum + p.views, 0);

  return {
    summary: {
      totalCatalogProducts: allProducts.length,
      withEnquiriesCount: productsWithEnquiries.length,
      zeroEnquiriesCount: productsZeroEnquiries.length,
      highDemandCount,
      opportunityCount,
      totalEnquireClicks,
      totalDetailEnquiries,
      totalListingEnquiries,
      totalViews,
    },
    products: result,
  };
}
