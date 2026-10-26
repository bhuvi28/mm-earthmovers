import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { query } from './db';

export type TimeRange = 'today' | '7d' | '30d' | 'all';

function getTimeCondition(timeRange: TimeRange, column: string = 'created_at'): string {
  switch (timeRange) {
    case 'today':
      return `${column} >= CURRENT_DATE`;
    case '7d':
      return `${column} >= NOW() - INTERVAL '7 days'`;
    case '30d':
      return `${column} >= NOW() - INTERVAL '30 days'`;
    case 'all':
    default:
      return '1=1';
  }
}

export async function getDashboardStats(timeRange: TimeRange = '7d') {
  const baseAdminExclude = "e.page_path NOT LIKE '/admin%' AND (e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%')";
  const eventTimeCond = `(${getTimeCondition(timeRange, 'e.created_at')}) AND ${baseAdminExclude}`;
  const sessionTimeCond = `(${getTimeCondition(timeRange, 's.started_at')}) AND (s.landing_page IS NULL OR s.landing_page NOT LIKE '/admin%')`;
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
    WHERE e.event_type = 'click' AND ${eventTimeCond}
    GROUP BY element_text, element_target, element_tag, page_path
    ORDER BY click_count DESC
    LIMIT 15
    `
  );

  // 4. Time series traffic (daily or hourly)
  const isToday = timeRange === 'today';
  const dateFormat = isToday ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';
  const timeSeries = await query<{
    period: string;
    visitors: string;
    pageviews: string;
    clicks: string;
  }>(
    `
    SELECT
      TO_CHAR(e.created_at, '${dateFormat}') AS period,
      COUNT(DISTINCT e.visitor_id) AS visitors,
      COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END) AS pageviews,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS clicks
    FROM analytics_events e
    WHERE ${eventTimeCond}
    GROUP BY period
    ORDER BY period ASC
    `
  );

  // 5. Geographic Breakdown (Top Countries & Cities)
  const topCountries = await query<{ country: string; country_code: string; visitor_count: string }>(
    `
    SELECT
      COALESCE(v.country, 'Unknown') AS country,
      COALESCE(v.country_code, 'UN') AS country_code,
      COUNT(DISTINCT v.visitor_id) AS visitor_count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY country, country_code
    ORDER BY visitor_count DESC
    LIMIT 10
    `
  );

  const topCities = await query<{ city: string; country: string; visitor_count: string }>(
    `
    SELECT
      COALESCE(v.city, 'Unknown') AS city,
      COALESCE(v.country, 'Unknown') AS country,
      COUNT(DISTINCT v.visitor_id) AS visitor_count
    FROM analytics_visitors v
    JOIN analytics_events e ON v.visitor_id = e.visitor_id
    WHERE ${eventTimeCond}
    GROUP BY city, country
    ORDER BY visitor_count DESC
    LIMIT 10
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
    LIMIT 5
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
    WHERE e.event_type = 'search' AND (metadata->>'query') IS NOT NULL AND ${eventTimeCond}
    GROUP BY query_text, zero_results
    ORDER BY count DESC
    LIMIT 15
    `
  );

  // 9. High-Intent Copy Actions (Part numbers, Phone numbers copied to clipboard)
  const topCopiedItems = await query<{ copied_text: string; item_type: string; count: string }>(
    `
    SELECT
      (metadata->>'copiedText') AS copied_text,
      COALESCE((metadata->>'itemType'), 'part_number') AS item_type,
      COUNT(*) AS count
    FROM analytics_events e
    WHERE e.event_type = 'copy' AND (metadata->>'copiedText') IS NOT NULL AND ${eventTimeCond}
    GROUP BY copied_text, item_type
    ORDER BY count DESC
    LIMIT 10
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
    WHERE e.event_type = 'section_view' AND (metadata->>'sectionId') IS NOT NULL AND ${eventTimeCond}
    GROUP BY section_id, page_path
    ORDER BY views DESC
    LIMIT 12
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
    WHERE e.event_type = 'pageview' AND ${eventTimeCond}
    GROUP BY page_path, page_title
    ORDER BY views DESC
    LIMIT 10
    `
  );

  return {
    kpis,
    topClicks,
    timeSeries,
    topCountries,
    topCities,
    devices,
    browsers,
    topReferrers,
    searchQueries,
    topCopiedItems,
    sectionAttention,
    topPages,
  };
}

export async function getRecentEvents(options: {
  limit?: number;
  offset?: number;
  visitorId?: string;
  eventType?: string;
}) {
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;
  const params: any[] = [];
  const whereClauses: string[] = [
    "e.page_path NOT LIKE '/admin%'",
    "(e.element_target IS NULL OR e.element_target NOT LIKE '%/admin%')"
  ];

  if (options.visitorId) {
    params.push(options.visitorId);
    whereClauses.push(`e.visitor_id = $${params.length}`);
  }

  if (options.eventType) {
    params.push(options.eventType);
    whereClauses.push(`e.event_type = $${params.length}`);
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
      v.device_type,
      v.browser,
      v.identified_name,
      v.identified_contact
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

export async function getVisitorsList(limit = 50, offset = 0) {
  const visitors = await query<any>(
    `
    SELECT
      v.visitor_id,
      v.first_seen_at,
      v.last_seen_at,
      v.total_sessions,
      v.country,
      v.country_code,
      v.city,
      v.device_type,
      v.browser,
      v.os,
      v.identified_name,
      v.identified_contact,
      COUNT(e.id) AS total_events,
      COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS total_clicks,
      COUNT(CASE WHEN e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_text ILIKE '%whatsapp%') THEN 1 END) AS whatsapp_clicks
    FROM analytics_visitors v
    LEFT JOIN analytics_events e ON v.visitor_id = e.visitor_id AND e.page_path NOT LIKE '/admin%'
    WHERE EXISTS (
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
    WHERE event_type = 'click'
      AND (
        element_target LIKE '%wa.me%'
        OR metadata->>'trackLabel' LIKE '%enquire%'
        OR element_text ILIKE '%enquire%'
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

    // Match clicks by slug, page_path, title, or part number
    const matchedClicks = clickRows.filter((c) => {
      const cSlug = (c.product_slug || '').toLowerCase().trim();
      const cTitle = (c.product_title || '').toLowerCase().trim();
      const cPart = (c.part_number || '').toLowerCase().trim();
      const cPath = (c.page_path || '').toLowerCase().trim();

      // 1. Direct Slug match
      if (cSlug && (cSlug === canonicalSlug || cSlug === p.slug.toLowerCase())) return true;
      // 2. Page Path match (e.g. click happened on product detail page)
      if (cPath && (cPath === productPath || cPath.endsWith('/' + canonicalSlug))) return true;
      // 3. Title match
      if (cTitle && (cTitle === p.title.toLowerCase().trim() || p.title.toLowerCase().includes(cTitle))) return true;
      // 4. Part Number match
      if (p.part_number && cPart && (p.part_number.toLowerCase().includes(cPart) || cPart.includes(p.part_number.toLowerCase()))) return true;
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
  const totalEnquireClicks = result.reduce((sum, p) => sum + p.enquire_clicks, 0);

  return {
    summary: {
      totalCatalogProducts: allProducts.length,
      withEnquiriesCount: productsWithEnquiries.length,
      zeroEnquiriesCount: productsZeroEnquiries.length,
      totalEnquireClicks,
    },
    products: result,
  };
}
