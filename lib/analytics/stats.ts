import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { query, getFlags, FlagRecord } from './db';

export type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | 'all';

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
    case 'all':
    default:
      return '1=1';
  }
}

export async function getDashboardStats(timeRange: TimeRange = 'today') {
  const baseAdminExclude = "e.page_path NOT LIKE '/admin%' AND (e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%') AND (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))";
  const eventTimeCond = `(${getTimeCondition(timeRange, 'e.created_at')}) AND ${baseAdminExclude}`;
  const sessionTimeCond = `(${getTimeCondition(timeRange, 's.started_at')}) AND (s.entry_page IS NULL OR s.entry_page NOT LIKE '/admin%')`;
  const visitorTimeCond = getTimeCondition(timeRange, 'v.first_seen_at');

  // 1. Real-time active users (active in the last 5 minutes)
  const activeUsersRes = await query<{ active_count: string }>(
    `
    SELECT COUNT(DISTINCT visitor_id) AS active_count
    FROM analytics_sessions
    WHERE last_active_at >= NOW() - INTERVAL '5 minutes'
    `
  );
  const activeUsersNow = parseInt(activeUsersRes[0]?.active_count || '0', 10);

  // 2. High level KPI totals
  const kpiRes = await query<{
    total_visitors: string;
    total_sessions: string;
    total_pageviews: string;
    total_clicks: string;
    avg_duration_seconds: string;
    whatsapp_clicks: string;
    phone_calls: string;
    form_leads: string;
    rage_clicks: string;
    dead_clicks: string;
  }>(
    `
    SELECT
      COUNT(DISTINCT e.visitor_id) AS total_visitors,
      COUNT(DISTINCT e.session_id) AS total_sessions,
      COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END) AS total_pageviews,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS total_clicks,
      COALESCE(ROUND(AVG(s.duration_seconds)), 0) AS avg_duration_seconds,
      COUNT(CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_text ILIKE '%whatsapp%' OR e.element_target ILIKE '%whatsapp%') THEN 1 END) AS whatsapp_clicks,
      COUNT(CASE WHEN e.event_type = 'click' AND (e.element_target LIKE 'tel:%' OR e.element_text ILIKE '%call%') THEN 1 END) AS phone_calls,
      COUNT(CASE WHEN e.event_type = 'form_submit' THEN 1 END) AS form_leads,
      COUNT(CASE WHEN e.event_type = 'rage_click' THEN 1 END) AS rage_clicks,
      COUNT(CASE WHEN e.event_type = 'dead_click' THEN 1 END) AS dead_clicks
    FROM analytics_events e
    LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE ${eventTimeCond}
    `
  );

  const kpis = {
    activeUsersNow,
    totalVisitors: parseInt(kpiRes[0]?.total_visitors || '0', 10),
    totalSessions: parseInt(kpiRes[0]?.total_sessions || '0', 10),
    totalPageviews: parseInt(kpiRes[0]?.total_pageviews || '0', 10),
    totalClicks: parseInt(kpiRes[0]?.total_clicks || '0', 10),
    avgDurationSeconds: parseInt(kpiRes[0]?.avg_duration_seconds || '0', 10),
    whatsappClicks: parseInt(kpiRes[0]?.whatsapp_clicks || '0', 10),
    phoneCalls: parseInt(kpiRes[0]?.phone_calls || '0', 10),
    formLeads: parseInt(kpiRes[0]?.form_leads || '0', 10),
    rageClicks: parseInt(kpiRes[0]?.rage_clicks || '0', 10),
    deadClicks: parseInt(kpiRes[0]?.dead_clicks || '0', 10),
  };

  // 3. Top Clicked Elements ("Who Clicked What" Leaderboard)
  const topClicks = await query<{
    element_text: string;
    element_target: string;
    element_tag: string;
    click_count: string;
    page_path: string;
  }>(
    `
    SELECT
      COALESCE(element_text, 'Unknown Button') AS element_text,
      COALESCE(element_target, '') AS element_target,
      COALESCE(element_tag, 'button') AS element_tag,
      page_path,
      COUNT(*) AS click_count
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'click' AND ${eventTimeCond}
    GROUP BY element_text, element_target, element_tag, page_path
    ORDER BY click_count DESC
    LIMIT 15
    `
  );

  // 4. Time series traffic (daily or hourly in IST)
  const isSingleDay = timeRange === 'today' || timeRange === 'yesterday';
  const dateFormat = isSingleDay ? 'HH24:00' : 'YYYY-MM-DD';
  const timeSeries = await query<{
    period: string;
    visitors: string;
    pageviews: string;
    clicks: string;
    leads: string;
  }>(
    `
    SELECT
      TO_CHAR(e.created_at AT TIME ZONE 'Asia/Kolkata', '${dateFormat}') AS period,
      COUNT(DISTINCT e.visitor_id) AS visitors,
      COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END) AS pageviews,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS clicks,
      COUNT(CASE WHEN (e.event_type = 'form_submit') OR (e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_text ILIKE '%whatsapp%' OR e.element_target LIKE 'tel:%' OR e.element_text ILIKE '%call%')) THEN 1 END) AS leads
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY period
    ORDER BY period ASC
    `
  );

  // 5. Geographic Breakdown (Top Countries, Regions & Cities with Commercial Inquiries)
  const topCountries = await query<{
    country: string;
    country_code: string;
    visitor_count: string;
    inquiries_count: string;
  }>(
    `
    SELECT
      COALESCE(v.country, 'Unknown') AS country,
      COALESCE(v.country_code, 'UN') AS country_code,
      COUNT(DISTINCT v.visitor_id) AS visitor_count,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%') THEN e.id END) AS inquiries_count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY country, country_code
    ORDER BY visitor_count DESC
    LIMIT 25
    `
  );

  const topRegions = await query<{
    region: string;
    country: string;
    country_code: string;
    visitor_count: string;
    inquiries_count: string;
  }>(
    `
    SELECT
      COALESCE(v.region, 'Unknown') AS region,
      COALESCE(v.country, 'Unknown') AS country,
      COALESCE(v.country_code, 'UN') AS country_code,
      COUNT(DISTINCT v.visitor_id) AS visitor_count,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%') THEN e.id END) AS inquiries_count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond} AND v.region IS NOT NULL AND v.region != ''
    GROUP BY region, country, country_code
    ORDER BY visitor_count DESC
    LIMIT 25
    `
  );

  const topCities = await query<{
    city: string;
    region: string;
    country: string;
    country_code: string;
    visitor_count: string;
    inquiries_count: string;
  }>(
    `
    SELECT
      COALESCE(v.city, 'Unknown') AS city,
      COALESCE(v.region, '') AS region,
      COALESCE(v.country, 'Unknown') AS country,
      COALESCE(v.country_code, 'UN') AS country_code,
      COUNT(DISTINCT v.visitor_id) AS visitor_count,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%') THEN e.id END) AS inquiries_count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY city, region, country, country_code
    ORDER BY visitor_count DESC
    LIMIT 35
    `
  );

  // 6. Device, Browser, OS Distribution
  const devices = await query<{ device_type: string; count: string }>(
    `
    SELECT
      COALESCE(device_type, 'desktop') AS device_type,
      COUNT(DISTINCT v.visitor_id) AS count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY device_type
    ORDER BY count DESC
    `
  );

  const browsers = await query<{ browser: string; count: string }>(
    `
    SELECT
      COALESCE(browser, 'Other') AS browser,
      COUNT(DISTINCT v.visitor_id) AS count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 6
    `
  );

  const operatingSystems = await query<{ os: string; count: string }>(
    `
    SELECT
      COALESCE(os, 'Other') AS os,
      COUNT(DISTINCT v.visitor_id) AS count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY os
    ORDER BY count DESC
    LIMIT 6
    `
  );

  // 7. Top Referrers & UTM Sources
  const topReferrers = await query<{ referrer: string; count: string }>(
    `
    SELECT
      COALESCE(s.referrer, 'Direct / None') AS referrer,
      COUNT(*) AS count
    FROM analytics_sessions s
    WHERE ${sessionTimeCond}
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 20
    `
  );

  const utmCampaigns = await query<{ utm_source: string; utm_medium: string; utm_campaign: string; count: string }>(
    `
    SELECT
      COALESCE(s.utm_source, '') AS utm_source,
      COALESCE(s.utm_medium, '') AS utm_medium,
      COALESCE(s.utm_campaign, '') AS utm_campaign,
      COUNT(*) AS count
    FROM analytics_sessions s
    WHERE ${sessionTimeCond} AND (s.utm_source IS NOT NULL OR s.utm_campaign IS NOT NULL)
    GROUP BY utm_source, utm_medium, utm_campaign
    ORDER BY count DESC
    LIMIT 10
    `
  );

  // 8. Unsatisfied Demand: Zero-Result Searches & Top Search Queries
  const searchQueries = await query<{ query_text: string; zero_results: boolean; count: string }>(
    `
    SELECT
      (metadata->>'query') AS query_text,
      COALESCE((metadata->>'zeroResults')::boolean, false) AS zero_results,
      COUNT(*) AS count
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'search' AND (metadata->>'query') IS NOT NULL AND ${eventTimeCond}
    GROUP BY query_text, zero_results
    ORDER BY count DESC
    LIMIT 30
    `
  );

  const totalSearches = searchQueries.reduce((acc, q) => acc + (parseInt(q.count, 10) || 0), 0);
  const zeroResultsSearches = searchQueries
    .filter((q) => q.zero_results)
    .reduce((acc, q) => acc + (parseInt(q.count, 10) || 0), 0);
  const catalogGapRate = totalSearches > 0 ? Math.round((zeroResultsSearches / totalSearches) * 100) : 0;
  const topSearchQuery = searchQueries[0]?.query_text || 'None';

  const searchSummary = {
    totalSearches,
    zeroResultsSearches,
    catalogGapRate,
    topSearchQuery,
  };

  // 9. High-Intent Copy Actions (Part numbers, Phone numbers copied to clipboard)
  const topCopiedItems = await query<{ copied_text: string; item_type: string; count: string }>(
    `
    SELECT
      (metadata->>'copiedText') AS copied_text,
      COALESCE((metadata->>'itemType'), 'part_number') AS item_type,
      COUNT(*) AS count
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'copy' AND (metadata->>'copiedText') IS NOT NULL AND ${eventTimeCond}
    GROUP BY copied_text, item_type
    ORDER BY count DESC
    LIMIT 15
    `
  );

  // 10. Section Attention & Dwell Time (What users read vs skip)
  const sectionAttention = await query<{
    section_id: string;
    page_path: string;
    views: string;
    avg_dwell_seconds: string;
  }>(
    `
    SELECT
      (metadata->>'sectionId') AS section_id,
      page_path,
      COUNT(*) AS views,
      ROUND(AVG(COALESCE((metadata->>'dwellSeconds')::numeric, 0)), 1) AS avg_dwell_seconds
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'section_view' AND (metadata->>'sectionId') IS NOT NULL AND ${eventTimeCond}
    GROUP BY section_id, page_path
    ORDER BY views DESC
    LIMIT 16
    `
  );

  // 11. Top Pages Visited
  const topPages = await query<{ page_path: string; page_title: string; views: string }>(
    `
    SELECT
      page_path,
      COALESCE(page_title, page_path) AS page_title,
      COUNT(*) AS views
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type = 'pageview' AND ${eventTimeCond}
    GROUP BY page_path, page_title
    ORDER BY views DESC
    LIMIT 15
    `
  );

  // 12. Dwell Time Buckets (Session Attention Distribution)
  const dwellBucketsRes = await query<{
    bounce_under_10s: string;
    skim_10_60s: string;
    engaged_1_5m: string;
    deep_5_15m: string;
    zombie_over_15m: string;
  }>(
    `
    SELECT
      COUNT(CASE WHEN duration_seconds < 10 THEN 1 END) AS bounce_under_10s,
      COUNT(CASE WHEN duration_seconds >= 10 AND duration_seconds < 60 THEN 1 END) AS skim_10_60s,
      COUNT(CASE WHEN duration_seconds >= 60 AND duration_seconds < 300 THEN 1 END) AS engaged_1_5m,
      COUNT(CASE WHEN duration_seconds >= 300 AND duration_seconds < 900 THEN 1 END) AS deep_5_15m,
      COUNT(CASE WHEN duration_seconds >= 900 THEN 1 END) AS zombie_over_15m
    FROM analytics_sessions s
    WHERE ${sessionTimeCond}
    `
  );
  const dwellBuckets = dwellBucketsRes[0] || {
    bounce_under_10s: '0',
    skim_10_60s: '0',
    engaged_1_5m: '0',
    deep_5_15m: '0',
    zombie_over_15m: '0',
  };

  // 13. Page-Level Dwell & Reading Depth
  const pageDwellStats = await query<{
    page_path: string;
    page_title: string;
    sessions: string;
    views: string;
    avg_dwell_seconds: string;
  }>(
    `
    SELECT
      e.page_path,
      COALESCE(MAX(e.page_title), e.page_path) AS page_title,
      COUNT(DISTINCT e.session_id) AS sessions,
      COUNT(*) AS views,
      ROUND(AVG(COALESCE((e.metadata->>'dwellSeconds')::numeric, 0)), 1) AS avg_dwell_seconds
    FROM analytics_events e
    LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
    WHERE e.event_type IN ('pageview', 'section_view') AND ${eventTimeCond}
    GROUP BY e.page_path
    ORDER BY views DESC
    LIMIT 20
    `
  );

  // 14. Competitor & Nuisance Surveillance (Abnormal Dwell, Part Copies & High-Velocity Sessions)
  const suspiciousDwellRaw = await query<{
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
    GROUP BY s.session_id, s.visitor_id, s.duration_seconds, s.entry_page, s.exit_page, s.device_type, s.city, s.country, v.ip_address, v.identified_name, v.identified_contact
    HAVING (s.duration_seconds >= 600 AND COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) = 0)
       OR (COUNT(DISTINCT e.page_path) >= 3 AND s.duration_seconds < 25)
       OR (COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END) >= 3)
       OR (s.duration_seconds >= 1200)
    ORDER BY session_time DESC
    LIMIT 25
    `
  );

  const flags = await getFlags();
  const flagMap = new Map<string, FlagRecord>();
  flags.forEach((f) => {
    flagMap.set(f.target_value.toLowerCase(), f);
  });

  const suspiciousDwellSessions = suspiciousDwellRaw.map((s) => {
    const duration = Number(s.duration_seconds) || 0;
    const pages = Number(s.distinct_pages) || 0;
    const clicks = Number(s.clicks_count) || 0;
    const copies = Number(s.copies_count) || 0;
    const partCopies = Number(s.part_copies_count) || copies;
    const leadActions = Number(s.lead_actions) || 0;
    const isBhuvanTest =
      String(s.identified_contact || '').replace(/\D/g, '').includes('9830164610') ||
      String(s.identified_name || '').toLowerCase().includes('bhuvan');

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
    topClicks,
    timeSeries,
    topCountries,
    topCities,
    topRegions,
    devices,
    browsers,
    operatingSystems,
    topReferrers,
    utmCampaigns,
    searchQueries,
    searchSummary,
    topCopiedItems,
    sectionAttention,
    topPages,
    dwellBuckets,
    pageDwellStats,
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
  timeRange?: TimeRange;
}) {
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;
  const params: any[] = [];
  const whereClauses: string[] = [
    "e.page_path NOT LIKE '/admin%'",
    "(e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%')",
    "(v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))"
  ];

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
  views: number;
  conversion_rate: number;
  last_enquired_at: string | null;
  status: 'active' | 'zero_enquiries';
}

export async function getProductEnquiryPerformance(timeRange: TimeRange = 'all') {
  const timeCond = getTimeCondition(timeRange, 'created_at');
  const allProducts = getProducts();

  // 1. Fetch enquire clicks grouped by product
  const clickRows = await query<{
    product_title: string;
    part_number: string;
    product_slug: string;
    page_path: string;
    clicks: string;
    last_enquiry: string;
  }>(
    `
    SELECT
      COALESCE(metadata->>'productTitle', '') AS product_title,
      COALESCE(metadata->>'partNumber', '') AS part_number,
      COALESCE(metadata->>'productSlug', '') AS product_slug,
      COALESCE(page_path, '') AS page_path,
      COUNT(*) AS clicks,
      MAX(created_at) AS last_enquiry
    FROM analytics_events
    WHERE (
        (event_type = 'click' AND (
          element_target LIKE '%wa.me%'
          OR element_text ILIKE '%whatsapp%'
          OR element_target LIKE 'tel:%'
          OR element_text ILIKE '%call%'
          OR metadata->>'trackLabel' LIKE '%enquire%'
          OR element_text ILIKE '%enquire%'
          OR element_text ILIKE '%quote%'
        ))
        OR (event_type = 'form_submit')
      )
      AND ${timeCond}
    GROUP BY product_title, part_number, product_slug, page_path
    `
  );

  // 2. Fetch product detail views
  const viewRows = await query<{ page_path: string; views: string }>(
    `
    SELECT page_path, COUNT(*) AS views
    FROM analytics_events
    WHERE event_type = 'pageview' AND page_path LIKE '/products/%/%' AND ${timeCond}
    GROUP BY page_path
    `
  );

  const viewsMap = new Map<string, number>();
  viewRows.forEach((row) => {
    // Normalise path
    viewsMap.set(row.page_path.toLowerCase(), parseInt(row.views || '0', 10));
  });

  // 3. Map all catalog products against analytics records
  const result: ProductEnquiryStat[] = allProducts.map((p) => {
    const canonicalSlug = getProductUrlSlug(p).toLowerCase();
    const catSlug = (p.category === 'Motor Grader' || p.category === 'Grader' ? 'grader' : p.category.toLowerCase()).trim();
    const productPath = `/products/${catSlug}/${canonicalSlug}`.toLowerCase();
    const views = viewsMap.get(productPath) || 0;

    // Match clicks by exact slug, page path, exact title, or exact part number.
    // Strictly avoid loose .includes() so aggregated items (like "PIN" or "FILTER")
    // do not falsely credit specialized products (like "Pin Assy", "Centre Pin", etc.)
    const pTitle = p.title.toLowerCase().trim();
    const pPartClean = (p.part_number || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const pPartsList = (p.part_number || '')
      .split(/[\/,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const matchedClicks = clickRows.filter((c) => {
      const cSlug = (c.product_slug || '').toLowerCase().trim();
      const cTitle = (c.product_title || '').toLowerCase().trim();
      const cPart = (c.part_number || '').toLowerCase().trim();
      const cPath = (c.page_path || '').toLowerCase().trim();

      // 1. Exact Canonical Slug or Raw Slug match (Highest confidence)
      if (cSlug && (cSlug === canonicalSlug || cSlug === p.slug.toLowerCase())) {
        return true;
      }

      // 2. Exact Page Path match (Click occurred directly on this product detail page)
      if (cPath) {
        if (cPath === productPath) return true;
        if (cPath === `/products/${canonicalSlug}`) return true;
        if (cPath.endsWith(`/${canonicalSlug}`)) return true;
      }

      // 3. Exact Title match (Strict exact string comparison)
      // Generic "PIN" only matches the "PIN" product, NOT "Pin Assy" or "Center Pin"
      if (cTitle && cTitle === pTitle) {
        return true;
      }

      // 4. Exact Part Number match
      if (cPart && p.part_number) {
        // Direct string match
        if (pPartsList.includes(cPart)) return true;

        // Cleaned alphanumeric match for formatted part numbers (e.g. 8101-6289 vs 81016289)
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

    const clicks = matchedClicks.reduce((sum, c) => sum + parseInt(c.clicks, 10), 0);
    const sortedEnquiries = matchedClicks.map((c) => c.last_enquiry).filter(Boolean).sort().reverse();
    const lastEnquiry = sortedEnquiries[0] || null;
    const conversion = views > 0 ? Math.round((clicks / views) * 100) : clicks > 0 ? 100 : 0;

    return {
      slug: canonicalSlug,
      title: p.title,
      category: p.category,
      part_number: p.part_number || '',
      brand: Array.isArray(p.brand) ? p.brand.join(', ') : p.brand || '',
      enquire_clicks: clicks,
      views,
      conversion_rate: conversion,
      last_enquired_at: lastEnquiry,
      status: clicks > 0 ? 'active' : 'zero_enquiries',
    };
  });

  // Sort by enquire clicks DESC, then views DESC
  result.sort((a, b) => b.enquire_clicks - a.enquire_clicks || b.views - a.views);

  const productsWithEnquiries = result.filter((p) => p.enquire_clicks > 0);
  const productsZeroEnquiries = result.filter((p) => p.enquire_clicks === 0);
  const highDemandCount = result.filter((p) => p.enquire_clicks >= 2).length;
  const opportunityCount = result.filter((p) => p.views > 0 && p.enquire_clicks === 0).length;
  const totalEnquireClicks = result.reduce((sum, p) => sum + p.enquire_clicks, 0);
  const totalViews = result.reduce((sum, p) => sum + p.views, 0);

  return {
    summary: {
      totalCatalogProducts: allProducts.length,
      withEnquiriesCount: productsWithEnquiries.length,
      zeroEnquiriesCount: productsZeroEnquiries.length,
      highDemandCount,
      opportunityCount,
      totalEnquireClicks,
      totalViews,
    },
    products: result,
  };
}
