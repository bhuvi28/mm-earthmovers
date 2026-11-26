import type {
  AuditLogRecord,
  CatalogHealthGapProduct,
  CatalogHealthGaps,
  CohortRetentionStats,
  ExportFunnelStats,
  FormFunnelRow,
  FormFunnelStats,
  ModelHubRow,
  ModelHubStats,
  OpsHealthStats,
  PlacementAttributionRow,
  ProductEngagementStats,
  SearchFunnelStats,
  TimeRange,
  VisitorsListResult,
  VisitorsListSummaryCounts,
} from '@/lib/analytics/stats';

export type {
  AuditLogRecord,
  CatalogHealthGapProduct,
  CatalogHealthGaps,
  CohortRetentionStats,
  ExportFunnelStats,
  FormFunnelRow,
  FormFunnelStats,
  ModelHubRow,
  ModelHubStats,
  OpsHealthStats,
  PlacementAttributionRow,
  ProductEngagementStats,
  SearchFunnelStats,
  TimeRange,
  VisitorsListResult,
  VisitorsListSummaryCounts,
};

export type AdminTabId =
  | 'stream'
  | 'products'
  | 'audience'
  | 'demand'
  | 'visitors'
  | 'restrictions'
  | 'ops';

export type ProductSortField =
  | 'clicks'
  | 'views'
  | 'conversion'
  | 'title'
  | 'category'
  | 'part_number'
  | 'last_enquired';

export interface DashboardStats {
  kpis: {
    activeUsersNow: number;
    totalVisitors: number;
    totalSessions: number;
    totalPageviews: number;
    totalClicks: number;
    avgDurationSeconds: number;
    whatsappClicks: number;
    phoneCalls: number;
    formLeads: number;
    persistedFormSubmissions?: number;
    rageClicks: number;
    deadClicks: number;
  };
  topClicks: Array<{
    element_text: string;
    element_target: string;
    element_tag: string;
    click_count: string;
    page_path: string;
  }>;
  placementAttribution?: PlacementAttributionRow[];
  searchFunnelStats?: SearchFunnelStats;
  formFunnelStats?: FormFunnelStats;
  productEngagementStats?: ProductEngagementStats;
  exportFunnelStats?: ExportFunnelStats;
  modelHubStats?: ModelHubStats;
  cohortRetentionStats?: CohortRetentionStats;
  timeSeries: Array<{
    period: string;
    visitors: string;
    pageviews: string;
    clicks: string;
    leads?: string;
  }>;
  topCountries: Array<{
    country: string;
    country_code: string;
    visitor_count: string;
    inquiries_count?: string;
  }>;
  topRegions?: Array<{
    region: string;
    country: string;
    country_code?: string;
    visitor_count: string;
    inquiries_count?: string;
  }>;
  topCities: Array<{
    city: string;
    region?: string;
    country: string;
    country_code?: string;
    visitor_count: string;
    inquiries_count?: string;
  }>;
  devices: Array<{ device_type: string; count: string }>;
  browsers: Array<{ browser: string; count: string }>;
  operatingSystems?: Array<{ os: string; count: string }>;
  topReferrers: Array<{ referrer: string; count: string }>;
  utmCampaigns?: Array<{
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    count: string;
  }>;
  searchQueries: Array<{ query_text: string; zero_results: boolean; count: string }>;
  topCopiedItems: Array<{ copied_text: string; item_type: string; count: string }>;
  sectionAttention: Array<{
    section_id: string;
    page_path: string;
    views: string;
    avg_dwell_seconds: string;
  }>;
  topPages: Array<{ page_path: string; page_title: string; views: string }>;
  searchSummary?: {
    totalSearches: number;
    zeroResultsSearches: number;
    catalogGapRate: number;
    topSearchQuery: string;
  };
  dwellBuckets?: {
    bounce_under_10s: string;
    skim_10_60s: string;
    engaged_1_5m: string;
    deep_5_15m: string;
    zombie_over_15m: string;
  };
  pageDwellStats?: Array<{
    page_path: string;
    page_title: string;
    sessions: string;
    views: string;
    avg_dwell_seconds: string;
  }>;
  suspiciousDwellSessions?: Array<{
    session_id: string;
    visitor_id: string;
    duration_seconds: number;
    entry_page: string;
    exit_page: string;
    device_type: string;
    city: string;
    country: string;
    ip_address: string | null;
    event_count: string;
    distinct_pages: string;
    clicks_count: string;
    copies_count: string;
    lead_actions: string;
    session_time: string;
    identified_name?: string | null;
    identified_contact?: string | null;
    part_copies_count?: string;
    heuristic: 'rapid_scraper' | 'lurker_zombie' | 'competitor_recon' | 'deep_evaluator';
    flag?: {
      id: number;
      flag_type: string;
      note?: string;
    };
  }>;
  flags?: Array<{
    id: number;
    target_type: 'visitor_id' | 'ip';
    target_value: string;
    flag_type: string;
    note: string | null;
    created_at: string;
  }>;
}

