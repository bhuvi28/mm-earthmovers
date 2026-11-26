import { getProducts, getProductsCacheStats } from '@/lib/products';
import { MACHINE_MODELS } from '@/lib/machines';
import { getProductUrlSlug } from '@/lib/utils';
import { getDbPool, query, FlagRecord } from './db';
import { recordOpsMetric } from './ops';

export type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '1y' | 'all';

const VALID_TIME_RANGES = new Set<TimeRange>(['today', 'yesterday', '7d', '30d', '90d', '1y', 'all']);

export function normalizeTimeRange(range?: string | null): TimeRange {
  if (range && VALID_TIME_RANGES.has(range as TimeRange)) {
    return range as TimeRange;
  }
  return 'today';
}

/**
 * Records db_query operational telemetry into the active AsyncLocalStorage request buffer
 * (safe zero-query no-op outside HTTP request context so standalone unit tests keep exact query counts).
 */
async function timedDbQuery<T = any>(
  targetName: string,
  text: string,
  params: any[] = []
): Promise<T[]> {
  const startMs = Date.now();
  try {
    const rows = await query<T>(text, params);
    recordOpsMetric({
      metricKind: 'db_query',
      targetName,
      outcome: 'ok',
      durationMs: Date.now() - startMs,
      batchSize: rows.length || 1,
    });
    return rows;
  } catch (err: any) {
    recordOpsMetric({
      metricKind: 'db_query',
      targetName,
      outcome: 'error',
      durationMs: Date.now() - startMs,
      errorCode: err?.code ? String(err.code).slice(0, 64) : 'db_error',
    });
    throw err;
  }
}

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

export interface ProductEngagementStats {
  zoomOpens: number;
  zoomCloses: number;
  avgZoomDurationMs: number;
  specToggles: number;
  modelHubNavClicks: number;
  relatedClicks: number;
  relatedAssistedEnquiries: number;
  relatedAssistRate: number;
  topZoomedProducts: Array<{
    productSlug: string;
    productTitle: string;
    opens: number;
    avgDurationMs: number;
  }>;
  topRelatedTransitions: Array<{
    sourceProductSlug: string;
    targetProductSlug: string;
    targetTitle: string;
    clicks: number;
    assistedEnquiries: number;
  }>;
}

export interface ExportFunnelStats {
  bannerViews: number;
  whatsappClicks: number;
  conversionRate: number;
  topCountries: Array<{
    country: string;
    countryCode: string;
    bannerViews: number;
    whatsappClicks: number;
    conversionRate: number;
  }>;
  geoDiscrepancies: Array<{
    serverCountryCode: string;
    clientCountryCode: string;
    sessions: number;
  }>;
}

export interface ModelHubRow {
  machineSlug: string;
  views: number;
  uniqueSessions: number;
  downstreamPartViews: number;
  downstreamEnquiries: number;
  partConversionRate: number;
}

export interface ModelHubStats {
  totalModelViews: number;
  faqToggles: number;
  siblingClicks: number;
  hubs: ModelHubRow[];
  topFaqQuestions: Array<{
    machineSlug: string;
    question: string;
    opens: number;
  }>;
  topSiblingTransitions: Array<{
    sourceMachineSlug: string;
    targetMachineSlug: string;
    targetMachineName: string;
    clicks: number;
  }>;
}

export interface CohortRetentionStats {
  newVisitors: number;
  returningVisitors: number;
  avgSessionsPerVisitor: number;
  repeat7dRate: number;
  cohorts: Array<{
    bucket: '1' | '2' | '3+';
    label: string;
    visitors: number;
    sharePct: number;
    rfqVisitors: number;
    rfqRate: number;
  }>;
  returnDayLift: {
    day1Visitors: number;
    day1Converters: number;
    day1Rate: number;
    returnDayVisitors: number;
    returnDayConverters: number;
    returnDayRate: number;
  };
  firstTouchAttribution: Array<{
    source: string;
    visitors: number;
    converters: number;
    conversionRate: number;
  }>;
}

export interface CatalogHealthGapProduct {
  slug: string;
  title: string;
  category: string;
  part_number: string;
  impressions: number;
  clicks: number;
  views: number;
  enquire_clicks: number;
}

export interface CatalogHealthGaps {
  missingPhotoSkuCount: number;
  missingPhotoImpressions: number;
  missingPhotoClicks: number;
  excavatorViews: number;
  excavatorSearches: number;
  excavatorBannerClicks: number;
  topGapProducts: CatalogHealthGapProduct[];
}

export interface VisitorsListOptions {
  limit?: number;
  offset?: number;
  timeRange?: TimeRange;
  search?: string;
  segment?: 'all' | 'leads' | 'rfq' | 'repeat' | 'flagged' | 'restricted';
  device?: 'all' | 'mobile' | 'desktop';
}

export interface VisitorsListSummaryCounts {
  total: number;
  leads: number;
  rfq: number;
  repeat: number;
  flagged: number;
  restricted: number;
}

export interface VisitorsListResult {
  visitors: any[];
  totalCount: number;
  summaryCounts: VisitorsListSummaryCounts;
}

export interface OpsHealthStats {
  ingestStats: {
    totalBatches: number;
    okBatches: number;
    rejectedBatches: number;
    errorBatches: number;
    totalEventsIngested: number;
    successRate: number;
    errorRate: number;
    p95DurationMs: number;
    byErrorCode: Array<{ errorCode: string; count: number }>;
  };
  apiSla: Array<{
    route: string;
    requests: number;
    okCount: number;
    rejectedCount: number;
    errorCount: number;
    error5xxRate: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
  }>;
  dbPoolAndCache: {
    pool: { max: number; totalCount: number; idleCount: number; waitingCount: number };
    memoryCatalogCache: { hits: number; misses: number; cachedCount: number };
    dbQueries: Array<{ targetName: string; count: number; errorCount: number; p50Ms: number; p95Ms: number; maxMs: number }>;
    catalogCache: { hits: number; misses: number; hitRate: number; avgDurationMs: number };
  };
  externalSlas: Array<{
    targetName: string;
    calls: number;
    okCount: number;
    timeoutCount: number;
    errorCount: number;
    successRate: number;
    p50Ms: number;
    p95Ms: number;
    lastErrorCode: string | null;
  }>;
  alertDeliveries: {
    total: number;
    sent: number;
    failed: number;
    deduplicated: number;
    byChannel: Array<{ channel: string; sent: number; failed: number; deduplicated: number; avgLatencyMs: number }>;
    recent: Array<{
      id: number;
      dedupe_key: string;
      visitor_id: string | null;
      heuristic_name: string | null;
      channel: string;
      outcome: string;
      http_status: number | null;
      latency_ms: number | null;
      error_message: string | null;
      created_at: string;
    }>;
  };
  notFoundPaths: Array<{
    path: string;
    hits: number;
    uniqueVisitors: number;
    lastSeenAt: string;
    sampleReferrer: string | null;
    inferredPartNumber: string | null;
  }>;
  loadingScreen: {
    samples: number;
    p50WaitMs: number;
    p95WaitMs: number;
    avgWaitMs: number;
    fallback12sCount: number;
    fallback12sRate: number;
    bouncedBeforeDismissCount: number;
    bounceRate: number;
  };
  clientErrors: {
    totalErrors: number;
    uniqueVisitors: number;
    topErrors: Array<{
      kind: string;
      message: string;
      source: string;
      count: number;
      uniqueVisitors: number;
      lastSeenAt: string;
    }>;
  };
  middlewareBlocks: {
    totalBlocks: number;
    redirect307Count: number;
    json200Count: number;
    byTarget: Array<{ targetName: string; statusCode: number | null; blocks: number; lastBlockedAt: string }>;
  };
}

export interface AuditLogRecord {
  id: number;
  actor_ip: string | null;
  actor_label: string;
  action: string;
  target_type: string | null;
  target_value: string | null;
  success: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetches complete executive & behavioral analytics via 3 CTE-consolidated SQL queries
 * to stay comfortably within the `max: 4` serverless pool budget (`OBS-03`).
 */
export async function getDashboardStats(timeRange: TimeRange = 'today') {
  const safeRange = normalizeTimeRange(timeRange);
  const eventTimeCond = `(${getTimeCondition(safeRange, 'e.created_at')}) AND ${BASE_ADMIN_EXCLUDE_SQL}`;
  const sessionTimeCond = `(${getTimeCondition(safeRange, 's.started_at')}) AND (s.entry_page IS NULL OR s.entry_page NOT LIKE '/admin%')`;
  const leadTimeCond = getTimeCondition(safeRange, 'created_at');

  const isSingleDay = safeRange === 'today' || safeRange === 'yesterday';
  const isMonthly = safeRange === '1y' || safeRange === 'all';
  const dateFormat = isSingleDay ? 'HH24:00' : isMonthly ? 'YYYY-MM' : 'YYYY-MM-DD';

  // Query 1/3: KPIs, Dwell Buckets, Backup Form Count, Time Series, Tech & Referrers, Flags, Cohort Retention
  const summaryPromise = timedDbQuery<{
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
    cohort_summary_json: {
      totalVisitors: number;
      newVisitors: number;
      returningVisitors: number;
      avgSessionsPerVisitor: number;
      repeat7dVisitors: number;
      day1Visitors: number;
      day1Converters: number;
      returnDayVisitors: number;
      returnDayConverters: number;
    } | null;
    cohort_buckets_json: Array<{ bucket: '1' | '2' | '3+'; visitors: number; rfq_visitors: number }>;
    first_touch_json: Array<{ source: string; visitors: number; converters: number }>;
  }>(
    'stats_dashboard_summary',
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
        v.os,
        v.first_seen_at,
        v.last_seen_at,
        v.total_sessions
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
    ),
    period_visitors AS (
      SELECT
        e.visitor_id,
        GREATEST(1, COALESCE(MAX(e.total_sessions), 1))::int AS total_sessions,
        MIN(e.first_seen_at) AS first_seen_at,
        MAX(e.last_seen_at) AS last_seen_at,
        BOOL_OR((e.event_type = 'click' AND ${LEAD_CLICK_SQL}) OR e.event_type = 'form_submit') AS has_rfq,
        BOOL_OR(
          e.first_seen_at IS NOT NULL
          AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata') = DATE(e.first_seen_at AT TIME ZONE 'Asia/Kolkata')
        ) AS active_day1,
        BOOL_OR(
          e.first_seen_at IS NOT NULL
          AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata') = DATE(e.first_seen_at AT TIME ZONE 'Asia/Kolkata')
          AND ((e.event_type = 'click' AND ${LEAD_CLICK_SQL}) OR e.event_type = 'form_submit')
        ) AS converted_day1,
        BOOL_OR(
          e.first_seen_at IS NOT NULL
          AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata') > DATE(e.first_seen_at AT TIME ZONE 'Asia/Kolkata')
        ) AS active_return_day,
        BOOL_OR(
          e.first_seen_at IS NOT NULL
          AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata') > DATE(e.first_seen_at AT TIME ZONE 'Asia/Kolkata')
          AND ((e.event_type = 'click' AND ${LEAD_CLICK_SQL}) OR e.event_type = 'form_submit')
        ) AS converted_return_day
      FROM filtered_events e
      GROUP BY e.visitor_id
    ),
    visitor_first_touch AS (
      SELECT DISTINCT ON (s.visitor_id)
        s.visitor_id,
        COALESCE(NULLIF(s.utm_source, ''), NULLIF(s.referrer, ''), 'Direct / None') AS first_source
      FROM analytics_sessions s
      JOIN period_visitors pv ON pv.visitor_id = s.visitor_id
      ORDER BY s.visitor_id, s.started_at ASC
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
      (SELECT COALESCE(json_agg(f ORDER BY f.created_at DESC), '[]'::json) FROM analytics_flags f) AS flags_json,
      (SELECT json_build_object(
        'totalVisitors', COUNT(*)::int,
        'newVisitors', (COUNT(*) FILTER (WHERE total_sessions <= 1))::int,
        'returningVisitors', (COUNT(*) FILTER (WHERE total_sessions >= 2))::int,
        'avgSessionsPerVisitor', COALESCE(ROUND(AVG(total_sessions), 2), 0),
        'repeat7dVisitors', (COUNT(*) FILTER (WHERE total_sessions >= 2 AND first_seen_at IS NOT NULL AND last_seen_at IS NOT NULL AND last_seen_at >= first_seen_at AND last_seen_at <= first_seen_at + INTERVAL '7 days'))::int,
        'day1Visitors', (COUNT(*) FILTER (WHERE active_day1))::int,
        'day1Converters', (COUNT(*) FILTER (WHERE converted_day1))::int,
        'returnDayVisitors', (COUNT(*) FILTER (WHERE active_return_day))::int,
        'returnDayConverters', (COUNT(*) FILTER (WHERE converted_return_day))::int
      ) FROM period_visitors) AS cohort_summary_json,
      (SELECT COALESCE(json_agg(cb), '[]'::json) FROM (
        SELECT
          CASE
            WHEN total_sessions <= 1 THEN '1'
            WHEN total_sessions = 2 THEN '2'
            ELSE '3+'
          END AS bucket,
          COUNT(*)::int AS visitors,
          (COUNT(*) FILTER (WHERE has_rfq))::int AS rfq_visitors
        FROM period_visitors
        GROUP BY 1
      ) cb) AS cohort_buckets_json,
      (SELECT COALESCE(json_agg(ft), '[]'::json) FROM (
        SELECT
          COALESCE(vft.first_source, 'Direct / None') AS source,
          COUNT(*)::int AS visitors,
          (COUNT(*) FILTER (WHERE pv.has_rfq))::int AS converters
        FROM period_visitors pv
        LEFT JOIN visitor_first_touch vft ON vft.visitor_id = pv.visitor_id
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) ft) AS first_touch_json
    `
  );

  // Query 2/3: Geo, Placement Attribution, Search Funnels, Copies, Pages, Form Funnel, Product Engagement, Export Funnel, Model Hubs
  const behaviorPromise = timedDbQuery<{
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
    product_engagement_json: {
      zoomOpens: number;
      zoomCloses: number;
      avgZoomDurationMs: number;
      specToggles: number;
      modelHubNavClicks: number;
      relatedClicks: number;
    } | null;
    related_assisted_count: number;
    top_zoomed_products_json: Array<{
      productSlug: string;
      productTitle: string;
      opens: number;
      avgDurationMs: number;
    }>;
    top_related_transitions_json: Array<{
      sourceProductSlug: string;
      targetProductSlug: string;
      targetTitle: string;
      clicks: number;
      assistedEnquiries: number;
    }>;
    export_summary_json: { bannerViews: number; whatsappClicks: number } | null;
    export_countries_json: Array<{
      country: string;
      countryCode: string;
      bannerViews: number;
      whatsappClicks: number;
    }>;
    export_geo_discrepancy_json: Array<{
      serverCountryCode: string;
      clientCountryCode: string;
      sessions: number;
    }>;
    model_hub_summary_json: {
      totalModelViews: number;
      faqToggles: number;
      siblingClicks: number;
    } | null;
    model_hubs_json: Array<{
      machineSlug: string;
      views: number;
      uniqueSessions: number;
      downstreamPartViews: number;
      downstreamEnquiries: number;
    }>;
    top_model_faqs_json: Array<{
      machineSlug: string;
      question: string;
      opens: number;
    }>;
    top_sibling_transitions_json: Array<{
      sourceMachineSlug: string;
      targetMachineSlug: string;
      targetMachineName: string;
      clicks: number;
    }>;
  }>(
    'stats_dashboard_behavior',
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
        (LOWER(COALESCE(metadata->>'zeroResults', '')) = 'true') AS zero_results,
        COUNT(*) AS cnt
      FROM search_events
      GROUP BY 1, 2
    ),
    zero_sessions AS (
      SELECT DISTINCT session_id
      FROM search_events
      WHERE LOWER(COALESCE(metadata->>'zeroResults', '')) = 'true'
        AND session_id IS NOT NULL
        AND session_id <> ''
    ),
    zero_session_recovery AS (
      SELECT
        z.session_id,
        BOOL_OR(
          (e.event_type = 'search' AND LOWER(COALESCE(e.metadata->>'zeroResults', '')) <> 'true')
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
    ),
    related_clicks AS (
      SELECT
        e.id,
        e.session_id,
        e.created_at,
        COALESCE(NULLIF(e.metadata->>'sourceProductSlug', ''), NULLIF(SPLIT_PART(LOWER(RTRIM(SPLIT_PART(e.page_path, '?', 1), '/')), '/', 4), ''), 'unknown') AS source_slug,
        COALESCE(NULLIF(e.metadata->>'targetProductSlug', ''), '') AS target_slug,
        COALESCE(NULLIF(e.metadata->>'targetTitle', ''), NULLIF(e.element_text, ''), NULLIF(e.metadata->>'targetProductSlug', ''), 'Unknown Product') AS target_title
      FROM filtered_events e
      WHERE e.event_type = 'related_product_click'
    ),
    related_assisted AS (
      SELECT
        r.id,
        r.source_slug,
        r.target_slug,
        r.target_title,
        EXISTS (
          SELECT 1
          FROM filtered_events e
          WHERE e.session_id = r.session_id
            AND r.session_id IS NOT NULL
            AND r.session_id <> ''
            AND e.created_at >= r.created_at
            AND ((e.event_type = 'click' AND ${LEAD_CLICK_SQL}) OR e.event_type = 'form_submit')
            AND r.target_slug <> ''
            AND (
              LOWER(COALESCE(e.metadata->>'productSlug', '')) = LOWER(r.target_slug)
              OR LOWER(RTRIM(SPLIT_PART(e.page_path, '?', 1), '/')) LIKE '%/' || LOWER(r.target_slug)
            )
        ) AS assisted_enquiry
      FROM related_clicks r
    ),
    export_views AS (
      SELECT
        COALESCE(NULLIF(UPPER(metadata->>'countryCode'), ''), NULLIF(UPPER(country_code), ''), 'UN') AS client_country_code,
        COALESCE(NULLIF(metadata->>'country', ''), NULLIF(country, ''), 'Unknown') AS client_country,
        COALESCE(NULLIF(UPPER(country_code), ''), 'UN') AS server_country_code,
        session_id
      FROM filtered_events
      WHERE event_type = 'export_banner_view'
    ),
    export_clicks AS (
      SELECT
        COALESCE(NULLIF(UPPER(metadata->>'countryCode'), ''), NULLIF(UPPER(country_code), ''), 'UN') AS country_code,
        COALESCE(NULLIF(metadata->>'country', ''), NULLIF(country, ''), 'Unknown') AS country
      FROM filtered_events
      WHERE event_type = 'click'
        AND (
          metadata->>'placement' IN ('export_banner', 'export_banner_wa')
          OR metadata->>'trackLabel' IN ('export_whatsapp_quote', 'export_banner_wa')
        )
    ),
    export_v_by_cc AS (
      SELECT
        client_country_code AS country_code,
        MAX(client_country) AS country,
        COUNT(*)::int AS banner_views
      FROM export_views
      GROUP BY 1
    ),
    export_c_by_cc AS (
      SELECT
        country_code,
        MAX(country) AS country,
        COUNT(*)::int AS whatsapp_clicks
      FROM export_clicks
      GROUP BY 1
    ),
    model_views AS (
      SELECT
        CASE SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 3)
          WHEN 'hm-2021d' THEN 'hm-2021'
          WHEN 'hm-2021b' THEN 'hm-2021'
          WHEN 'hm-2021e' THEN 'hm-2021'
          WHEN 'beml-bg511' THEN 'beml-bg605'
          WHEN 'xcmg' THEN 'xcmg-sdlg'
          WHEN 'sdlg' THEN 'xcmg-sdlg'
          WHEN 'sldg' THEN 'xcmg-sdlg'
          ELSE SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 3)
        END AS machine_slug,
        session_id,
        created_at
      FROM filtered_events
      WHERE event_type = 'pageview'
        AND LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')) LIKE '/models/%'
        AND SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 3) <> ''
    ),
    model_sessions AS (
      SELECT
        session_id,
        machine_slug,
        MIN(created_at) AS first_view_at
      FROM model_views
      WHERE session_id IS NOT NULL AND session_id <> ''
      GROUP BY 1, 2
    ),
    model_downstream AS (
      SELECT
        m.machine_slug,
        COUNT(DISTINCT CASE WHEN e.event_type = 'pageview' AND LOWER(SPLIT_PART(e.page_path, '?', 1)) LIKE '/products/%/%' THEN e.id END)::int AS downstream_part_views,
        COUNT(DISTINCT CASE WHEN (e.event_type = 'click' AND ${LEAD_CLICK_SQL}) OR e.event_type = 'form_submit' THEN e.id END)::int AS downstream_enquiries
      FROM model_sessions m
      LEFT JOIN filtered_events e
        ON e.session_id = m.session_id
       AND e.created_at >= m.first_view_at
      GROUP BY m.machine_slug
    ),
    model_view_agg AS (
      SELECT
        machine_slug,
        COUNT(*)::int AS views,
        COUNT(DISTINCT NULLIF(session_id, ''))::int AS unique_sessions
      FROM model_views
      GROUP BY machine_slug
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
        'zeroResultsSearches', (COUNT(*) FILTER (WHERE LOWER(COALESCE(metadata->>'zeroResults', '')) = 'true'))::int,
        'topSearchQuery', COALESCE((SELECT query_text FROM search_grouped ORDER BY cnt DESC LIMIT 1), 'None')
      ) FROM search_events) AS search_summary_json,
      (SELECT COALESCE(json_agg(sf), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'searchSurface', ''), 'unspecified') AS surface,
          COUNT(*)::int AS searches,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(metadata->>'zeroResults', '')) = 'true')::int AS zero_results
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
            WHEN (CASE WHEN (metadata->>'resultRank') ~ '^[0-9]{1,6}$' THEN (metadata->>'resultRank')::int ELSE 999999 END) = 1 THEN 'Rank #1'
            WHEN (CASE WHEN (metadata->>'resultRank') ~ '^[0-9]{1,6}$' THEN (metadata->>'resultRank')::int ELSE 999999 END) BETWEEN 2 AND 3 THEN 'Rank #2-3'
            WHEN (CASE WHEN (metadata->>'resultRank') ~ '^[0-9]{1,6}$' THEN (metadata->>'resultRank')::int ELSE 999999 END) BETWEEN 4 AND 10 THEN 'Rank #4-10'
            ELSE 'Rank #11+'
          END AS rank_bucket,
          COUNT(*)::int AS selects
        FROM filtered_events
        WHERE event_type = 'click'
          AND metadata->>'action' = 'search_modal_select_product'
          AND (metadata->>'resultRank') ~ '^[0-9]+$'
        GROUP BY 1
        ORDER BY MIN(CASE WHEN (metadata->>'resultRank') ~ '^[0-9]{1,6}$' THEN (metadata->>'resultRank')::int ELSE 999999 END) ASC
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
          ROUND(COALESCE(AVG(
            CASE
              WHEN (metadata->>'dwellSeconds') ~ '^[0-9]+([.][0-9]+)?$'
              THEN CASE
                WHEN LENGTH(SPLIT_PART(metadata->>'dwellSeconds', '.', 1)) <= 9
                THEN LEAST(LEFT(metadata->>'dwellSeconds', 16)::numeric, 86400)
                ELSE 86400
              END
              ELSE 0
            END
          ), 0), 1)::text AS avg_dwell_seconds
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
                  THEN CASE
                    WHEN LENGTH(SPLIT_PART(e.metadata->>'dwellSeconds', '.', 1)) <= 9
                    THEN LEAST(LEFT(e.metadata->>'dwellSeconds', 16)::numeric, 86400)
                    ELSE 86400
                  END
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
      ) ff) AS form_funnel_json,
      (SELECT json_build_object(
        'zoomOpens', (COUNT(*) FILTER (WHERE event_type = 'image_zoom' AND metadata->>'action' = 'open'))::int,
        'zoomCloses', (COUNT(*) FILTER (WHERE event_type = 'image_zoom' AND metadata->>'action' = 'close'))::int,
        'avgZoomDurationMs', COALESCE(ROUND(AVG(
          CASE
            WHEN event_type = 'image_zoom'
             AND metadata->>'action' = 'close'
             AND (metadata->>'durationMs') ~ '^[0-9]+([.][0-9]+)?$'
            THEN CASE
              WHEN LENGTH(SPLIT_PART(metadata->>'durationMs', '.', 1)) <= 9
              THEN LEAST(LEFT(metadata->>'durationMs', 16)::numeric, 86400000)
              ELSE 86400000
            END
          END
        )), 0)::int,
        'specToggles', (COUNT(*) FILTER (WHERE event_type = 'spec_toggle' AND LOWER(COALESCE(metadata->>'open', '')) = 'true'))::int,
        'modelHubNavClicks', (COUNT(*) FILTER (WHERE event_type = 'click' AND metadata->>'trackLabel' IN ('product_specs_machine_model_link', 'product_brand_machine_model_badge')))::int,
        'relatedClicks', (COUNT(*) FILTER (WHERE event_type = 'related_product_click'))::int
      ) FROM filtered_events) AS product_engagement_json,
      (SELECT COUNT(*) FILTER (WHERE assisted_enquiry)::int FROM related_assisted) AS related_assisted_count,
      (SELECT COALESCE(json_agg(tz), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'productSlug', ''), NULLIF(SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 4), ''), 'unknown') AS "productSlug",
          COALESCE(NULLIF(MAX(metadata->>'productTitle'), ''), NULLIF(MAX(page_title), ''), 'Unknown Product') AS "productTitle",
          (COUNT(*) FILTER (WHERE metadata->>'action' = 'open'))::int AS opens,
          COALESCE(ROUND(AVG(
            CASE
              WHEN metadata->>'action' = 'close'
               AND (metadata->>'durationMs') ~ '^[0-9]+([.][0-9]+)?$'
              THEN CASE
                WHEN LENGTH(SPLIT_PART(metadata->>'durationMs', '.', 1)) <= 9
                THEN LEAST(LEFT(metadata->>'durationMs', 16)::numeric, 86400000)
                ELSE 86400000
              END
            END
          )), 0)::int AS "avgDurationMs"
        FROM filtered_events
        WHERE event_type = 'image_zoom'
        GROUP BY 1
        ORDER BY (COUNT(*) FILTER (WHERE metadata->>'action' = 'open')) DESC
        LIMIT 10
      ) tz) AS top_zoomed_products_json,
      (SELECT COALESCE(json_agg(tr), '[]'::json) FROM (
        SELECT
          source_slug AS "sourceProductSlug",
          target_slug AS "targetProductSlug",
          MAX(target_title) AS "targetTitle",
          COUNT(*)::int AS clicks,
          (COUNT(*) FILTER (WHERE assisted_enquiry))::int AS "assistedEnquiries"
        FROM related_assisted
        GROUP BY source_slug, target_slug
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) tr) AS top_related_transitions_json,
      (SELECT json_build_object(
        'bannerViews', (SELECT COUNT(*)::int FROM export_views),
        'whatsappClicks', (SELECT COUNT(*)::int FROM export_clicks)
      )) AS export_summary_json,
      (SELECT COALESCE(json_agg(ec), '[]'::json) FROM (
        SELECT
          COALESCE(v.country, c.country, 'Unknown') AS country,
          COALESCE(v.country_code, c.country_code, 'UN') AS "countryCode",
          COALESCE(v.banner_views, 0)::int AS "bannerViews",
          COALESCE(c.whatsapp_clicks, 0)::int AS "whatsappClicks"
        FROM export_v_by_cc v
        FULL OUTER JOIN export_c_by_cc c ON v.country_code = c.country_code
        ORDER BY COALESCE(v.banner_views, 0) DESC, COALESCE(c.whatsapp_clicks, 0) DESC
        LIMIT 15
      ) ec) AS export_countries_json,
      (SELECT COALESCE(json_agg(egd), '[]'::json) FROM (
        SELECT
          server_country_code AS "serverCountryCode",
          client_country_code AS "clientCountryCode",
          COUNT(DISTINCT NULLIF(session_id, ''))::int AS sessions
        FROM export_views
        WHERE server_country_code <> 'UN'
          AND client_country_code <> 'UN'
          AND server_country_code <> client_country_code
        GROUP BY 1, 2
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) egd) AS export_geo_discrepancy_json,
      (SELECT json_build_object(
        'totalModelViews', (SELECT COALESCE(SUM(views), 0)::int FROM model_view_agg),
        'faqToggles', (SELECT COUNT(*)::int FROM filtered_events WHERE event_type = 'model_faq_accordion_toggle' AND LOWER(COALESCE(metadata->>'open', '')) = 'true'),
        'siblingClicks', (SELECT COUNT(*)::int FROM filtered_events WHERE event_type = 'model_sibling_switcher_card')
      )) AS model_hub_summary_json,
      (SELECT COALESCE(json_agg(mh), '[]'::json) FROM (
        SELECT
          v.machine_slug AS "machineSlug",
          v.views,
          v.unique_sessions AS "uniqueSessions",
          COALESCE(d.downstream_part_views, 0)::int AS "downstreamPartViews",
          COALESCE(d.downstream_enquiries, 0)::int AS "downstreamEnquiries"
        FROM model_view_agg v
        LEFT JOIN model_downstream d ON d.machine_slug = v.machine_slug
        ORDER BY v.views DESC
      ) mh) AS model_hubs_json,
      (SELECT COALESCE(json_agg(mf), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'machineSlug', ''), SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 3), 'unknown') AS "machineSlug",
          COALESCE(NULLIF(metadata->>'question', ''), NULLIF(element_text, ''), 'FAQ') AS question,
          COUNT(*)::int AS opens
        FROM filtered_events
        WHERE event_type = 'model_faq_accordion_toggle'
          AND LOWER(COALESCE(metadata->>'open', '')) = 'true'
        GROUP BY 1, 2
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) mf) AS top_model_faqs_json,
      (SELECT COALESCE(json_agg(ms), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'sourceMachineSlug', ''), SPLIT_PART(LOWER(RTRIM(SPLIT_PART(page_path, '?', 1), '/')), '/', 3), 'unknown') AS "sourceMachineSlug",
          COALESCE(NULLIF(metadata->>'targetMachineSlug', ''), 'unknown') AS "targetMachineSlug",
          COALESCE(NULLIF(metadata->>'targetMachineName', ''), NULLIF(element_text, ''), NULLIF(metadata->>'targetMachineSlug', ''), 'Unknown Model') AS "targetMachineName",
          COUNT(*)::int AS clicks
        FROM filtered_events
        WHERE event_type = 'model_sibling_switcher_card'
        GROUP BY 1, 2, 3
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) ms) AS top_sibling_transitions_json
    `
  );

  // Query 3/3: Competitor & Nuisance Surveillance Sessions
  const suspiciousDwellPromise = timedDbQuery<{
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
    'stats_dashboard_sentinel',
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

  const rawProdEng = behavior?.product_engagement_json || {
    zoomOpens: 0,
    zoomCloses: 0,
    avgZoomDurationMs: 0,
    specToggles: 0,
    modelHubNavClicks: 0,
    relatedClicks: 0,
  };
  const relatedClicksCount = Number(rawProdEng.relatedClicks) || 0;
  const relatedAssistedEnquiries = Number(behavior?.related_assisted_count) || 0;
  const productEngagementStats: ProductEngagementStats = {
    zoomOpens: Number(rawProdEng.zoomOpens) || 0,
    zoomCloses: Number(rawProdEng.zoomCloses) || 0,
    avgZoomDurationMs: Number(rawProdEng.avgZoomDurationMs) || 0,
    specToggles: Number(rawProdEng.specToggles) || 0,
    modelHubNavClicks: Number(rawProdEng.modelHubNavClicks) || 0,
    relatedClicks: relatedClicksCount,
    relatedAssistedEnquiries,
    relatedAssistRate:
      relatedClicksCount > 0
        ? Math.min(100, Math.round((relatedAssistedEnquiries / relatedClicksCount) * 1000) / 10)
        : 0,
    topZoomedProducts: (behavior?.top_zoomed_products_json || []).map((row) => ({
      productSlug: row.productSlug || 'unknown',
      productTitle: row.productTitle || 'Unknown Product',
      opens: Number(row.opens) || 0,
      avgDurationMs: Number(row.avgDurationMs) || 0,
    })),
    topRelatedTransitions: (behavior?.top_related_transitions_json || []).map((row) => ({
      sourceProductSlug: row.sourceProductSlug || 'unknown',
      targetProductSlug: row.targetProductSlug || 'unknown',
      targetTitle: row.targetTitle || 'Unknown Product',
      clicks: Number(row.clicks) || 0,
      assistedEnquiries: Number(row.assistedEnquiries) || 0,
    })),
  };

  const rawExportSummary = behavior?.export_summary_json || { bannerViews: 0, whatsappClicks: 0 };
  const exportBannerViews = Number(rawExportSummary.bannerViews) || 0;
  const exportWhatsappClicks = Number(rawExportSummary.whatsappClicks) || 0;
  const exportFunnelStats: ExportFunnelStats = {
    bannerViews: exportBannerViews,
    whatsappClicks: exportWhatsappClicks,
    conversionRate:
      exportBannerViews > 0
        ? Math.min(100, Math.round((exportWhatsappClicks / exportBannerViews) * 1000) / 10)
        : 0,
    topCountries: (behavior?.export_countries_json || []).map((row) => {
      const views = Number(row.bannerViews) || 0;
      const clicks = Number(row.whatsappClicks) || 0;
      return {
        country: row.country || 'Unknown',
        countryCode: row.countryCode || 'UN',
        bannerViews: views,
        whatsappClicks: clicks,
        conversionRate:
          views > 0 ? Math.min(100, Math.round((clicks / views) * 1000) / 10) : 0,
      };
    }),
    geoDiscrepancies: (behavior?.export_geo_discrepancy_json || []).map((row) => ({
      serverCountryCode: row.serverCountryCode || 'UN',
      clientCountryCode: row.clientCountryCode || 'UN',
      sessions: Number(row.sessions) || 0,
    })),
  };

  const rawModelSummary = behavior?.model_hub_summary_json || {
    totalModelViews: 0,
    faqToggles: 0,
    siblingClicks: 0,
  };
  const hubMap = new Map<
    string,
    { views: number; uniqueSessions: number; downstreamPartViews: number; downstreamEnquiries: number }
  >();
  for (const m of MACHINE_MODELS) {
    hubMap.set(m.slug.toLowerCase(), {
      views: 0,
      uniqueSessions: 0,
      downstreamPartViews: 0,
      downstreamEnquiries: 0,
    });
  }
  for (const row of behavior?.model_hubs_json || []) {
    const slug = String(row.machineSlug || '').trim().toLowerCase();
    if (!slug || !hubMap.has(slug)) continue;
    hubMap.set(slug, {
      views: Number(row.views) || 0,
      uniqueSessions: Number(row.uniqueSessions) || 0,
      downstreamPartViews: Number(row.downstreamPartViews) || 0,
      downstreamEnquiries: Number(row.downstreamEnquiries) || 0,
    });
  }
  const modelHubRows: ModelHubRow[] = Array.from(hubMap.entries())
    .map(([machineSlug, m]) => {
      const denom = m.uniqueSessions > 0 ? m.uniqueSessions : m.views;
      return {
        machineSlug,
        views: m.views,
        uniqueSessions: m.uniqueSessions,
        downstreamPartViews: m.downstreamPartViews,
        downstreamEnquiries: m.downstreamEnquiries,
        partConversionRate:
          denom > 0
            ? Math.min(100, Math.round((m.downstreamEnquiries / denom) * 1000) / 10)
            : 0,
      };
    })
    .sort((a, b) => b.views - a.views || a.machineSlug.localeCompare(b.machineSlug));

  const canonicalModelViewsTotal = modelHubRows.reduce((sum, h) => sum + h.views, 0);
  const modelHubStats: ModelHubStats = {
    totalModelViews: canonicalModelViewsTotal,
    faqToggles: Number(rawModelSummary.faqToggles) || 0,
    siblingClicks: Number(rawModelSummary.siblingClicks) || 0,
    hubs: modelHubRows,
    topFaqQuestions: (behavior?.top_model_faqs_json || []).map((row) => ({
      machineSlug: row.machineSlug || 'unknown',
      question: row.question || 'FAQ',
      opens: Number(row.opens) || 0,
    })),
    topSiblingTransitions: (behavior?.top_sibling_transitions_json || []).map((row) => ({
      sourceMachineSlug: row.sourceMachineSlug || 'unknown',
      targetMachineSlug: row.targetMachineSlug || 'unknown',
      targetMachineName: row.targetMachineName || 'Unknown Model',
      clicks: Number(row.clicks) || 0,
    })),
  };

  const rawCohortSummary = summary?.cohort_summary_json || {
    totalVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    avgSessionsPerVisitor: 0,
    repeat7dVisitors: 0,
    day1Visitors: 0,
    day1Converters: 0,
    returnDayVisitors: 0,
    returnDayConverters: 0,
  };
  const cohortTotalVisitors = Number(rawCohortSummary.totalVisitors) || 0;
  const repeat7dVisitors = Number(rawCohortSummary.repeat7dVisitors) || 0;
  const day1Visitors = Number(rawCohortSummary.day1Visitors) || 0;
  const day1Converters = Number(rawCohortSummary.day1Converters) || 0;
  const returnDayVisitors = Number(rawCohortSummary.returnDayVisitors) || 0;
  const returnDayConverters = Number(rawCohortSummary.returnDayConverters) || 0;

  const bucketLookup = new Map<'1' | '2' | '3+', { visitors: number; rfqVisitors: number }>();
  for (const row of summary?.cohort_buckets_json || []) {
    if (row.bucket === '1' || row.bucket === '2' || row.bucket === '3+') {
      bucketLookup.set(row.bucket, {
        visitors: Number(row.visitors) || 0,
        rfqVisitors: Number(row.rfq_visitors) || 0,
      });
    }
  }
  const bucketLabels: Record<'1' | '2' | '3+', string> = {
    '1': '1 Session',
    '2': '2 Sessions',
    '3+': '3+ Sessions',
  };
  const cohorts: CohortRetentionStats['cohorts'] = (['1', '2', '3+'] as const).map((bucket) => {
    const data = bucketLookup.get(bucket) || { visitors: 0, rfqVisitors: 0 };
    return {
      bucket,
      label: bucketLabels[bucket],
      visitors: data.visitors,
      sharePct:
        cohortTotalVisitors > 0
          ? Math.round((data.visitors / cohortTotalVisitors) * 1000) / 10
          : 0,
      rfqVisitors: data.rfqVisitors,
      rfqRate:
        data.visitors > 0
          ? Math.min(100, Math.round((data.rfqVisitors / data.visitors) * 1000) / 10)
          : 0,
    };
  });

  const cohortRetentionStats: CohortRetentionStats = {
    newVisitors: Number(rawCohortSummary.newVisitors) || 0,
    returningVisitors: Number(rawCohortSummary.returningVisitors) || 0,
    avgSessionsPerVisitor: Number(rawCohortSummary.avgSessionsPerVisitor) || 0,
    repeat7dRate:
      cohortTotalVisitors > 0
        ? Math.min(100, Math.round((repeat7dVisitors / cohortTotalVisitors) * 1000) / 10)
        : 0,
    cohorts,
    returnDayLift: {
      day1Visitors,
      day1Converters,
      day1Rate:
        day1Visitors > 0
          ? Math.min(100, Math.round((day1Converters / day1Visitors) * 1000) / 10)
          : 0,
      returnDayVisitors,
      returnDayConverters,
      returnDayRate:
        returnDayVisitors > 0
          ? Math.min(100, Math.round((returnDayConverters / returnDayVisitors) * 1000) / 10)
          : 0,
    },
    firstTouchAttribution: (summary?.first_touch_json || []).map((row) => {
      const visitors = Number(row.visitors) || 0;
      const converters = Number(row.converters) || 0;
      return {
        source: row.source || 'Direct / None',
        visitors,
        converters,
        conversionRate:
          visitors > 0 ? Math.min(100, Math.round((converters / visitors) * 1000) / 10) : 0,
      };
    }),
  };

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
    productEngagementStats,
    exportFunnelStats,
    modelHubStats,
    cohortRetentionStats,
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
  const rawLimit = Number(options.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.max(1, Math.round(rawLimit)), 200)
      : 50;
  const rawOffset = Number(options.offset);
  const offset = Number.isFinite(rawOffset)
    ? Math.min(1_000_000_000, Math.max(0, Math.round(rawOffset)))
    : 0;
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
      const visRows = await timedDbQuery<{ ip_address: string | null }>(
        'stats_recent_events_ip_lookup',
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

  const events = await timedDbQuery<any>(
    'stats_recent_events',
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

  return timedDbQuery<any>(
    'stats_product_events',
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

export async function getVisitorsList(
  limitOrOptions: number | VisitorsListOptions = 100,
  offset = 0,
  timeRange?: TimeRange
): Promise<VisitorsListResult> {
  const opts: VisitorsListOptions =
    typeof limitOrOptions === 'object' && limitOrOptions !== null
      ? limitOrOptions
      : { limit: limitOrOptions, offset, timeRange };

  const rawLimit = Number(opts.limit);
  const safeLimit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.max(1, Math.round(rawLimit)), 500)
      : 100;
  const rawOffset = Number(opts.offset);
  const safeOffset = Number.isFinite(rawOffset)
    ? Math.min(1_000_000_000, Math.max(0, Math.round(rawOffset)))
    : 0;
  const safeRange = opts.timeRange ? normalizeTimeRange(opts.timeRange) : undefined;
  const search = typeof opts.search === 'string' ? opts.search.trim() : '';
  const segment = opts.segment || 'all';
  const device = opts.device || 'all';

  const visitorTimeFilter =
    safeRange && safeRange !== 'all' ? `AND ${getTimeCondition(safeRange, 'v.last_seen_at')}` : '';
  const eventTimeFilter =
    safeRange && safeRange !== 'all' ? `AND ${getTimeCondition(safeRange, 'e.created_at')}` : '';

  const repeatPredicateSql =
    "(distinct_days_count > 1 OR (first_seen_at IS NOT NULL AND last_seen_at IS NOT NULL AND DATE(first_seen_at AT TIME ZONE 'Asia/Kolkata') <> DATE(last_seen_at AT TIME ZONE 'Asia/Kolkata')) OR COALESCE(total_sessions, 0) >= 2)";

  const params: any[] = [safeLimit, safeOffset];
  const filterClauses: string[] = [];

  if (segment === 'leads') {
    filterClauses.push(
      "(NULLIF(identified_name, '') IS NOT NULL OR NULLIF(identified_contact, '') IS NOT NULL)"
    );
  } else if (segment === 'rfq') {
    filterClauses.push('whatsapp_clicks > 0');
  } else if (segment === 'repeat') {
    filterClauses.push(repeatPredicateSql);
  } else if (segment === 'flagged') {
    filterClauses.push('is_flagged = TRUE');
  } else if (segment === 'restricted') {
    filterClauses.push('is_restricted = TRUE');
  }

  if (device === 'mobile') {
    filterClauses.push("LOWER(COALESCE(device_type, '')) IN ('mobile', 'tablet')");
  } else if (device === 'desktop') {
    filterClauses.push("LOWER(COALESCE(device_type, '')) = 'desktop'");
  }

  if (search) {
    const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
    params.push(`%${escapedSearch}%`);
    const p = `$${params.length}`;
    filterClauses.push(`(
      visitor_id ILIKE ${p} ESCAPE '\\'
      OR COALESCE(ip_address, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(identified_name, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(identified_contact, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(city, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(region, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(country, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(browser, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(os, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(last_page_viewed, '') ILIKE ${p} ESCAPE '\\'
      OR COALESCE(last_rfq_part, '') ILIKE ${p} ESCAPE '\\'
    )`);
  }

  const filterWhereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

  const rows = await timedDbQuery<{
    summary_json: VisitorsListSummaryCounts | null;
    total_count: number;
    visitors_json: any[];
  }>(
    'stats_visitors_list',
    `
    WITH visitor_metrics AS (
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
          WHERE LOWER(f.target_value) = LOWER(v.visitor_id)
             OR (v.ip_address IS NOT NULL AND LOWER(f.target_value) = LOWER(v.ip_address))
        ) AS is_flagged,
        (
          SELECT f.flag_type FROM analytics_flags f
          WHERE LOWER(f.target_value) = LOWER(v.visitor_id)
             OR (v.ip_address IS NOT NULL AND LOWER(f.target_value) = LOWER(v.ip_address))
          ORDER BY f.created_at DESC
          LIMIT 1
        ) AS flag_type,
        COUNT(e.id)::int AS total_events,
        COUNT(CASE WHEN e.event_type = 'click' THEN 1 END)::int AS total_clicks,
        COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END)::int AS total_copies,
        COUNT(CASE WHEN e.event_type = 'click' AND ${LEAD_CLICK_SQL} THEN 1 END)::int AS whatsapp_clicks,
        COUNT(DISTINCT DATE_TRUNC('day', e.created_at AT TIME ZONE 'Asia/Kolkata'))::int AS distinct_days_count,
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
    ),
    summary_counts AS (
      SELECT
        COUNT(*)::int AS total,
        (COUNT(*) FILTER (WHERE NULLIF(identified_name, '') IS NOT NULL OR NULLIF(identified_contact, '') IS NOT NULL))::int AS leads,
        (COUNT(*) FILTER (WHERE whatsapp_clicks > 0))::int AS rfq,
        (COUNT(*) FILTER (WHERE ${repeatPredicateSql}))::int AS repeat,
        (COUNT(*) FILTER (WHERE is_flagged))::int AS flagged,
        (COUNT(*) FILTER (WHERE is_restricted))::int AS restricted
      FROM visitor_metrics
    ),
    filtered_visitors AS (
      SELECT *
      FROM visitor_metrics
      ${filterWhereSql}
    ),
    filtered_total AS (
      SELECT COUNT(*)::int AS cnt FROM filtered_visitors
    ),
    paged_visitors AS (
      SELECT *
      FROM filtered_visitors
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT $1 OFFSET $2
    )
    SELECT
      (SELECT row_to_json(sc) FROM summary_counts sc) AS summary_json,
      (SELECT cnt FROM filtered_total) AS total_count,
      (SELECT COALESCE(json_agg(pv ORDER BY pv.last_seen_at DESC NULLS LAST), '[]'::json) FROM paged_visitors pv) AS visitors_json
    `,
    params
  );

  const row = rows[0];
  const rawSummary = row?.summary_json;
  return {
    visitors: Array.isArray(row?.visitors_json) ? row.visitors_json : [],
    totalCount: Number(row?.total_count) || 0,
    summaryCounts: {
      total: Number(rawSummary?.total) || 0,
      leads: Number(rawSummary?.leads) || 0,
      rfq: Number(rawSummary?.rfq) || 0,
      repeat: Number(rawSummary?.repeat) || 0,
      flagged: Number(rawSummary?.flagged) || 0,
      restricted: Number(rawSummary?.restricted) || 0,
    },
  };
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
  const safeRange = normalizeTimeRange(timeRange);
  const timeCond = getTimeCondition(safeRange, 'e.created_at');
  const allProducts = getProducts();

  // 1. Fetch enquire clicks with session IDs and admin/bot exclusion (`BUG-05`)
  const clickPromise = timedDbQuery<{
    product_title: string;
    part_number: string;
    product_slug: string;
    page_path: string;
    session_ids: string[] | null;
    clicks: string;
    last_enquiry: string;
  }>(
    'stats_catalog_clicks',
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
  const viewPromise = timedDbQuery<{ page_path: string; views: string; view_sessions: string }>(
    'stats_catalog_views',
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

  // 3. Fetch missing-photo placeholder impressions/clicks & Excavator demand gaps (`BI-04`)
  const gapPromise = timedDbQuery<{
    placeholder_by_slug: Array<{ slug: string; cnt: number }>;
    total_placeholder_impressions: number;
    photo_wa_by_slug: Array<{ slug: string; cnt: number }>;
    excavator_views: number;
    excavator_searches: number;
    excavator_banner_clicks: number;
  }>(
    'stats_catalog_gaps',
    `
    WITH scoped_events AS (
      SELECT
        e.event_type,
        e.page_path,
        e.metadata
      FROM analytics_events e
      LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
      WHERE ${BASE_ADMIN_EXCLUDE_SQL}
        AND ${timeCond}
        AND e.event_type IN ('placeholder_impression', 'pageview', 'search', 'click')
    )
    SELECT
      (SELECT COALESCE(json_agg(pb), '[]'::json) FROM (
        SELECT
          LOWER(COALESCE(NULLIF(metadata->>'productSlug', ''), '')) AS slug,
          COUNT(*)::int AS cnt
        FROM scoped_events
        WHERE event_type = 'placeholder_impression'
        GROUP BY 1
      ) pb) AS placeholder_by_slug,
      (SELECT COUNT(*)::int FROM scoped_events WHERE event_type = 'placeholder_impression' AND LOWER(COALESCE(metadata->>'hasImage', 'false')) <> 'true') AS total_placeholder_impressions,
      (SELECT COALESCE(json_agg(pw), '[]'::json) FROM (
        SELECT
          LOWER(COALESCE(NULLIF(metadata->>'productSlug', ''), '')) AS slug,
          COUNT(*)::int AS cnt
        FROM scoped_events
        WHERE event_type = 'click'
          AND (
            metadata->>'placement' IN ('placeholder_photo_wa', 'placeholder_request_photo')
            OR metadata->>'trackLabel' IN ('placeholder_request_photo_whatsapp', 'placeholder_photo_wa', 'product_placeholder_photo_whatsapp')
          )
        GROUP BY 1
      ) pw) AS photo_wa_by_slug,
      (SELECT COUNT(*)::int FROM scoped_events WHERE event_type = 'pageview' AND (LOWER(page_path) LIKE '%excavator%' OR LOWER(COALESCE(metadata->>'category', '')) = 'excavator')) AS excavator_views,
      (SELECT COUNT(*)::int FROM scoped_events WHERE event_type = 'search' AND (LOWER(COALESCE(metadata->>'category', '')) = 'excavator' OR LOWER(COALESCE(metadata->>'machineSlug', '')) LIKE '%excavator%' OR LOWER(COALESCE(metadata->>'query', '')) LIKE '%excavator%' OR LOWER(page_path) LIKE '%excavator%')) AS excavator_searches,
      (SELECT COUNT(*)::int FROM scoped_events WHERE event_type = 'click' AND (
        metadata->>'trackLabel' IN ('products_excavator_whatsapp', 'search_excavator_whatsapp', 'excavator_banner_wa')
        OR metadata->>'placement' IN ('products_excavator_banner', 'search_excavator_whatsapp', 'excavator_banner_wa')
        OR metadata->>'action' = 'search_excavator_whatsapp_click'
        OR (
          (metadata->>'trackLabel' = 'model_empty_banner_whatsapp' OR metadata->>'placement' = 'model_empty_banner')
          AND LOWER(COALESCE(metadata->>'machineSlug', page_path)) LIKE '%excavator%'
        )
      )) AS excavator_banner_clicks
    `
  );

  const [clickRows, viewRows, gapRows] = await Promise.all([clickPromise, viewPromise, gapPromise]);

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

  const gapRow = gapRows[0];
  const placeholderMap = new Map<string, number>();
  for (const row of gapRow?.placeholder_by_slug || []) {
    if (row.slug) {
      placeholderMap.set(row.slug.toLowerCase(), (placeholderMap.get(row.slug.toLowerCase()) || 0) + (Number(row.cnt) || 0));
    }
  }
  const photoWaMap = new Map<string, number>();
  for (const row of gapRow?.photo_wa_by_slug || []) {
    if (row.slug) {
      photoWaMap.set(row.slug.toLowerCase(), (photoWaMap.get(row.slug.toLowerCase()) || 0) + (Number(row.cnt) || 0));
    }
  }

  const statBySlug = new Map<string, ProductEnquiryStat>();
  for (const s of result) {
    statBySlug.set(s.slug, s);
  }

  const imagelessProducts = allProducts.filter((p) => !p.image || !String(p.image).trim());
  const matchedPhotoWaSlugs = new Set<string>();
  const allGapProducts: CatalogHealthGapProduct[] = imagelessProducts.map((p) => {
    const canonicalSlug = getProductUrlSlug(p).toLowerCase();
    const rawSlug = p.slug.toLowerCase();
    const impressions =
      (placeholderMap.get(canonicalSlug) || 0) +
      (rawSlug !== canonicalSlug ? placeholderMap.get(rawSlug) || 0 : 0);
    const photoWaClicks =
      (photoWaMap.get(canonicalSlug) || 0) +
      (rawSlug !== canonicalSlug ? photoWaMap.get(rawSlug) || 0 : 0);
    matchedPhotoWaSlugs.add(canonicalSlug);
    matchedPhotoWaSlugs.add(rawSlug);
    const stat = statBySlug.get(canonicalSlug);
    const views = stat ? stat.views : 0;
    const enquireClicks = stat ? stat.enquire_clicks : 0;
    return {
      slug: canonicalSlug,
      title: p.title,
      category: p.category,
      part_number: p.part_number || '',
      impressions,
      clicks: Math.max(photoWaClicks, enquireClicks),
      views,
      enquire_clicks: enquireClicks,
    };
  });

  let unmatchedPhotoWaClicks = 0;
  for (const [slug, cnt] of Array.from(photoWaMap.entries())) {
    if (!matchedPhotoWaSlugs.has(slug)) {
      unmatchedPhotoWaClicks += cnt;
    }
  }

  const totalMatchedPlaceholderImpressions = allGapProducts.reduce((sum, item) => sum + item.impressions, 0);
  const missingPhotoImpressions = Math.max(
    Number(gapRow?.total_placeholder_impressions) || 0,
    totalMatchedPlaceholderImpressions
  );
  const missingPhotoClicks =
    allGapProducts.reduce((sum, item) => sum + item.clicks, 0) + unmatchedPhotoWaClicks;

  allGapProducts.sort(
    (a, b) =>
      b.impressions - a.impressions ||
      b.views - a.views ||
      b.enquire_clicks - a.enquire_clicks ||
      a.title.localeCompare(b.title)
  );

  const catalogHealthGaps: CatalogHealthGaps = {
    missingPhotoSkuCount: imagelessProducts.length,
    missingPhotoImpressions,
    missingPhotoClicks,
    excavatorViews: Number(gapRow?.excavator_views) || 0,
    excavatorSearches: Number(gapRow?.excavator_searches) || 0,
    excavatorBannerClicks: Number(gapRow?.excavator_banner_clicks) || 0,
    topGapProducts: allGapProducts.slice(0, 20),
  };

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
    catalogHealthGaps,
  };
}

/**
 * Fetches operational telemetry, alert delivery history, 404 paths, LoadingScreen latencies,
 * client JS errors, and Edge restriction blocks (`OBS-01..09`, `PROD-09`).
 */
export async function getOpsHealthStats(timeRange: TimeRange = 'today'): Promise<OpsHealthStats> {
  const safeRange = normalizeTimeRange(timeRange);
  const opsTimeCond = getTimeCondition(safeRange, 'created_at');
  const eventTimeCond = `(${getTimeCondition(safeRange, 'e.created_at')}) AND ${BASE_ADMIN_EXCLUDE_SQL}`;

  // 1. Operational metrics (`analytics_ops_metrics`)
  const opsPromise = timedDbQuery<{
    ingest_summary_json: {
      totalBatches: number;
      okBatches: number;
      rejectedBatches: number;
      errorBatches: number;
      totalEventsIngested: number;
      p95DurationMs: number;
    } | null;
    ingest_errors_json: Array<{ errorCode: string; count: number }>;
    api_sla_json: Array<{
      route: string;
      requests: number;
      okCount: number;
      rejectedCount: number;
      errorCount: number;
      p50Ms: number;
      p95Ms: number;
      maxMs: number;
    }>;
    db_queries_json: Array<{
      targetName: string;
      count: number;
      errorCount: number;
      p50Ms: number;
      p95Ms: number;
      maxMs: number;
    }>;
    catalog_cache_json: { hits: number; misses: number; avgDurationMs: number } | null;
    external_slas_json: Array<{
      targetName: string;
      calls: number;
      okCount: number;
      timeoutCount: number;
      errorCount: number;
      p50Ms: number;
      p95Ms: number;
      lastErrorCode: string | null;
    }>;
    middleware_summary_json: {
      totalBlocks: number;
      redirect307Count: number;
      json200Count: number;
    } | null;
    middleware_targets_json: Array<{
      targetName: string;
      statusCode: number | null;
      blocks: number;
      lastBlockedAt: string;
    }>;
  }>(
    'stats_ops_metrics',
    `
    WITH scoped_ops AS (
      SELECT *
      FROM analytics_ops_metrics
      WHERE ${opsTimeCond}
    )
    SELECT
      (SELECT json_build_object(
        'totalBatches', COUNT(*)::int,
        'okBatches', (COUNT(*) FILTER (WHERE outcome = 'ok'))::int,
        'rejectedBatches', (COUNT(*) FILTER (WHERE outcome = 'rejected'))::int,
        'errorBatches', (COUNT(*) FILTER (WHERE outcome IN ('error', 'timeout')))::int,
        'totalEventsIngested', COALESCE(SUM(batch_size) FILTER (WHERE outcome = 'ok'), 0)::int,
        'p95DurationMs', COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int
      ) FROM scoped_ops WHERE metric_kind = 'ingest_batch') AS ingest_summary_json,
      (SELECT COALESCE(json_agg(ie), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(error_code, ''), outcome) AS "errorCode",
          COUNT(*)::int AS count
        FROM scoped_ops
        WHERE metric_kind = 'ingest_batch' AND outcome <> 'ok'
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) ie) AS ingest_errors_json,
      (SELECT COALESCE(json_agg(api), '[]'::json) FROM (
        SELECT
          target_name AS route,
          COUNT(*)::int AS requests,
          (COUNT(*) FILTER (WHERE outcome = 'ok'))::int AS "okCount",
          (COUNT(*) FILTER (WHERE outcome = 'rejected'))::int AS "rejectedCount",
          (COUNT(*) FILTER (WHERE outcome IN ('error', 'timeout') OR status_code >= 500))::int AS "errorCount",
          COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p50Ms",
          COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p95Ms",
          COALESCE(MAX(duration_ms), 0)::int AS "maxMs"
        FROM scoped_ops
        WHERE metric_kind = 'api_request'
        GROUP BY target_name
        ORDER BY COUNT(*) DESC
      ) api) AS api_sla_json,
      (SELECT COALESCE(json_agg(dbq), '[]'::json) FROM (
        SELECT
          target_name AS "targetName",
          COUNT(*)::int AS count,
          (COUNT(*) FILTER (WHERE outcome IN ('error', 'timeout')))::int AS "errorCount",
          COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p50Ms",
          COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p95Ms",
          COALESCE(MAX(duration_ms), 0)::int AS "maxMs"
        FROM scoped_ops
        WHERE metric_kind = 'db_query'
        GROUP BY target_name
        ORDER BY COUNT(*) DESC
      ) dbq) AS db_queries_json,
      (SELECT json_build_object(
        'hits', (COUNT(*) FILTER (WHERE outcome = 'cache_hit'))::int,
        'misses', (COUNT(*) FILTER (WHERE outcome = 'cache_miss'))::int,
        'avgDurationMs', COALESCE(ROUND(AVG(duration_ms)::numeric), 0)::int
      ) FROM scoped_ops WHERE metric_kind = 'catalog_cache') AS catalog_cache_json,
      (SELECT COALESCE(json_agg(ext), '[]'::json) FROM (
        SELECT
          target_name AS "targetName",
          COUNT(*)::int AS calls,
          (COUNT(*) FILTER (WHERE outcome = 'ok'))::int AS "okCount",
          (COUNT(*) FILTER (WHERE outcome = 'timeout'))::int AS "timeoutCount",
          (COUNT(*) FILTER (WHERE outcome = 'error'))::int AS "errorCount",
          COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p50Ms",
          COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::numeric), 0)::int AS "p95Ms",
          (ARRAY_AGG(error_code ORDER BY created_at DESC) FILTER (WHERE error_code IS NOT NULL))[1] AS "lastErrorCode"
        FROM scoped_ops
        WHERE metric_kind = 'external_call'
        GROUP BY target_name
        ORDER BY COUNT(*) DESC
      ) ext) AS external_slas_json,
      (SELECT json_build_object(
        'totalBlocks', COUNT(*)::int,
        'redirect307Count', (COUNT(*) FILTER (WHERE status_code = 307))::int,
        'json200Count', (COUNT(*) FILTER (WHERE status_code = 200))::int
      ) FROM scoped_ops WHERE metric_kind = 'middleware_block') AS middleware_summary_json,
      (SELECT COALESCE(json_agg(mw), '[]'::json) FROM (
        SELECT
          target_name AS "targetName",
          status_code AS "statusCode",
          COUNT(*)::int AS blocks,
          MAX(created_at)::text AS "lastBlockedAt"
        FROM scoped_ops
        WHERE metric_kind = 'middleware_block'
        GROUP BY target_name, status_code
        ORDER BY COUNT(*) DESC
        LIMIT 20
      ) mw) AS middleware_targets_json
    `
  );

  // 2. Alert deliveries (`analytics_alert_deliveries`)
  const alertsPromise = timedDbQuery<{
    summary_json: { total: number; sent: number; failed: number; deduplicated: number } | null;
    by_channel_json: Array<{ channel: string; sent: number; failed: number; deduplicated: number; avgLatencyMs: number }>;
    recent_json: OpsHealthStats['alertDeliveries']['recent'];
  }>(
    'stats_ops_alerts',
    `
    WITH scoped_alerts AS (
      SELECT *
      FROM analytics_alert_deliveries
      WHERE ${opsTimeCond}
    )
    SELECT
      (SELECT json_build_object(
        'total', COUNT(*)::int,
        'sent', (COUNT(*) FILTER (WHERE outcome = 'sent'))::int,
        'failed', (COUNT(*) FILTER (WHERE outcome = 'failed'))::int,
        'deduplicated', (COUNT(*) FILTER (WHERE outcome = 'deduplicated'))::int
      ) FROM scoped_alerts) AS summary_json,
      (SELECT COALESCE(json_agg(ac), '[]'::json) FROM (
        SELECT
          channel,
          (COUNT(*) FILTER (WHERE outcome = 'sent'))::int AS sent,
          (COUNT(*) FILTER (WHERE outcome = 'failed'))::int AS failed,
          (COUNT(*) FILTER (WHERE outcome = 'deduplicated'))::int AS deduplicated,
          COALESCE(ROUND(AVG(latency_ms)::numeric), 0)::int AS "avgLatencyMs"
        FROM scoped_alerts
        GROUP BY channel
        ORDER BY COUNT(*) DESC
      ) ac) AS by_channel_json,
      (SELECT COALESCE(json_agg(ar), '[]'::json) FROM (
        SELECT
          id::int AS id,
          dedupe_key,
          visitor_id,
          heuristic_name,
          channel,
          outcome,
          http_status,
          latency_ms,
          error_message,
          created_at::text AS created_at
        FROM scoped_alerts
        ORDER BY created_at DESC, id DESC
        LIMIT 20
      ) ar) AS recent_json
    `
  );

  // 3. Frontend reliability events (`not_found`, `loading_screen_timing`, `client_error`)
  const eventsOpsPromise = timedDbQuery<{
    not_found_json: OpsHealthStats['notFoundPaths'];
    loading_screen_json: {
      samples: number;
      p50WaitMs: number;
      p95WaitMs: number;
      avgWaitMs: number;
      fallback12sCount: number;
      bouncedBeforeDismissCount: number;
    } | null;
    client_error_summary_json: { totalErrors: number; uniqueVisitors: number } | null;
    top_client_errors_json: OpsHealthStats['clientErrors']['topErrors'];
  }>(
    'stats_ops_events',
    `
    WITH scoped_events AS (
      SELECT
        e.visitor_id,
        e.event_type,
        e.page_path,
        e.metadata,
        e.created_at
      FROM analytics_events e
      LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
      WHERE ${eventTimeCond}
        AND e.event_type IN ('not_found', 'loading_screen_timing', 'client_error')
    )
    SELECT
      (SELECT COALESCE(json_agg(nf), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'requestedPath', ''), page_path) AS path,
          COUNT(*)::int AS hits,
          COUNT(DISTINCT visitor_id)::int AS "uniqueVisitors",
          MAX(created_at)::text AS "lastSeenAt",
          MAX(NULLIF(metadata->>'referrer', '')) AS "sampleReferrer",
          MAX(NULLIF(metadata->>'inferredPartNumber', '')) AS "inferredPartNumber"
        FROM scoped_events
        WHERE event_type = 'not_found'
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 25
      ) nf) AS not_found_json,
      (SELECT json_build_object(
        'samples', COUNT(*)::int,
        'p50WaitMs', COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY
          CASE
            WHEN (metadata->>'waitDurationMs') ~ '^[0-9]+([.][0-9]+)?$'
            THEN CASE
              WHEN LENGTH(SPLIT_PART(metadata->>'waitDurationMs', '.', 1)) <= 9
              THEN LEAST(LEFT(metadata->>'waitDurationMs', 16)::numeric, 86400000)
              ELSE 86400000
            END
          END
        ))::numeric), 0)::int,
        'p95WaitMs', COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY
          CASE
            WHEN (metadata->>'waitDurationMs') ~ '^[0-9]+([.][0-9]+)?$'
            THEN CASE
              WHEN LENGTH(SPLIT_PART(metadata->>'waitDurationMs', '.', 1)) <= 9
              THEN LEAST(LEFT(metadata->>'waitDurationMs', 16)::numeric, 86400000)
              ELSE 86400000
            END
          END
        ))::numeric), 0)::int,
        'avgWaitMs', COALESCE(ROUND(AVG(
          CASE
            WHEN (metadata->>'waitDurationMs') ~ '^[0-9]+([.][0-9]+)?$'
            THEN CASE
              WHEN LENGTH(SPLIT_PART(metadata->>'waitDurationMs', '.', 1)) <= 9
              THEN LEAST(LEFT(metadata->>'waitDurationMs', 16)::numeric, 86400000)
              ELSE 86400000
            END
          END
        )::numeric), 0)::int,
        'fallback12sCount', (COUNT(*) FILTER (WHERE LOWER(COALESCE(metadata->>'hitFallback12s', '')) = 'true'))::int,
        'bouncedBeforeDismissCount', (COUNT(*) FILTER (WHERE LOWER(COALESCE(metadata->>'bouncedBeforeDismiss', '')) = 'true'))::int
      ) FROM scoped_events WHERE event_type = 'loading_screen_timing') AS loading_screen_json,
      (SELECT json_build_object(
        'totalErrors', COUNT(*)::int,
        'uniqueVisitors', COUNT(DISTINCT visitor_id)::int
      ) FROM scoped_events WHERE event_type = 'client_error') AS client_error_summary_json,
      (SELECT COALESCE(json_agg(ce), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(metadata->>'kind', ''), 'error') AS kind,
          COALESCE(NULLIF(metadata->>'message', ''), 'Unknown error') AS message,
          COALESCE(NULLIF(metadata->>'source', ''), NULLIF(page_path, ''), 'unknown') AS source,
          COUNT(*)::int AS count,
          COUNT(DISTINCT visitor_id)::int AS "uniqueVisitors",
          MAX(created_at)::text AS "lastSeenAt"
        FROM scoped_events
        WHERE event_type = 'client_error'
        GROUP BY 1, 2, 3
        ORDER BY COUNT(*) DESC
        LIMIT 25
      ) ce) AS top_client_errors_json
    `
  );

  const [opsRows, alertRows, eventOpsRows] = await Promise.all([
    opsPromise,
    alertsPromise,
    eventsOpsPromise,
  ]);

  const ops = opsRows[0];
  const alert = alertRows[0];
  const evOps = eventOpsRows[0];

  const ingestRaw = ops?.ingest_summary_json || {
    totalBatches: 0,
    okBatches: 0,
    rejectedBatches: 0,
    errorBatches: 0,
    totalEventsIngested: 0,
    p95DurationMs: 0,
  };
  const totalBatches = Number(ingestRaw.totalBatches) || 0;
  const okBatches = Number(ingestRaw.okBatches) || 0;
  const errorBatches = Number(ingestRaw.errorBatches) || 0;

  let poolStats = { max: 4, totalCount: 0, idleCount: 0, waitingCount: 0 };
  try {
    const pool = getDbPool();
    poolStats = {
      max: 4,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch {}

  const cacheRaw = ops?.catalog_cache_json || { hits: 0, misses: 0, avgDurationMs: 0 };
  const cacheHits = Number(cacheRaw.hits) || 0;
  const cacheMisses = Number(cacheRaw.misses) || 0;
  const cacheTotal = cacheHits + cacheMisses;

  const loadingRaw = evOps?.loading_screen_json || {
    samples: 0,
    p50WaitMs: 0,
    p95WaitMs: 0,
    avgWaitMs: 0,
    fallback12sCount: 0,
    bouncedBeforeDismissCount: 0,
  };
  const loadingSamples = Number(loadingRaw.samples) || 0;
  const fallback12sCount = Number(loadingRaw.fallback12sCount) || 0;
  const bouncedCount = Number(loadingRaw.bouncedBeforeDismissCount) || 0;

  const alertRaw = alert?.summary_json || { total: 0, sent: 0, failed: 0, deduplicated: 0 };
  const mwRaw = ops?.middleware_summary_json || { totalBlocks: 0, redirect307Count: 0, json200Count: 0 };
  const clientErrRaw = evOps?.client_error_summary_json || { totalErrors: 0, uniqueVisitors: 0 };

  return {
    ingestStats: {
      totalBatches,
      okBatches,
      rejectedBatches: Number(ingestRaw.rejectedBatches) || 0,
      errorBatches,
      totalEventsIngested: Number(ingestRaw.totalEventsIngested) || 0,
      successRate:
        totalBatches > 0 ? Math.min(100, Math.round((okBatches / totalBatches) * 1000) / 10) : 0,
      errorRate:
        totalBatches > 0 ? Math.min(100, Math.round((errorBatches / totalBatches) * 1000) / 10) : 0,
      p95DurationMs: Number(ingestRaw.p95DurationMs) || 0,
      byErrorCode: (ops?.ingest_errors_json || []).map((row) => ({
        errorCode: row.errorCode || 'unknown',
        count: Number(row.count) || 0,
      })),
    },
    apiSla: (ops?.api_sla_json || []).map((row) => {
      const requests = Number(row.requests) || 0;
      const errorCount = Number(row.errorCount) || 0;
      return {
        route: row.route,
        requests,
        okCount: Number(row.okCount) || 0,
        rejectedCount: Number(row.rejectedCount) || 0,
        errorCount,
        error5xxRate:
          requests > 0 ? Math.min(100, Math.round((errorCount / requests) * 1000) / 10) : 0,
        p50Ms: Number(row.p50Ms) || 0,
        p95Ms: Number(row.p95Ms) || 0,
        maxMs: Number(row.maxMs) || 0,
      };
    }),
    dbPoolAndCache: {
      pool: poolStats,
      memoryCatalogCache: getProductsCacheStats(),
      dbQueries: (ops?.db_queries_json || []).map((row) => ({
        targetName: row.targetName,
        count: Number(row.count) || 0,
        errorCount: Number(row.errorCount) || 0,
        p50Ms: Number(row.p50Ms) || 0,
        p95Ms: Number(row.p95Ms) || 0,
        maxMs: Number(row.maxMs) || 0,
      })),
      catalogCache: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate:
          cacheTotal > 0 ? Math.min(100, Math.round((cacheHits / cacheTotal) * 1000) / 10) : 0,
        avgDurationMs: Number(cacheRaw.avgDurationMs) || 0,
      },
    },
    externalSlas: (ops?.external_slas_json || []).map((row) => {
      const calls = Number(row.calls) || 0;
      const okCount = Number(row.okCount) || 0;
      return {
        targetName: row.targetName,
        calls,
        okCount,
        timeoutCount: Number(row.timeoutCount) || 0,
        errorCount: Number(row.errorCount) || 0,
        successRate: calls > 0 ? Math.min(100, Math.round((okCount / calls) * 1000) / 10) : 0,
        p50Ms: Number(row.p50Ms) || 0,
        p95Ms: Number(row.p95Ms) || 0,
        lastErrorCode: row.lastErrorCode || null,
      };
    }),
    alertDeliveries: {
      total: Number(alertRaw.total) || 0,
      sent: Number(alertRaw.sent) || 0,
      failed: Number(alertRaw.failed) || 0,
      deduplicated: Number(alertRaw.deduplicated) || 0,
      byChannel: (alert?.by_channel_json || []).map((row) => ({
        channel: row.channel,
        sent: Number(row.sent) || 0,
        failed: Number(row.failed) || 0,
        deduplicated: Number(row.deduplicated) || 0,
        avgLatencyMs: Number(row.avgLatencyMs) || 0,
      })),
      recent: Array.isArray(alert?.recent_json) ? alert.recent_json : [],
    },
    notFoundPaths: Array.isArray(evOps?.not_found_json) ? evOps.not_found_json : [],
    loadingScreen: {
      samples: loadingSamples,
      p50WaitMs: Number(loadingRaw.p50WaitMs) || 0,
      p95WaitMs: Number(loadingRaw.p95WaitMs) || 0,
      avgWaitMs: Number(loadingRaw.avgWaitMs) || 0,
      fallback12sCount,
      fallback12sRate:
        loadingSamples > 0
          ? Math.min(100, Math.round((fallback12sCount / loadingSamples) * 1000) / 10)
          : 0,
      bouncedBeforeDismissCount: bouncedCount,
      bounceRate:
        loadingSamples > 0
          ? Math.min(100, Math.round((bouncedCount / loadingSamples) * 1000) / 10)
          : 0,
    },
    clientErrors: {
      totalErrors: Number(clientErrRaw.totalErrors) || 0,
      uniqueVisitors: Number(clientErrRaw.uniqueVisitors) || 0,
      topErrors: Array.isArray(evOps?.top_client_errors_json) ? evOps.top_client_errors_json : [],
    },
    middlewareBlocks: {
      totalBlocks: Number(mwRaw.totalBlocks) || 0,
      redirect307Count: Number(mwRaw.redirect307Count) || 0,
      json200Count: Number(mwRaw.json200Count) || 0,
      byTarget: Array.isArray(ops?.middleware_targets_json) ? ops.middleware_targets_json : [],
    },
  };
}

/**
 * Fetches paginated admin security & configuration audit logs (`OBS-09`, `PROD-09`).
 */
export async function getAuditLogs(
  limit = 50,
  offset = 0
): Promise<{ logs: AuditLogRecord[]; totalCount: number }> {
  const rawLimit = Number(limit);
  const safeLimit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.max(1, Math.round(rawLimit)), 200)
      : 50;
  const rawOffset = Number(offset);
  const safeOffset = Number.isFinite(rawOffset)
    ? Math.min(1_000_000_000, Math.max(0, Math.round(rawOffset)))
    : 0;

  const rows = await timedDbQuery<{
    total_count: number;
    logs_json: AuditLogRecord[];
  }>(
    'stats_audit_logs',
    `
    WITH total AS (
      SELECT COUNT(*)::int AS cnt FROM analytics_audit_logs
    ),
    paged AS (
      SELECT
        id::int AS id,
        actor_ip,
        actor_label,
        action,
        target_type,
        target_value,
        success,
        metadata,
        created_at::text AS created_at
      FROM analytics_audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      (SELECT cnt FROM total) AS total_count,
      (SELECT COALESCE(json_agg(p ORDER BY p.created_at DESC, p.id DESC), '[]'::json) FROM paged p) AS logs_json
    `,
    [safeLimit, safeOffset]
  );

  const row = rows[0];
  return {
    logs: Array.isArray(row?.logs_json) ? row.logs_json : [],
    totalCount: Number(row?.total_count) || 0,
  };
}