export interface AnalyticsEvent {
  id: string;
  visitor_id: string;
  session_id: string;
  event_type: string;
  page_path: string;
  page_title: string;
  element_text: string;
  element_target: string;
  element_tag: string;
  metadata: any;
  created_at: string;
  country: string;
  city: string;
  region?: string;
  device_type: string;
  browser: string;
  os?: string;
  identified_name: string;
  identified_contact: string;
  ip_address?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  is_return_day?: boolean;
  is_restricted?: boolean;
}

export interface RestrictionRecord {
  id: number;
  type: 'ip' | 'visitor_id';
  value: string;
  note: string | null;
  created_at: string;
}

export interface JourneySession {
  sessionId: string;
  sessionNumber: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  events: AnalyticsEvent[];
  hasRfq: boolean;
  hasCopy: boolean;
  hasRageClick: boolean;
  distinctPages: string[];
  hasDifferentIp: boolean;
}

export interface JourneyDayGroup {
  dateKey: string;
  dateLabel: string;
  dayNumber: number;
  isInitialDay: boolean;
  isReturnDay: boolean;
  daysSinceLastVisit: number;
  daysSinceInitialVisit: number;
  eventsCount: number;
  sessions: JourneySession[];
  rfqCount: number;
  copyCount: number;
  differentIpCount: number;
  uniqueVisitorIds: string[];
}

/**
 * Preserves legacy `enquire_clicks` alongside P1/P2 detail/listing breakdowns (`BUG-05`).
 */
export interface ProductEnquiryStat {
  slug: string;
  title: string;
  category: string;
  part_number: string;
  brand: string;
  enquire_clicks: number;
  detail_enquiries?: number;
  listing_enquiries?: number;
  total_enquiries?: number;
  views: number;
  view_sessions?: number;
  detail_enquiry_sessions?: number;
  conversion_rate: number;
  last_enquired_at: string | null;
  status: 'active' | 'zero_enquiries';
}

export interface ProductEnquiryData {
  summary: {
    totalCatalogProducts: number;
    withEnquiriesCount: number;
    zeroEnquiriesCount: number;
    highDemandCount?: number;
    opportunityCount?: number;
    totalEnquireClicks: number;
    totalDetailEnquiries?: number;
    totalListingEnquiries?: number;
    totalViews?: number;
  };
  products: ProductEnquiryStat[];
  catalogHealthGaps?: CatalogHealthGaps;
}

export interface VisitorDirectoryItem {
  visitor_id: string;
  ip_address: string | null;
  first_seen_at: string;
  last_seen_at: string;
  total_sessions: number;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  identified_name: string | null;
  identified_contact: string | null;
  is_restricted: boolean;
  is_flagged?: boolean;
  flag_type?: string | null;
  total_events: number | string;
  total_clicks: number | string;
  total_copies?: number | string;
  whatsapp_clicks: number | string;
  distinct_days_count?: number | string;
  last_page_viewed?: string | null;
  last_rfq_part?: string | null;
}

export type VisitorSegmentFilter = 'all' | 'leads' | 'rfq' | 'repeat' | 'flagged' | 'restricted';
export type VisitorDeviceFilter = 'all' | 'mobile' | 'desktop';

export type ProductFilterPreset = 'all' | 'active' | 'high_demand' | 'opportunity' | 'zero';
export type ProductViewMode = 'auto' | 'table' | 'cards';
export type JourneyEventFilter = 'all' | 'rfq' | 'copy' | 'product' | 'click';
export type ChartMetricKey = 'clicks' | 'pageviews' | 'visitors' | 'leads';
export type GeoTab = 'all' | 'india' | 'international';
export type GeoLevel = 'cities' | 'regions' | 'countries';
export type SearchTab = 'all' | 'zero' | 'stock' | 'parts';
export type DwellView = 'pages' | 'sections';
export type SentinelFilter = 'all' | 'flagged' | 'scrapers' | 'lurkers';

export interface FormattedTimeSeriesPoint {
  period: string;
  label: string;
  visitors: number;
  pageviews: number;
  clicks: number;
  leads: number;
  total: number;
}

export interface RestrictionActionFeedback {
  type: 'success' | 'error';
  text: string;
}
