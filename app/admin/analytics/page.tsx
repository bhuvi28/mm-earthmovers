'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface DashboardStats {
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
  timeSeries: Array<{
    period: string;
    visitors: string;
    pageviews: string;
    clicks: string;
    leads?: string;
  }>;
  topCountries: Array<{ country: string; country_code: string; visitor_count: string; inquiries_count?: string }>;
  topRegions?: Array<{ region: string; country: string; country_code?: string; visitor_count: string; inquiries_count?: string }>;
  topCities: Array<{ city: string; region?: string; country: string; country_code?: string; visitor_count: string; inquiries_count?: string }>;
  devices: Array<{ device_type: string; count: string }>;
  browsers: Array<{ browser: string; count: string }>;
  operatingSystems?: Array<{ os: string; count: string }>;
  topReferrers: Array<{ referrer: string; count: string }>;
  utmCampaigns?: Array<{ utm_source: string; utm_medium: string; utm_campaign: string; count: string }>;
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

interface AnalyticsEvent {
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
  device_type: string;
  browser: string;
  identified_name: string;
  identified_contact: string;
  ip_address?: string;
  is_restricted?: boolean;
}

interface RestrictionRecord {
  id: number;
  type: 'ip' | 'visitor_id';
  value: string;
  note: string | null;
  created_at: string;
}

interface ProductEnquiryStat {
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

interface ProductEnquiryData {
  summary: {
    totalCatalogProducts: number;
    withEnquiriesCount: number;
    zeroEnquiriesCount: number;
    highDemandCount?: number;
    opportunityCount?: number;
    totalEnquireClicks: number;
    totalViews?: number;
  };
  products: ProductEnquiryStat[];
}

export type ProductSortField = 'clicks' | 'views' | 'conversion' | 'title' | 'category' | 'part_number' | 'last_enquired';

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
  last_page_viewed?: string | null;
  last_rfq_part?: string | null;
}

export default function AnalyticsDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [activeTab, setActiveTab] = useState<'stream' | 'products' | 'audience' | 'demand' | 'visitors' | 'restrictions'>('stream');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [productData, setProductData] = useState<ProductEnquiryData | null>(null);
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'high_demand' | 'opportunity' | 'zero'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productBrandFilter, setProductBrandFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [inspectedProduct, setInspectedProduct] = useState<ProductEnquiryStat | null>(null);
  const [copiedPartNumbersFeedback, setCopiedPartNumbersFeedback] = useState(false);
  const [geoSearch, setGeoSearch] = useState('');
  const [geoTab, setGeoTab] = useState<'all' | 'india' | 'international'>('all');
  const [geoLevel, setGeoLevel] = useState<'cities' | 'regions' | 'countries'>('cities');
  const [searchTab, setSearchTab] = useState<'all' | 'zero' | 'stock' | 'parts'>('all');
  const [searchQueryFilter, setSearchQueryFilter] = useState('');
  const [dwellView, setDwellView] = useState<'pages' | 'sections'>('pages');
  const [sentinelFilter, setSentinelFilter] = useState<'all' | 'flagged' | 'scrapers' | 'lurkers'>('all');
  const [flaggingInProgress, setFlaggingInProgress] = useState<string | null>(null);
  const [activeFlagFeedback, setActiveFlagFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [visitorJourney, setVisitorJourney] = useState<AnalyticsEvent[]>([]);
  const [isJourneyLoading, setIsJourneyLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Access & Restriction States
  const [restrictions, setRestrictions] = useState<RestrictionRecord[]>([]);
  const [newRestrictionInput, setNewRestrictionInput] = useState('');
  const [newRestrictionNote, setNewRestrictionNote] = useState('');
  const [newRestrictionType, setNewRestrictionType] = useState<'ip' | 'visitor_id'>('ip');
  const [isSubmittingRestriction, setIsSubmittingRestriction] = useState(false);
  const [restrictionActionFeedback, setRestrictionActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Visitor & Lead Directory States
  const [visitorsList, setVisitorsList] = useState<VisitorDirectoryItem[]>([]);
  const [isVisitorsLoading, setIsVisitorsLoading] = useState(false);
  const [visitorFilterTab, setVisitorFilterTab] = useState<'all' | 'leads' | 'rfq' | 'repeat' | 'flagged' | 'restricted'>('all');
  const [visitorSearchQuery, setVisitorSearchQuery] = useState('');
  const [visitorDeviceFilter, setVisitorDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorPageSize, setVisitorPageSize] = useState<number>(25);
  const [contactCopiedFeedback, setContactCopiedFeedback] = useState<string | null>(null);

  // Sorting & Pagination UX States
  const [sortField, setSortField] = useState<ProductSortField>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedPart, setCopiedPart] = useState<string | null>(null);

  // GSC Performance Chart UX States
  const [activeMetrics, setActiveMetrics] = useState<{
    clicks: boolean;
    pageviews: boolean;
    visitors: boolean;
    leads: boolean;
  }>({
    clicks: true,
    pageviews: true,
    visitors: true,
    leads: true,
  });

  const toggleMetric = (key: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount <= 1) {
        return prev; // keep at least one active
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const [chartType, setChartType] = useState<'spline' | 'bar'>('spline');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedPeriod, setPinnedPeriod] = useState<string | null>(null);

  useEffect(() => {
    setPinnedPeriod(null);
    setHoveredIndex(null);
  }, [timeRange]);

  // Check initial authentication
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'summary', range: 'today' }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', key: passcode }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid passcode. Please try again.');
      }
    } catch {
      setAuthError('Connection failed.');
    }
  };

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'summary', range: timeRange }),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setDashboardError(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setDashboardError(err.details || `Server returned status ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setDashboardError(err.message || 'Network connection failed');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, timeRange]);

  // Fetch Recent Events
  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'events', limit: 100, range: timeRange }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [isAuthenticated, timeRange]);

  // Fetch Product Enquiry Performance
  const fetchProductEnquiries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'catalog', range: timeRange }),
      });
      if (res.ok) {
        const data = await res.json();
        setProductData(data);
      }
    } catch (err) {
      console.error('Failed to load product enquiries:', err);
    }
  }, [isAuthenticated, timeRange]);

  // Fetch Restrictions
  const fetchRestrictions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'restrictions' }),
      });
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restrictions || []);
      }
    } catch (err) {
      console.error('Failed to load restrictions:', err);
    }
  }, [isAuthenticated]);

  // Fetch Full Visitor Directory
  const fetchVisitors = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsVisitorsLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'visitors', limit: 250, range: timeRange }),
      });
      if (res.ok) {
        const data = await res.json();
        setVisitorsList(data.visitors || []);
      }
    } catch (err) {
      console.error('Failed to load visitors directory:', err);
    } finally {
      setIsVisitorsLoading(false);
    }
  }, [isAuthenticated, timeRange]);

  const handleAddRestriction = async (customVal?: string, customType?: 'ip' | 'visitor_id', customNote?: string) => {
    const val = (customVal || newRestrictionInput).trim();
    if (!val) return;
    const type = customType || newRestrictionType;
    const note = customNote !== undefined ? customNote : newRestrictionNote;

    setIsSubmittingRestriction(true);
    setRestrictionActionFeedback(null);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_restriction',
          type,
          value: val,
          note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewRestrictionInput('');
        setNewRestrictionNote('');
        setRestrictionActionFeedback({ type: 'success', text: `Restricted ${type === 'ip' ? 'IP' : 'Visitor ID'}: ${val}` });
        fetchRestrictions();
        fetchEvents();
        fetchVisitors();
      } else {
        setRestrictionActionFeedback({ type: 'error', text: data.error || 'Failed to add restriction' });
      }
    } catch (err: any) {
      setRestrictionActionFeedback({ type: 'error', text: err?.message || 'Network error' });
    } finally {
      setIsSubmittingRestriction(false);
      setTimeout(() => setRestrictionActionFeedback(null), 4000);
    }
  };

  const handleRemoveRestriction = async (identifier: string | number) => {
    setRestrictionActionFeedback(null);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_restriction',
          id: typeof identifier === 'number' ? identifier : undefined,
          value: typeof identifier === 'string' ? identifier : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRestrictionActionFeedback({ type: 'success', text: `Restriction removed successfully.` });
        fetchRestrictions();
        fetchEvents();
        fetchVisitors();
      }
    } catch (err) {
      console.error('Failed to remove restriction:', err);
    } finally {
      setTimeout(() => setRestrictionActionFeedback(null), 4000);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchEvents();
      fetchProductEnquiries();
      fetchRestrictions();
      fetchVisitors();
    }
  }, [isAuthenticated, fetchStats, fetchEvents, fetchProductEnquiries, fetchRestrictions, fetchVisitors]);

  // Auto-refresh interval (every 15 seconds)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchEvents();
      fetchProductEnquiries();
      fetchRestrictions();
      fetchVisitors();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchStats, fetchEvents, fetchProductEnquiries, fetchRestrictions, fetchVisitors]);

  // Fetch Visitor Journey
  const openVisitorJourney = async (visitorId: string) => {
    setSelectedVisitorId(visitorId);
    setIsJourneyLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'events', visitorId, limit: 100 }),
      });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.events || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setVisitorJourney(sorted);
      }
    } catch (err) {
      console.error('Failed to load journey:', err);
    } finally {
      setIsJourneyLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setIsAuthenticated(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatIST = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        ...options,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
    const hrs = Math.floor(mins / 60);
    const remM = mins % 60;
    return `${hrs}h ${remM > 0 ? `${remM}m` : ''}`.trim();
  };

  // Country flag emoji helper
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode === 'UN' || countryCode === 'Unknown') return '🌐';
    const code = countryCode.toUpperCase();
    if (code === 'IN') return '🇮🇳';
    if (code === 'US') return '🇺🇸';
    if (code === 'GB' || code === 'UK') return '🇬🇧';
    if (code === 'AE') return '🇦🇪';
    if (code === 'SG') return '🇸🇬';
    if (code === 'CA') return '🇨🇦';
    if (code === 'AU') return '🇦🇺';
    if (code === 'DE') return '🇩🇪';
    if (code === 'MY') return '🇲🇾';
    if (code === 'SA') return '🇸🇦';
    try {
      const codePoints = code.split('').map((c) => 127397 + c.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🌐';
    }
  };

  // Channel Category Classifier
  const getChannelCategory = (referrer: string) => {
    if (!referrer || referrer === 'Direct / None' || referrer === '-') {
      return { name: 'Direct / Bookmarks', icon: '🔗', color: '#64748b', bg: 'bg-slate-100 text-slate-700' };
    }
    const r = referrer.toLowerCase();
    if (r.includes('google') || r.includes('bing') || r.includes('yahoo') || r.includes('duckduckgo')) {
      return { name: 'Organic Search', icon: '🔍', color: '#2563eb', bg: 'bg-blue-50 text-blue-700' };
    }
    if (r.includes('whatsapp') || r.includes('wa.me')) {
      return { name: 'WhatsApp / Chat', icon: '💬', color: '#059669', bg: 'bg-emerald-50 text-emerald-700' };
    }
    if (r.includes('facebook') || r.includes('instagram') || r.includes('linkedin') || r.includes('twitter') || r.includes('youtube') || r.includes('t.co')) {
      return { name: 'Social Media', icon: '📱', color: '#7c3aed', bg: 'bg-purple-50 text-purple-700' };
    }
    return { name: 'Referral / External', icon: '🌐', color: '#d97706', bg: 'bg-amber-50 text-amber-800' };
  };

  // Industrial Machinery Cluster Classifier (Mining, Quarrying, Infra & OEMs)
  const getIndustrialClusterTag = (cityName: string) => {
    if (!cityName) return null;
    const c = cityName.toLowerCase();
    if (
      c.includes('dhanbad') ||
      c.includes('raipur') ||
      c.includes('bilaspur') ||
      c.includes('ranchi') ||
      c.includes('nagpur') ||
      c.includes('chandrapur') ||
      c.includes('angul') ||
      c.includes('asansol')
    ) {
      return { name: 'Mining Cluster', icon: '⛏️', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (
      c.includes('pune') ||
      c.includes('mumbai') ||
      c.includes('bengaluru') ||
      c.includes('hyderabad') ||
      c.includes('delhi') ||
      c.includes('ahmedabad') ||
      c.includes('surat')
    ) {
      return { name: 'Infra & Fleets', icon: '🏗️', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (
      c.includes('hosur') ||
      c.includes('chennai') ||
      c.includes('coimbatore') ||
      c.includes('jamshedpur') ||
      c.includes('salem') ||
      c.includes('namakkal')
    ) {
      return { name: 'OEM & Quarry', icon: '🏭', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return null;
  };

  // Export Geo & Sources CSV
  const handleExportGeoCSV = () => {
    if (!stats) return;
    const headers = ['Category', 'Name', 'Region / State', 'Country', 'Visitors', 'Share %', 'Buyer Inquiries (RFQs)'];
    const totalVisitors = Number(stats.kpis.totalVisitors) || 1;
    const rows: any[] = [];

    stats.topCountries?.forEach((c) => {
      const count = parseInt(c.visitor_count, 10) || 0;
      rows.push(['Country', `"${c.country}"`, '-', `"${c.country_code}"`, count, `${Math.round((count / totalVisitors) * 100)}%`, c.inquiries_count || 0]);
    });
    stats.topRegions?.forEach((r) => {
      const count = parseInt(r.visitor_count, 10) || 0;
      rows.push(['Region / State', `"${r.region}"`, `"${r.region}"`, `"${r.country}"`, count, `${Math.round((count / totalVisitors) * 100)}%`, r.inquiries_count || 0]);
    });
    stats.topCities?.forEach((c) => {
      const count = parseInt(c.visitor_count, 10) || 0;
      rows.push(['City', `"${c.city}"`, `"${c.region || ''}"`, `"${c.country}"`, count, `${Math.round((count / totalVisitors) * 100)}%`, c.inquiries_count || 0]);
    });
    stats.topReferrers?.forEach((r) => {
      const count = parseInt(r.count, 10) || 0;
      rows.push(['Source', `"${r.referrer}"`, '-', '-', count, '-', '-']);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mm-earthmovers-geo-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Search Demand CSV
  const handleExportSearchCSV = () => {
    if (!stats || !stats.searchQueries) return;
    const headers = ['Query', 'Status', 'Search Count'];
    const rows = stats.searchQueries.map((s) => [
      `"${s.query_text.replace(/"/g, '""')}"`,
      s.zero_results ? 'Zero Results (Catalog Gap)' : 'In Stock',
      s.count,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mm-earthmovers-search-demand-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle Flag on Visitor or IP (Instant Behavioral Flagging)
  const handleToggleFlag = async (
    targetType: 'visitor_id' | 'ip',
    targetValue: string,
    flagType: string,
    note?: string
  ) => {
    setFlaggingInProgress(targetValue);
    try {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({
          action: 'add',
          targetType,
          targetValue,
          flagType,
          note: note || `Flagged from Dwell Sentinel as ${flagType}`,
        }),
      });
      if (res.ok) {
        setActiveFlagFeedback(`Flagged ${targetValue.slice(0, 8)}... as ${flagType.toUpperCase()}`);
        setTimeout(() => setActiveFlagFeedback(null), 3500);
        await fetchStats();
        await fetchVisitors();
      }
    } catch (e) {
      console.error('Failed to toggle flag:', e);
    } finally {
      setFlaggingInProgress(null);
    }
  };

  const handleRemoveFlag = async (targetValue: string, flagType?: string) => {
    setFlaggingInProgress(targetValue);
    try {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({
          action: 'remove',
          targetValue,
          flagType,
        }),
      });
      if (res.ok) {
        setActiveFlagFeedback(`Removed flag from ${targetValue.slice(0, 8)}...`);
        setTimeout(() => setActiveFlagFeedback(null), 3000);
        await fetchStats();
        await fetchVisitors();
      }
    } catch (e) {
      console.error('Failed to remove flag:', e);
    } finally {
      setFlaggingInProgress(null);
    }
  };

  const handleEscalateRestriction = async (type: 'ip' | 'visitor_id', value: string, note: string) => {
    try {
      const res = await fetch('/api/restrictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({
          action: 'add',
          type,
          value,
          note: `Escalated from Dwell Sentinel: ${note}`,
        }),
      });
      if (res.ok) {
        setActiveFlagFeedback(`Restricted ${value.slice(0, 8)}... successfully`);
        setTimeout(() => setActiveFlagFeedback(null), 3500);
        await fetchRestrictions();
        await fetchStats();
        await fetchVisitors();
      }
    } catch (e) {
      console.error('Failed to escalate restriction:', e);
    }
  };

  // Helper to resolve product URL
  const getProductUrl = (p: ProductEnquiryStat) => {
    const cat = p.category.toLowerCase().includes('grader') ? 'grader' : p.category.toLowerCase();
    return `/products/${encodeURIComponent(cat)}/${encodeURIComponent(p.slug)}`;
  };

  // 1-Click Copy Part Number with auto-dismiss feedback
  const handleCopyPart = (partNumber: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!partNumber || partNumber === '-') return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(partNumber);
      setCopiedPart(partNumber);
      setTimeout(() => {
        setCopiedPart((cur) => (cur === partNumber ? null : cur));
      }, 2000);
    }
  };

  // Dynamic Categories from Catalog
  const availableCategories = useMemo(() => {
    if (!productData?.products) return [];
    const set = new Set<string>();
    productData.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [productData]);

  // Dynamic Brands from Catalog
  const availableBrands = useMemo(() => {
    if (!productData?.products) return [];
    const set = new Set<string>();
    productData.products.forEach((p) => {
      if (p.brand) {
        p.brand.split(',').forEach((b) => {
          const trimmed = b.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [productData]);

  // Handle Sort Change
  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'title' || field === 'category' || field === 'part_number') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
    setCurrentPage(1);
  };

  // Filtered Products for Product Enquiry Tab
  const filteredProducts = useMemo(() => {
    return (productData?.products || []).filter((p) => {
      if (productFilter === 'active' && p.enquire_clicks === 0) return false;
      if (productFilter === 'high_demand' && p.enquire_clicks < 2) return false;
      if (productFilter === 'opportunity' && !(p.views > 0 && p.enquire_clicks === 0)) return false;
      if (productFilter === 'zero' && p.enquire_clicks > 0) return false;

      if (productCategoryFilter !== 'all' && p.category.toLowerCase() !== productCategoryFilter.toLowerCase()) {
        return false;
      }

      if (productBrandFilter !== 'all') {
        const brandStr = (p.brand || '').toLowerCase();
        if (!brandStr.includes(productBrandFilter.toLowerCase())) return false;
      }

      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchPart = (p.part_number || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchSlug = (p.slug || '').toLowerCase().includes(q);
        return matchTitle || matchPart || matchCat || matchBrand || matchSlug;
      }
      return true;
    });
  }, [productData, productFilter, productCategoryFilter, productBrandFilter, productSearch]);

  // Copy all visible unique part numbers
  const handleCopyFilteredPartNumbers = () => {
    if (!filteredProducts || filteredProducts.length === 0) return;
    const parts = filteredProducts
      .map((p) => p.part_number)
      .filter((p) => p && p !== '-')
      .filter((v, i, a) => a.indexOf(v) === i);

    if (parts.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(parts.join(', '));
      setCopiedPartNumbersFeedback(true);
      setTimeout(() => setCopiedPartNumbersFeedback(false), 2500);
    }
  };

  // Generate WhatsApp inquiry link for a product
  const getWhatsAppTestUrl = (p: ProductEnquiryStat) => {
    const text = `Hi MM Earthmovers, I would like to enquire about ${p.title}${p.part_number && p.part_number !== '-' ? ` (Part Number: ${p.part_number})` : ''}. Please share pricing and availability.`;
    return `https://wa.me/919443228800?text=${encodeURIComponent(text)}`;
  };

  // Filter events related to the currently inspected product
  const inspectedProductEvents = useMemo(() => {
    if (!inspectedProduct || !events) return [];
    const pSlug = inspectedProduct.slug.toLowerCase();
    const pTitle = inspectedProduct.title.toLowerCase();
    const pPart = (inspectedProduct.part_number || '').toLowerCase();

    return events.filter((ev) => {
      const metaSlug = (ev.metadata?.productSlug || '').toLowerCase();
      const metaTitle = (ev.metadata?.productTitle || '').toLowerCase();
      const metaPart = (ev.metadata?.partNumber || '').toLowerCase();
      const path = (ev.page_path || '').toLowerCase();

      if (metaSlug && metaSlug === pSlug) return true;
      if (path && (path.endsWith(`/${pSlug}`) || path.includes(`/products/${pSlug}`))) return true;
      if (metaTitle && metaTitle === pTitle) return true;
      if (pPart && metaPart && metaPart === pPart) return true;
      return false;
    });
  }, [inspectedProduct, events]);

  // Dynamically Sorted Products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'clicks':
          comparison = a.enquire_clicks - b.enquire_clicks;
          if (comparison === 0) comparison = a.views - b.views;
          break;
        case 'views':
          comparison = a.views - b.views;
          if (comparison === 0) comparison = a.enquire_clicks - b.enquire_clicks;
          break;
        case 'conversion':
          comparison = a.conversion_rate - b.conversion_rate;
          if (comparison === 0) comparison = a.enquire_clicks - b.enquire_clicks;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'part_number':
          comparison = (a.part_number || '').localeCompare(b.part_number || '');
          break;
        case 'last_enquired': {
          const timeA = a.last_enquired_at ? new Date(a.last_enquired_at).getTime() : 0;
          const timeB = b.last_enquired_at ? new Date(b.last_enquired_at).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredProducts, sortField, sortOrder]);

  // Total Pages
  const totalPages = useMemo(() => {
    if (pageSize === -1) return 1;
    return Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  }, [sortedProducts.length, pageSize]);

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return sortedProducts;
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // 1-Click CSV Export
  const handleExportCSV = () => {
    if (!sortedProducts || sortedProducts.length === 0) return;

    const headers = [
      'Product Title',
      'Category',
      'Brand',
      'Part Number',
      'Page Views',
      'Enquire Clicks',
      'Conversion Rate (%)',
      'Demand Status',
      'Last Enquired (UTC)',
    ];

    const rows = sortedProducts.map((p) => [
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${(p.part_number || '').replace(/"/g, '""')}"`,
      p.views,
      p.enquire_clicks,
      `${p.conversion_rate}%`,
      p.enquire_clicks > 0 ? 'Active Demand' : 'Zero Enquiries',
      p.last_enquired_at ? `"${new Date(p.last_enquired_at).toISOString()}"` : 'Never',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `mm-earthmovers-enquiries-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Events for Live Click Stream Tab
  const filteredEvents = useMemo(() => {
    // Defense-in-depth: Never show admin routes or targets in live stream
    const cleanEvents = events.filter(
      (ev) => !ev.page_path?.startsWith('/admin') && !ev.element_target?.includes('/admin')
    );
    if (!eventSearch.trim()) return cleanEvents;
    const q = eventSearch.toLowerCase();
    return cleanEvents.filter((ev) => {
      return (
        ev.element_text?.toLowerCase().includes(q) ||
        ev.element_target?.toLowerCase().includes(q) ||
        ev.page_path?.toLowerCase().includes(q) ||
        ev.identified_name?.toLowerCase().includes(q) ||
        ev.visitor_id?.toLowerCase().includes(q) ||
        ev.event_type?.toLowerCase().includes(q) ||
        (ev.metadata?.productTitle && ev.metadata.productTitle.toLowerCase().includes(q)) ||
        (ev.metadata?.query && ev.metadata.query.toLowerCase().includes(q)) ||
        (ev.metadata?.searchQuery && ev.metadata.searchQuery.toLowerCase().includes(q)) ||
        (ev.metadata?.partNumber && ev.metadata.partNumber.toLowerCase().includes(q)) ||
        (ev.metadata?.action && ev.metadata.action.toLowerCase().includes(q)) ||
        (ev.metadata?.category && ev.metadata.category.toLowerCase().includes(q))
      );
    });
  }, [events, eventSearch]);

  // Pure SVG Cardinal / Cubic Bezier Spline Path Generator
  const getSmoothPath = (points: Array<[number, number]>): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
    if (points.length === 2) {
      return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
    }

    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${Math.round(cp1x * 10) / 10} ${Math.round(cp1y * 10) / 10}, ${Math.round(cp2x * 10) / 10} ${Math.round(cp2y * 10) / 10}, ${Math.round(p2[0] * 10) / 10} ${Math.round(p2[1] * 10) / 10}`;
    }
    return d;
  };

  // Continuous, gap-free Time Series data strictly aligned to IST
  const formattedTimeSeries = useMemo(() => {
    if (!stats?.timeSeries) return [];

    const rawMap = new Map<string, { visitors: number; pageviews: number; clicks: number; leads: number }>();
    stats.timeSeries.forEach((t) => {
      rawMap.set(t.period, {
        visitors: parseInt(t.visitors, 10) || 0,
        pageviews: parseInt(t.pageviews, 10) || 0,
        clicks: parseInt(t.clicks, 10) || 0,
        leads: parseInt(t.leads || '0', 10) || 0,
      });
    });

    if (timeRange === 'today') {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentHour = nowIST.getHours();
      // Show at least up to current hour or 12 PM
      const endHour = Math.max(currentHour, 12);

      const result = [];
      for (let h = 0; h <= endHour; h++) {
        const periodKey = `${h.toString().padStart(2, '0')}:00`;
        const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0, leads: 0 };
        const label = `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
        result.push({
          period: periodKey,
          label,
          visitors: data.visitors,
          pageviews: data.pageviews,
          clicks: data.clicks,
          leads: data.leads,
          total: data.pageviews + data.clicks,
        });
      }
      return result;
    }

    if (timeRange === '7d' || timeRange === '30d') {
      const daysCount = timeRange === '7d' ? 7 : 30;
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const result = [];

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(nowIST);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const periodKey = `${y}-${m}-${day}`;
        const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0, leads: 0 };
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        result.push({
          period: periodKey,
          label,
          visitors: data.visitors,
          pageviews: data.pageviews,
          clicks: data.clicks,
          leads: data.leads,
          total: data.pageviews + data.clicks,
        });
      }
      return result;
    }

    // 'all'
    return stats.timeSeries.map((t) => {
      let label = t.period;
      try {
        const [y, m, d] = t.period.split('-').map((n) => parseInt(n, 10));
        label = new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch {}
      const v = parseInt(t.visitors, 10) || 0;
      const p = parseInt(t.pageviews, 10) || 0;
      const c = parseInt(t.clicks, 10) || 0;
      const l = parseInt(t.leads || '0', 10) || 0;
      return {
        period: t.period,
        label,
        visitors: v,
        pageviews: p,
        clicks: c,
        leads: l,
        total: p + c,
      };
    });
  }, [stats?.timeSeries, timeRange]);

  // Aggregate stats across the visible chart time series
  const chartTotals = useMemo(() => {
    let totalViews = 0;
    let totalClicks = 0;
    let totalVisitors = 0;
    let totalLeads = 0;
    let peakPeriod = { label: '-', views: 0, clicks: 0 };

    formattedTimeSeries.forEach((t) => {
      totalViews += t.pageviews;
      totalClicks += t.clicks;
      totalVisitors += t.visitors;
      totalLeads += t.leads;
      if (t.pageviews > peakPeriod.views) {
        peakPeriod = { label: t.label, views: t.pageviews, clicks: t.clicks };
      }
    });

    return { totalViews, totalClicks, totalVisitors, totalLeads, peakPeriod };
  }, [formattedTimeSeries]);

  // Copy to clipboard helper with timed feedback
  const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setContactCopiedFeedback(id);
      setTimeout(() => {
        setContactCopiedFeedback((cur) => (cur === id ? null : cur));
      }, 2000);
    }
  };

  // Industrial cluster identifier for B2B procurement
  const getIndustrialBadge = (region?: string | null, city?: string | null) => {
    const reg = (region || '').toUpperCase().trim();
    const c = (city || '').toUpperCase().trim();
    if (
      ['WB', 'JH', 'OD', 'CG', 'ORISSA', 'JHARKHAND', 'WEST BENGAL', 'CHHATTISGARH'].includes(reg) ||
      ['DHANBAD', 'ASANSOL', 'RANCHI', 'ROURKELA', 'DURGAPUR', 'KOLKATA', 'JAMSHEDPUR', 'BILASPUR', 'RAIPUR'].some((hub) => c.includes(hub))
    ) {
      return { label: '⛏️ Mining Cluster', bg: 'bg-amber-100/90 text-amber-900 border-amber-300' };
    }
    if (
      ['MH', 'GJ', 'TN', 'PB', 'DL', 'HR', 'MAHARASHTRA', 'GUJARAT', 'TAMIL NADU', 'PUNJAB', 'HARYANA'].includes(reg) ||
      ['PUNE', 'NAGPUR', 'MUMBAI', 'AHMEDABAD', 'SURAT', 'CHENNAI', 'LUDHIANA', 'DELHI', 'GURGAON'].some((hub) => c.includes(hub))
    ) {
      return { label: '🏗️ Infra & Fleets', bg: 'bg-blue-100/90 text-blue-900 border-blue-300' };
    }
    return null;
  };

  // Summary counts for Visitor Directory
  const visitorSummaryCounts = useMemo(() => {
    let leads = 0;
    let rfq = 0;
    let repeat = 0;
    let flagged = 0;
    let restricted = 0;

    visitorsList.forEach((v) => {
      const isTargetRestricted =
        v.is_restricted ||
        restrictions.some(
          (r) =>
            r.value.toLowerCase() === v.visitor_id.toLowerCase() ||
            (v.ip_address && r.value === v.ip_address)
        );
      const isTargetFlagged =
        v.is_flagged ||
        stats?.flags?.some(
          (f) =>
            f.target_value.toLowerCase() === v.visitor_id.toLowerCase() ||
            (v.ip_address && f.target_value === v.ip_address)
        );

      if (v.identified_name || v.identified_contact) leads++;
      if (Number(v.whatsapp_clicks) > 0) rfq++;
      if (v.total_sessions >= 3) repeat++;
      if (isTargetFlagged) flagged++;
      if (isTargetRestricted) restricted++;
    });

    return {
      total: visitorsList.length,
      leads,
      rfq,
      repeat,
      flagged,
      restricted,
    };
  }, [visitorsList, restrictions, stats?.flags]);

  // Filtered Visitors Directory Memo
  const filteredVisitors = useMemo(() => {
    return visitorsList.filter((v) => {
      const isTargetRestricted =
        v.is_restricted ||
        restrictions.some(
          (r) =>
            r.value.toLowerCase() === v.visitor_id.toLowerCase() ||
            (v.ip_address && r.value === v.ip_address)
        );
      const isTargetFlagged =
        v.is_flagged ||
        stats?.flags?.some(
          (f) =>
            f.target_value.toLowerCase() === v.visitor_id.toLowerCase() ||
            (v.ip_address && f.target_value === v.ip_address)
        );

      // 1. Tab filter
      if (visitorFilterTab === 'leads' && !v.identified_name && !v.identified_contact) return false;
      if (visitorFilterTab === 'rfq' && Number(v.whatsapp_clicks) <= 0) return false;
      if (visitorFilterTab === 'repeat' && v.total_sessions < 3) return false;
      if (visitorFilterTab === 'flagged' && !isTargetFlagged) return false;
      if (visitorFilterTab === 'restricted' && !isTargetRestricted) return false;

      // 2. Device filter
      if (visitorDeviceFilter === 'mobile' && v.device_type !== 'mobile' && v.device_type !== 'tablet') return false;
      if (visitorDeviceFilter === 'desktop' && v.device_type !== 'desktop') return false;

      // 3. Search query
      if (visitorSearchQuery.trim()) {
        const q = visitorSearchQuery.toLowerCase().trim();
        const matches =
          v.visitor_id.toLowerCase().includes(q) ||
          (v.ip_address && v.ip_address.toLowerCase().includes(q)) ||
          (v.identified_name && v.identified_name.toLowerCase().includes(q)) ||
          (v.identified_contact && v.identified_contact.toLowerCase().includes(q)) ||
          (v.city && v.city.toLowerCase().includes(q)) ||
          (v.region && v.region.toLowerCase().includes(q)) ||
          (v.country && v.country.toLowerCase().includes(q)) ||
          (v.browser && v.browser.toLowerCase().includes(q)) ||
          (v.os && v.os.toLowerCase().includes(q)) ||
          (v.last_page_viewed && v.last_page_viewed.toLowerCase().includes(q)) ||
          (v.last_rfq_part && v.last_rfq_part.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [visitorsList, visitorFilterTab, visitorDeviceFilter, visitorSearchQuery, restrictions, stats?.flags]);

  const visitorTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredVisitors.length / visitorPageSize));
  }, [filteredVisitors.length, visitorPageSize]);

  const paginatedVisitors = useMemo(() => {
    const start = (visitorPage - 1) * visitorPageSize;
    return filteredVisitors.slice(start, start + visitorPageSize);
  }, [filteredVisitors, visitorPage, visitorPageSize]);

  // Export Filtered Visitors to CSV
  const handleExportVisitorsCSV = () => {
    if (filteredVisitors.length === 0) return;
    const headers = [
      'Visitor ID',
      'Identified Name',
      'Contact Number',
      'IP Address',
      'City',
      'Region/State',
      'Country',
      'Device Type',
      'Browser',
      'OS',
      'Total Sessions',
      'Total Events',
      'Total Clicks',
      'Part Copies',
      'WhatsApp RFQs',
      'Status',
      'Flag Type',
      'First Seen (IST)',
      'Last Active (IST)',
      'Last Viewed Page'
    ];
    const rows = filteredVisitors.map((v) => {
      const isTargetRestricted =
        v.is_restricted ||
        restrictions.some(
          (r) =>
            r.value.toLowerCase() === v.visitor_id.toLowerCase() ||
            (v.ip_address && r.value === v.ip_address)
        );
      const targetFlag = stats?.flags?.find(
        (f) =>
          f.target_value.toLowerCase() === v.visitor_id.toLowerCase() ||
          (v.ip_address && f.target_value === v.ip_address)
      );

      return [
        v.visitor_id,
        v.identified_name || '',
        v.identified_contact || '',
        v.ip_address || '',
        v.city ? decodeURIComponent(v.city).replace(/%20/g, ' ') : '',
        v.region || '',
        v.country || '',
        v.device_type || '',
        v.browser || '',
        v.os || '',
        v.total_sessions || 1,
        v.total_events || 0,
        v.total_clicks || 0,
        v.total_copies || 0,
        v.whatsapp_clicks || 0,
        isTargetRestricted ? 'Restricted' : 'Active',
        targetFlag?.flag_type || v.flag_type || 'None',
        v.first_seen_at ? formatIST(v.first_seen_at) : '',
        v.last_seen_at ? formatIST(v.last_seen_at) : '',
        v.last_page_viewed || ''
      ];
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mm-earthmovers-visitors-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Loading State
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading Analytics Hub...</span>
        </div>
      </div>
    );
  }

  // Login Screen (Clean White Mode)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-xs">
              🚜
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MM Earthmovers Analytics</h1>
            <p className="text-slate-500 text-sm mt-1.5">Enter your administrative passcode to access reports.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs text-sm"
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-semibold rounded-xl transition duration-150 shadow-md shadow-amber-600/20 text-sm"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link href="/" className="text-xs font-medium text-slate-500 hover:text-amber-600 transition flex items-center justify-center gap-1">
              ← Return to Main Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sm:py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shadow-xs shrink-0">
              🚜
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">MM Earthmovers Analytics</h1>
                {/* Active Users Online Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {stats?.kpis?.activeUsersNow || 0} Online Now
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  🕒 IST (UTC+05:30)
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Visitor intelligence, conversions, clicks, and inventory demand</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Time Range Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs overflow-x-auto">
              {(['today', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    timeRange === r
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'Today (IST)' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title="Toggle Live Auto-refresh"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all shadow-xs ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span className="hidden sm:inline">{autoRefresh ? 'Live (15s)' : 'Paused'}</span>
              <span className="sm:hidden">{autoRefresh ? 'Live' : 'Off'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                fetchStats();
                fetchEvents();
                fetchProductEnquiries();
                fetchRestrictions();
                fetchVisitors();
              }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium transition text-slate-700 shadow-xs flex items-center gap-1 disabled:opacity-50"
            >
              <span>{isLoading ? '...' : '🔄'}</span>
              <span className="hidden sm:inline">{isLoading ? 'Refreshing' : 'Refresh'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-medium transition shadow-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {/* Error Alert Banner */}
        {dashboardError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3 shadow-xs">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-rose-900">Database Connection Error</h3>
              <p className="text-xs text-rose-700 mt-0.5">{dashboardError}</p>
              <p className="text-xs text-rose-600 mt-1 font-mono">
                Verify that DATABASE_URL is set in Vercel settings (Project Settings &rarr; Environment Variables) and redeployed.
              </p>
            </div>
            <button
              onClick={() => {
                setDashboardError(null);
                fetchStats();
              }}
              className="px-3 py-1 bg-white border border-rose-300 text-xs font-semibold rounded-lg hover:bg-rose-100 transition shadow-xs text-rose-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Scorecard Grid (Pure White with Subtle Elevation) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Unique Visitors</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-sans">
              {stats?.kpis?.totalVisitors.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Distinct devices</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Views</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-sans">
              {stats?.kpis?.totalPageviews.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{stats?.kpis?.totalSessions || 0} sessions</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">WhatsApp Clicks</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-sans">
              {stats?.kpis?.whatsappClicks.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-emerald-700/80 mt-1 block">Direct quotes</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Phone Calls</span>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 font-sans">
              {stats?.kpis?.phoneCalls.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-blue-700/80 mt-1 block">Direct dials</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Form Leads</span>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1 font-sans">
              {stats?.kpis?.formLeads.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-purple-700/80 mt-1 block">Form messages</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Avg Dwell Time</span>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1 font-sans">
              {formatDuration(stats?.kpis?.avgDurationSeconds || 0)}
            </div>
            <span className="text-[11px] text-amber-700/80 mt-1 block">Browsing time</span>
          </div>
        </div>

        {/* Navigation Tabs (Light Mode Styled) */}
        <div className="flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto pb-px mb-5 sm:mb-6">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'stream'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            ⚡ Live Activity Feed
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'products'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            📦 Product Demand ({productData?.summary?.withEnquiriesCount || 0}/{productData?.summary?.totalCatalogProducts || 144})
          </button>
          <button
            onClick={() => setActiveTab('audience')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'audience'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            🌍 Geo & Sources
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'demand'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            🔍 Search Demand & Dwell
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'visitors'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            👤 Visitors & Leads {visitorsList.length > 0 ? `(${visitorsList.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('restrictions')}
            className={`px-3.5 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'restrictions'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            🛡️ Access & Restrictions ({restrictions.length})
          </button>
        </div>

        {/* TAB 1: LIVE EVENT STREAM ("WHO CLICKED WHAT") */}
        {activeTab === 'stream' && (
          <div className="space-y-6">
            {/* Google Search Console Style Performance Report (IST) */}
            {stats && formattedTimeSeries.length > 0 && (() => {
              // Calculate points & bounds
              const n = formattedTimeSeries.length;
              const activeIndex = pinnedPeriod
                ? formattedTimeSeries.findIndex((t) => t.period === pinnedPeriod)
                : hoveredIndex;
              const activeItem = activeIndex !== null && activeIndex >= 0 && activeIndex < n
                ? formattedTimeSeries[activeIndex]
                : null;

              // Compute max value dynamically across active metrics
              const maxVal = Math.max(
                ...formattedTimeSeries.map((t) => {
                  let m = 0;
                  if (activeMetrics.clicks) m = Math.max(m, t.clicks);
                  if (activeMetrics.pageviews) m = Math.max(m, t.pageviews);
                  if (activeMetrics.visitors) m = Math.max(m, t.visitors);
                  if (activeMetrics.leads) m = Math.max(m, t.leads);
                  return m;
                }),
                4
              );

              // SVG layout coordinates
              const svgWidth = 1000;
              const svgHeight = 250;
              const marginLeft = 50;
              const marginRight = 30;
              const marginTop = 25;
              const marginBottom = 45;
              const chartW = svgWidth - marginLeft - marginRight;
              const chartH = svgHeight - marginTop - marginBottom;
              const baselineY = marginTop + chartH;

              // Compute point arrays for each metric
              const getPoints = (key: 'clicks' | 'pageviews' | 'visitors' | 'leads'): Array<[number, number]> => {
                return formattedTimeSeries.map((item, idx) => {
                  const x = marginLeft + (n > 1 ? (idx / (n - 1)) * chartW : chartW / 2);
                  const val = item[key];
                  const y = baselineY - (val / maxVal) * chartH;
                  return [x, y];
                });
              };

              const clicksPoints = getPoints('clicks');
              const pageviewsPoints = getPoints('pageviews');
              const visitorsPoints = getPoints('visitors');
              const leadsPoints = getPoints('leads');

              const getAreaPath = (pts: Array<[number, number]>): string => {
                if (pts.length === 0) return '';
                const line = getSmoothPath(pts);
                return `${line} L ${pts[pts.length - 1][0]} ${baselineY} L ${pts[0][0]} ${baselineY} Z`;
              };

              const activeX = activeIndex !== null && activeIndex >= 0 && activeIndex < n
                ? marginLeft + (n > 1 ? (activeIndex / (n - 1)) * chartW : chartW / 2)
                : null;
              const activeXPercent = activeX !== null ? (activeX / svgWidth) * 100 : null;

              // Helper for mouse/touch tracking
              const handlePointerCalc = (clientX: number, target: SVGSVGElement) => {
                const rect = target.getBoundingClientRect();
                const relX = clientX - rect.left;
                const svgX = (relX / rect.width) * svgWidth;
                const clampedX = Math.max(marginLeft, Math.min(marginLeft + chartW, svgX));
                const ratio = (clampedX - marginLeft) / chartW;
                const nearestIdx = Math.round(ratio * (n - 1));
                setHoveredIndex(nearestIdx);
              };

              return (
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all">
                  {/* TOP: GSC 4-CARD SCORECARD HEADER */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 border-b border-slate-200/90 bg-slate-50/40">
                    {/* Card 1: Total Clicks (Blue) */}
                    <button
                      type="button"
                      onClick={() => toggleMetric('clicks')}
                      className={`p-4 sm:p-5 text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                        activeMetrics.clicks
                          ? 'bg-blue-50/30 border-t-4 border-t-blue-600'
                          : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                      }`}
                      title="Click to toggle Total Clicks series"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeMetrics.clicks}
                            onChange={() => {}} // handled by parent button
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
                          />
                          <span className={`text-xs font-semibold ${activeMetrics.clicks ? 'text-blue-900 font-bold' : 'text-slate-600'}`}>
                            Total Clicks
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-2xs"></span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${activeMetrics.clicks ? 'text-blue-600' : 'text-slate-400'}`}>
                          {chartTotals.totalClicks.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">CTA & Links</span>
                      </div>
                    </button>

                    {/* Card 2: Total Pageviews (Amber) */}
                    <button
                      type="button"
                      onClick={() => toggleMetric('pageviews')}
                      className={`p-4 sm:p-5 text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                        activeMetrics.pageviews
                          ? 'bg-amber-50/30 border-t-4 border-t-amber-500'
                          : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                      }`}
                      title="Click to toggle Total Pageviews series"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeMetrics.pageviews}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer pointer-events-none"
                          />
                          <span className={`text-xs font-semibold ${activeMetrics.pageviews ? 'text-amber-900 font-bold' : 'text-slate-600'}`}>
                            Total Pageviews
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${activeMetrics.pageviews ? 'text-amber-600' : 'text-slate-400'}`}>
                          {chartTotals.totalViews.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Impressions</span>
                      </div>
                    </button>

                    {/* Card 3: Unique Visitors (Emerald) */}
                    <button
                      type="button"
                      onClick={() => toggleMetric('visitors')}
                      className={`p-4 sm:p-5 text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                        activeMetrics.visitors
                          ? 'bg-emerald-50/30 border-t-4 border-t-emerald-600'
                          : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                      }`}
                      title="Click to toggle Unique Visitors series"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeMetrics.visitors}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                          />
                          <span className={`text-xs font-semibold ${activeMetrics.visitors ? 'text-emerald-900 font-bold' : 'text-slate-600'}`}>
                            Unique Visitors
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-2xs"></span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${activeMetrics.visitors ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {chartTotals.totalVisitors.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Devices</span>
                      </div>
                    </button>

                    {/* Card 4: Inquiry Leads (Purple) */}
                    <button
                      type="button"
                      onClick={() => toggleMetric('leads')}
                      className={`p-4 sm:p-5 text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                        activeMetrics.leads
                          ? 'bg-purple-50/30 border-t-4 border-t-purple-600'
                          : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                      }`}
                      title="Click to toggle Inquiry Leads series"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeMetrics.leads}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer pointer-events-none"
                          />
                          <span className={`text-xs font-semibold ${activeMetrics.leads ? 'text-purple-900 font-bold' : 'text-slate-600'}`}>
                            Inquiry Leads
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-2xs"></span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${activeMetrics.leads ? 'text-purple-600' : 'text-slate-400'}`}>
                          {chartTotals.totalLeads.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Quotes & Calls</span>
                      </div>
                    </button>
                  </div>

                  {/* SUB-TOOLBAR: Context & Chart Mode Switcher */}
                  <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        🇮🇳 IST Timezone
                      </span>
                      <span className="text-slate-500">
                        {timeRange === 'today'
                          ? 'Hourly Breakdown (00:00 - 23:00 IST)'
                          : timeRange === '7d'
                          ? 'Daily Trend (Last 7 Days in IST)'
                          : timeRange === '30d'
                          ? 'Daily Trend (Last 30 Days in IST)'
                          : 'Historical Trend (All Time)'}
                      </span>
                      {chartTotals.peakPeriod.views > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          ⭐ Peak: {chartTotals.peakPeriod.label} ({chartTotals.peakPeriod.views} views)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pinnedPeriod && (
                        <button
                          onClick={() => setPinnedPeriod(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
                          title="Click to clear pinned period"
                        >
                          📌 Unpin ({pinnedPeriod}) ✕
                        </button>
                      )}

                      {/* Line vs Bar toggle */}
                      <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setChartType('spline')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            chartType === 'spline'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          📈 <span>Line</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartType('bar')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            chartType === 'bar'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          📊 <span>Bars</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MAIN CHART CANVAS */}
                  <div className="p-4 sm:p-6 relative select-none">
                    {/* FLOATING GSC TOOLTIP (Positioned directly above the vertical crosshair) */}
                    {activeItem && activeXPercent !== null && (
                      <div
                        style={{
                          left: `${activeXPercent}%`,
                          top: '16px',
                        }}
                        className={`absolute z-30 pointer-events-none transition-all duration-75 ${
                          activeXPercent > 70
                            ? '-translate-x-full pr-4'
                            : activeXPercent < 30
                            ? 'translate-x-4'
                            : '-translate-x-1/2'
                        }`}
                      >
                        <div
                          style={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                          }}
                          className="rounded-xl p-3 border text-xs shadow-2xl min-w-[210px] backdrop-blur-md"
                        >
                          <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-700/80">
                            <span
                              style={{ color: '#fbbf24', fontWeight: 700 }}
                              className="font-mono text-xs flex items-center gap-1.5"
                            >
                              <span>📅</span>
                              <span>{activeItem.period} ({activeItem.label} IST)</span>
                            </span>
                            {pinnedPeriod === activeItem.period && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                                Pinned
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 font-sans">
                            {activeMetrics.clicks && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5" style={{ color: '#93c5fd' }}>
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#2563eb' }}></span>
                                  <span className="font-medium">Total Clicks</span>
                                </span>
                                <span style={{ color: '#ffffff', fontWeight: 700 }} className="font-mono text-xs">
                                  {activeItem.clicks}
                                </span>
                              </div>
                            )}
                            {activeMetrics.pageviews && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5" style={{ color: '#fcd34d' }}>
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#d97706' }}></span>
                                  <span className="font-medium">Total Pageviews</span>
                                </span>
                                <span style={{ color: '#ffffff', fontWeight: 700 }} className="font-mono text-xs">
                                  {activeItem.pageviews}
                                </span>
                              </div>
                            )}
                            {activeMetrics.visitors && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5" style={{ color: '#6ee7b7' }}>
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#059669' }}></span>
                                  <span className="font-medium">Unique Visitors</span>
                                </span>
                                <span style={{ color: '#ffffff', fontWeight: 700 }} className="font-mono text-xs">
                                  {activeItem.visitors}
                                </span>
                              </div>
                            )}
                            {activeMetrics.leads && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5" style={{ color: '#c4b5fd' }}>
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#7c3aed' }}></span>
                                  <span className="font-medium">Inquiry Leads</span>
                                </span>
                                <span style={{ color: '#ffffff', fontWeight: 700 }} className="font-mono text-xs">
                                  {activeItem.leads}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW 1: GSC SPLINE LINE CHART */}
                    {chartType === 'spline' ? (
                      <div className="w-full overflow-hidden">
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="w-full h-64 sm:h-72 touch-none cursor-crosshair overflow-visible"
                          onMouseMove={(e) => handlePointerCalc(e.clientX, e.currentTarget)}
                          onTouchMove={(e) => {
                            if (e.touches && e.touches[0]) {
                              handlePointerCalc(e.touches[0].clientX, e.currentTarget);
                            }
                          }}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onTouchEnd={() => setHoveredIndex(null)}
                          onClick={() => {
                            if (hoveredIndex !== null && formattedTimeSeries[hoveredIndex]) {
                              const p = formattedTimeSeries[hoveredIndex].period;
                              setPinnedPeriod((cur) => (cur === p ? null : p));
                            }
                          }}
                        >
                          <defs>
                            <linearGradient id="grad-clicks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="grad-pageviews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d97706" stopOpacity="0.20" />
                              <stop offset="100%" stopColor="#d97706" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="grad-visitors" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#059669" stopOpacity="0.20" />
                              <stop offset="100%" stopColor="#059669" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="grad-leads" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Gridlines & Y-Axis Labels */}
                          {[0, 0.33, 0.67, 1].map((pct, i) => {
                            const y = baselineY - pct * chartH;
                            const val = Math.round(pct * maxVal);
                            return (
                              <g key={i}>
                                <line
                                  x1={marginLeft}
                                  y1={y}
                                  x2={marginLeft + chartW}
                                  y2={y}
                                  stroke={pct === 0 ? '#cbd5e1' : '#f1f5f9'}
                                  strokeDasharray={pct === 0 ? undefined : '4 4'}
                                  strokeWidth="1"
                                />
                                <text
                                  x={marginLeft - 10}
                                  y={y + 4}
                                  textAnchor="end"
                                  fill="#94a3b8"
                                  fontSize="10"
                                  fontFamily="monospace"
                                  fontWeight="600"
                                >
                                  {val}
                                </text>
                              </g>
                            );
                          })}

                          {/* Area Fills Under Active Splines */}
                          {activeMetrics.clicks && (
                            <path d={getAreaPath(clicksPoints)} fill="url(#grad-clicks)" />
                          )}
                          {activeMetrics.pageviews && (
                            <path d={getAreaPath(pageviewsPoints)} fill="url(#grad-pageviews)" />
                          )}
                          {activeMetrics.visitors && (
                            <path d={getAreaPath(visitorsPoints)} fill="url(#grad-visitors)" />
                          )}
                          {activeMetrics.leads && (
                            <path d={getAreaPath(leadsPoints)} fill="url(#grad-leads)" />
                          )}

                          {/* Spline Lines */}
                          {activeMetrics.clicks && (
                            <path
                              d={getSmoothPath(clicksPoints)}
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {activeMetrics.pageviews && (
                            <path
                              d={getSmoothPath(pageviewsPoints)}
                              fill="none"
                              stroke="#d97706"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {activeMetrics.visitors && (
                            <path
                              d={getSmoothPath(visitorsPoints)}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {activeMetrics.leads && (
                            <path
                              d={getSmoothPath(leadsPoints)}
                              fill="none"
                              stroke="#7c3aed"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Vertical Tracking Crosshair & Dots */}
                          {activeX !== null && (
                            <g className="transition-all duration-75">
                              {/* Vertical Line */}
                              <line
                                x1={activeX}
                                y1={marginTop - 8}
                                x2={activeX}
                                y2={baselineY}
                                stroke="#475569"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                              />

                              {/* Metric Intersect Dots */}
                              {activeMetrics.clicks && activeIndex !== null && (
                                <g>
                                  <circle cx={activeX} cy={clicksPoints[activeIndex][1]} r="7" fill="#2563eb" fillOpacity="0.25" />
                                  <circle cx={activeX} cy={clicksPoints[activeIndex][1]} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
                                </g>
                              )}
                              {activeMetrics.pageviews && activeIndex !== null && (
                                <g>
                                  <circle cx={activeX} cy={pageviewsPoints[activeIndex][1]} r="7" fill="#d97706" fillOpacity="0.25" />
                                  <circle cx={activeX} cy={pageviewsPoints[activeIndex][1]} r="4.5" fill="#d97706" stroke="#ffffff" strokeWidth="2.5" />
                                </g>
                              )}
                              {activeMetrics.visitors && activeIndex !== null && (
                                <g>
                                  <circle cx={activeX} cy={visitorsPoints[activeIndex][1]} r="7" fill="#059669" fillOpacity="0.25" />
                                  <circle cx={activeX} cy={visitorsPoints[activeIndex][1]} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="2.5" />
                                </g>
                              )}
                              {activeMetrics.leads && activeIndex !== null && (
                                <g>
                                  <circle cx={activeX} cy={leadsPoints[activeIndex][1]} r="7" fill="#7c3aed" fillOpacity="0.25" />
                                  <circle cx={activeX} cy={leadsPoints[activeIndex][1]} r="4.5" fill="#7c3aed" stroke="#ffffff" strokeWidth="2.5" />
                                </g>
                              )}
                            </g>
                          )}

                          {/* X-Axis Labels */}
                          {formattedTimeSeries.map((item, idx) => {
                            const step = n > 20 ? Math.ceil(n / 8) : n > 10 ? 2 : 1;
                            const showLabel = idx % step === 0 || idx === n - 1;
                            if (!showLabel) return null;
                            const x = marginLeft + (n > 1 ? (idx / (n - 1)) * chartW : chartW / 2);
                            const isCurrent = activeIndex === idx;

                            return (
                              <text
                                key={idx}
                                x={x}
                                y={baselineY + 22}
                                textAnchor="middle"
                                fill={isCurrent ? '#0f172a' : '#64748b'}
                                fontSize="11"
                                fontWeight={isCurrent ? '700' : '500'}
                                fontFamily="monospace"
                              >
                                {item.label}
                              </text>
                            );
                          })}

                          {/* Transparent overlay for mouse/touch tracking */}
                          <rect
                            x={marginLeft}
                            y={marginTop - 10}
                            width={chartW}
                            height={chartH + 20}
                            fill="transparent"
                          />
                        </svg>
                      </div>
                    ) : (
                      /* VIEW 2: GROUPED BARS */
                      <div className="overflow-x-auto pb-2 pl-8">
                        <div className="min-w-[500px] flex items-end gap-1 sm:gap-2 h-64 pt-12 px-1">
                          {formattedTimeSeries.map((item, idx) => {
                            const isPinned = pinnedPeriod === item.period;
                            const isHovered = hoveredIndex === idx;
                            const isSelected = isPinned || isHovered;

                            const clicksH = Math.max(Math.round((item.clicks / maxVal) * 100), item.clicks > 0 ? 8 : 0);
                            const viewsH = Math.max(Math.round((item.pageviews / maxVal) * 100), item.pageviews > 0 ? 8 : 0);
                            const visitorsH = Math.max(Math.round((item.visitors / maxVal) * 100), item.visitors > 0 ? 8 : 0);
                            const leadsH = Math.max(Math.round((item.leads / maxVal) * 100), item.leads > 0 ? 8 : 0);

                            return (
                              <div
                                key={idx}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => setPinnedPeriod(isPinned ? null : item.period)}
                                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
                                title="Click to pin this period"
                              >
                                {/* Column Backdrop */}
                                <div
                                  className={`absolute inset-0 rounded-xl transition-all duration-150 ${
                                    isSelected
                                      ? 'bg-amber-100/70 ring-2 ring-amber-400/80'
                                      : 'group-hover:bg-slate-100/70'
                                  }`}
                                />

                                {/* Bars Area */}
                                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-44 relative z-10 px-0.5">
                                  {activeMetrics.clicks && (
                                    <div
                                      style={{ height: `${clicksH}%` }}
                                      className="flex-1 max-w-[12px] bg-blue-600 rounded-t-sm transition-all duration-200 group-hover:brightness-110 shadow-2xs"
                                    />
                                  )}
                                  {activeMetrics.pageviews && (
                                    <div
                                      style={{ height: `${viewsH}%` }}
                                      className="flex-1 max-w-[12px] bg-amber-500 rounded-t-sm transition-all duration-200 group-hover:brightness-110 shadow-2xs"
                                    />
                                  )}
                                  {activeMetrics.visitors && (
                                    <div
                                      style={{ height: `${visitorsH}%` }}
                                      className="flex-1 max-w-[12px] bg-emerald-600 rounded-t-sm transition-all duration-200 group-hover:brightness-110 shadow-2xs"
                                    />
                                  )}
                                  {activeMetrics.leads && (
                                    <div
                                      style={{ height: `${leadsH}%` }}
                                      className="flex-1 max-w-[12px] bg-purple-600 rounded-t-sm transition-all duration-200 group-hover:brightness-110 shadow-2xs"
                                    />
                                  )}
                                </div>

                                {/* Label */}
                                <span
                                  className={`text-[10px] sm:text-[11px] font-mono truncate w-full text-center mt-2 relative z-10 transition-all ${
                                    isSelected ? 'font-bold text-slate-900' : 'text-slate-600'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM: FOOTER LEGEND & UX GUIDE */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs"></span> Clicks
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span> Pageviews
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-2xs"></span> Visitors
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shadow-2xs"></span> Leads
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      💡 Tip: Click scorecard cards above to toggle metrics • Hover / touch chart to inspect values
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Top Clicks Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>🔥 Most Clicked Buttons & CTAs</span>
                  </h2>
                  <p className="text-xs text-slate-500">Elements visitors interact with most frequently</p>
                </div>
                <span className="text-xs font-medium text-slate-400">Aggregated across all pages</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats?.topClicks && stats.topClicks.length > 0 ? (
                  stats.topClicks.map((click, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex items-start justify-between gap-3 hover:bg-slate-100/70 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-sm truncate" title={click.element_text}>
                          {click.element_text}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5" title={click.element_target}>
                          {click.element_target || click.page_path}
                        </div>
                      </div>
                      <div className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold whitespace-nowrap shadow-xs">
                        {click.click_count} clicks
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-3 py-4 text-center">No clicks recorded in this period yet.</p>
                )}
              </div>
            </div>

            {/* Real-time Event Feed */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Live Activity Feed</h2>
                  <p className="text-xs text-slate-500">Every interaction recorded in real time</p>
                </div>

                {/* Filter Search inside Stream */}
                <div className="relative">
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Filter live stream..."
                    className="px-3.5 py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition w-56 shadow-xs"
                  />
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                  {eventSearch && (
                    <button
                      onClick={() => setEventSearch('')}
                      className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Who (Visitor / Lead)</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Element / Details</th>
                      <th className="py-3 px-4">Page</th>
                      <th className="py-3 px-4 text-right">Journey</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono" title={`${formatIST(ev.created_at)} IST`}>
                            {formatTimeAgo(ev.created_at)}
                            <span className="block text-[10px] text-slate-400 font-sans">
                              {formatIST(ev.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {ev.identified_name ? (
                              <span className="font-bold text-amber-700 font-sans">
                                🌟 {ev.identified_name}
                                {ev.identified_contact && (
                                  <span className="block text-[11px] text-slate-500 font-normal">
                                    {ev.identified_contact}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {ev.visitor_id.slice(0, 8)}...
                              </span>
                            )}
                            {(() => {
                              const vFlag = stats?.flags?.find(
                                (f) => f.target_value.toLowerCase() === ev.visitor_id.toLowerCase()
                              );
                              if (vFlag) {
                                return (
                                  <span className="block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 w-fit bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                                    🚩 {vFlag.flag_type}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-slate-700">
                              {ev.city ? `${decodeURIComponent(ev.city).replace(/%20/g, ' ')}, ` : ''}
                              {ev.country || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                ev.event_type === 'click'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : ev.event_type === 'form_submit'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : ev.event_type === 'rage_click'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                                  : ev.event_type === 'copy'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : ev.event_type === 'search'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {ev.event_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-sans" title={ev.element_text || ev.element_target}>
                            <span className="text-slate-900 font-medium">{ev.element_text || ev.element_target || '-'}</span>
                            {ev.metadata?.productTitle && (
                              <span className="block text-[11px] text-amber-700 font-semibold">
                                Product: {ev.metadata.productTitle}
                              </span>
                            )}
                            {ev.metadata?.searchQuery && (
                              <span className="block text-[11px] text-slate-500">
                                via Search: "{ev.metadata.searchQuery}"{ev.metadata?.resultRank ? ` (#${ev.metadata.resultRank})` : ''}
                              </span>
                            )}
                            {ev.metadata?.partNumber && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                Part #{ev.metadata.partNumber}
                              </span>
                            )}
                            {ev.metadata?.action === 'search_category_filter' && ev.metadata?.category && (
                              <span className="block text-[11px] text-amber-600 font-medium">
                                Filter: {ev.metadata.category}
                              </span>
                            )}
                            {ev.metadata?.action === 'search_modal_close' && ev.metadata?.reason && (
                              <span className="block text-[11px] text-slate-400">
                                Closed: {ev.metadata.reason}{ev.metadata?.queryAtClose ? ` • Query: "${ev.metadata.queryAtClose}"` : ''}
                              </span>
                            )}
                            {ev.metadata?.copiedText && (
                              <span className="block text-[11px] text-amber-800">
                                Copied: "{ev.metadata.copiedText}"
                              </span>
                            )}
                            {ev.metadata?.query && (
                              <span className="block text-[11px] text-indigo-700">
                                Searched: "{ev.metadata.query}" ({ev.metadata.resultsCount} results)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-[140px] font-mono text-[11px]" title={ev.page_path}>
                            {ev.page_path}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openVisitorJourney(ev.visitor_id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition shadow-xs"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          No matching interaction events found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT ENQUIRY PERFORMANCE (CLICKED VS NOT CLICKED) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* 1. INTERACTIVE KPI SUMMARY SCORECARD CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Card 1: Total Catalog Items */}
              <button
                type="button"
                onClick={() => {
                  setProductFilter('all');
                  setCurrentPage(1);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
                  productFilter === 'all'
                    ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30'
                    : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                title="Click to view all catalog items"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Catalog</span>
                    <span className="text-xs">📦</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-sans">
                    {productData?.summary?.totalCatalogProducts || 144}
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block font-medium">All parts in catalog</span>
              </button>

              {/* Card 2: Active Inquiries */}
              <button
                type="button"
                onClick={() => {
                  setProductFilter('active');
                  setCurrentPage(1);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
                  productFilter === 'active'
                    ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/30'
                    : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                title="Click to filter parts with active buyer inquiries"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Active Inquiries</span>
                    {productData?.summary?.totalCatalogProducts ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {Math.round(((productData.summary.withEnquiriesCount || 0) / productData.summary.totalCatalogProducts) * 100)}%
                      </span>
                    ) : null}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 font-sans">
                    {productData?.summary?.withEnquiriesCount || 0}
                  </div>
                </div>
                <span className="text-[11px] text-emerald-800/80 mt-2 block font-medium">Direct buyer demand ⚡</span>
              </button>

              {/* Card 3: High Demand (>= 2 Inquiries) */}
              <button
                type="button"
                onClick={() => {
                  setProductFilter('high_demand');
                  setCurrentPage(1);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
                  productFilter === 'high_demand'
                    ? 'border-green-600 ring-2 ring-green-500/40 bg-green-50/30'
                    : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                title="Click to filter high demand parts (2+ inquiries)"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider block">High Demand</span>
                    <span className="text-xs">🔥</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-green-700 mt-1 font-sans">
                    {productData?.summary?.highDemandCount || 0}
                  </div>
                </div>
                <span className="text-[11px] text-green-800/80 mt-2 block font-medium">2+ quote inquiries</span>
              </button>

              {/* Card 4: Opportunity (Views > 0, Enquiries = 0) */}
              <button
                type="button"
                onClick={() => {
                  setProductFilter('opportunity');
                  setCurrentPage(1);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
                  productFilter === 'opportunity'
                    ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30'
                    : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                title="Click to view high-traffic parts that need pricing/photo attention"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Opportunity</span>
                    <span className="text-xs">👀</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-sans">
                    {productData?.summary?.opportunityCount || 0}
                  </div>
                </div>
                <span className="text-[11px] text-amber-800/80 mt-2 block font-medium">Viewed, no inquiry yet</span>
              </button>

              {/* Card 5: Cold Inventory */}
              <button
                type="button"
                onClick={() => {
                  setProductFilter('zero');
                  setCurrentPage(1);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
                  productFilter === 'zero'
                    ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30'
                    : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                title="Click to filter cold inventory with zero inquiries"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Cold Inventory</span>
                    <span className="text-xs">❄️</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 font-sans">
                    {productData?.summary?.zeroEnquiriesCount || 0}
                  </div>
                </div>
                <span className="text-[11px] text-rose-700/80 mt-2 block font-medium">0 buyer inquiries</span>
              </button>
            </div>

            {/* 2. MAIN REPORT CONTAINER */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
              {/* Toolbar Row 1: Heading & Status Filter Pills */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Product Enquiry Demand Report</span>
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      {sortedProducts.length} items
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      🇮🇳 IST
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {productFilter === 'all' && 'Showing all catalog products with demand metrics, views, and enquiries.'}
                    {productFilter === 'active' && 'Showing products that received verified WhatsApp enquiries or calls.'}
                    {productFilter === 'high_demand' && 'Showing fast-moving products with 2 or more buyer enquiries.'}
                    {productFilter === 'opportunity' && 'High-traffic products viewed by buyers that have zero enquiries — prime targets for price/photo updates!'}
                    {productFilter === 'zero' && 'Showing catalog products with zero buyer enquiries in this period.'}
                  </p>
                </div>

                {/* Status Filter Tabs (5 Presets) */}
                <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-slate-200/80 text-xs self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setProductFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      productFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({productData?.products?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductFilter('active');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      productFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ color: productFilter === 'active' ? '#ffffff' : undefined }}
                  >
                    ⚡ Active ({productData?.summary?.withEnquiriesCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductFilter('high_demand');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      productFilter === 'high_demand'
                        ? 'bg-green-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ color: productFilter === 'high_demand' ? '#ffffff' : undefined }}
                  >
                    🔥 High Demand ({productData?.summary?.highDemandCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductFilter('opportunity');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      productFilter === 'opportunity'
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ color: productFilter === 'opportunity' ? '#ffffff' : undefined }}
                  >
                    👀 Opportunity ({productData?.summary?.opportunityCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductFilter('zero');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      productFilter === 'zero'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ color: productFilter === 'zero' ? '#ffffff' : undefined }}
                  >
                    ❄️ Cold ({productData?.summary?.zeroEnquiriesCount || 0})
                  </button>
                </div>
              </div>

              {/* Toolbar Row 2: Search, Category, Brand, View Switcher & Action Buttons */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl mb-5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[220px] sm:min-w-[260px]">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search title, part #, brand, OEM..."
                      className="w-full px-3.5 py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Filter (Generous width to avoid text clipping) */}
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => {
                      setProductCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="min-w-[160px] px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
                  >
                    <option value="all">All Categories ({availableCategories.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Brand Filter */}
                  <select
                    value={productBrandFilter}
                    onChange={(e) => {
                      setProductBrandFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="min-w-[150px] px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
                  >
                    <option value="all">All Brands ({availableBrands.length})</option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-end">
                  {/* View Mode Toggle: Auto / Cards / Table */}
                  <div className="bg-white p-0.5 rounded-xl flex items-center border border-slate-200 shadow-xs text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('auto')}
                      title="Responsive (Cards on mobile, Table on desktop)"
                      style={{ color: viewMode === 'auto' ? '#ffffff' : undefined }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        viewMode === 'auto'
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      title="Grid Card View"
                      style={{ color: viewMode === 'cards' ? '#ffffff' : undefined }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>⊞</span>
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      title="Compact Table View"
                      style={{ color: viewMode === 'table' ? '#ffffff' : undefined }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>☰</span>
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>

                  {/* Rows / Page Size Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={-1}>All</option>
                    </select>
                  </div>

                  {/* 1-Click Copy Part Numbers */}
                  <button
                    type="button"
                    onClick={handleCopyFilteredPartNumbers}
                    title="Copy unique part numbers of visible products to clipboard"
                    className="px-2.5 sm:px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{copiedPartNumbersFeedback ? '✓' : '📋'}</span>
                    <span>{copiedPartNumbersFeedback ? 'Copied!' : 'Copy Part #s'}</span>
                  </button>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title="Export current filtered list to CSV"
                    className="px-2.5 sm:px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* 3. MOBILE & GRID CARD VIEW */}
              <div className={`${viewMode === 'cards' ? 'block' : viewMode === 'table' ? 'hidden' : 'block md:hidden'}`}>
                {paginatedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {paginatedProducts.map((p) => {
                      const isHighDemand = p.enquire_clicks >= 2;
                      const isActive = p.enquire_clicks > 0;
                      const isOpportunity = p.views > 0 && p.enquire_clicks === 0;

                      return (
                        <div
                          key={p.slug}
                          className="bg-white border border-slate-200/90 hover:border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Header: Category & Demand Badge */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium truncate max-w-[140px]">
                                {p.category}
                              </span>
                              {isHighDemand ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                                  <span>🔥</span>
                                  <span>High Demand</span>
                                </span>
                              ) : isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Active Demand</span>
                                </span>
                              ) : isOpportunity ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span>👀</span>
                                  <span>Opportunity</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  <span>Zero Enquiries</span>
                                </span>
                              )}
                            </div>

                            {/* Product Title & Brand */}
                            <div className="mb-3">
                              <button
                                type="button"
                                onClick={() => setInspectedProduct(p)}
                                className="font-bold text-slate-900 hover:text-amber-600 transition text-sm leading-snug line-clamp-2 text-left cursor-pointer"
                                title="Click to inspect demand details"
                              >
                                {p.title}
                              </button>
                              {p.brand && (
                                <span className="block text-xs text-slate-500 mt-0.5 truncate">{p.brand}</span>
                              )}
                            </div>

                            {/* Part Number with 1-Tap Copy */}
                            <div className="flex items-center gap-2 mb-3.5">
                              <span className="text-[11px] text-slate-400 font-medium">Part #:</span>
                              {p.part_number && p.part_number !== '-' ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPart(p.part_number, e)}
                                  title="Click to copy part number"
                                  className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    copiedPart === p.part_number
                                      ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                      : 'bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 border border-slate-200'
                                  }`}
                                >
                                  {copiedPart === p.part_number ? (
                                    <>
                                      <span>✓</span>
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>📋</span>
                                      <span className="font-semibold">{p.part_number}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">None</span>
                              )}
                            </div>

                            {/* 3-Metric Scorecard Grid */}
                            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 mb-3 text-center">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Views</span>
                                <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{p.views}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Enquiries</span>
                                <span className={`text-base font-extrabold mt-0.5 block ${p.enquire_clicks > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {p.enquire_clicks}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Conv. %</span>
                                <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{p.conversion_rate}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Quick Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span title={p.last_enquired_at ? `${formatIST(p.last_enquired_at)} IST` : undefined}>
                              Last: <strong className="text-slate-700 font-mono font-medium">{p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInspectedProduct(p)}
                                className="px-2 py-1 rounded-lg font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                              >
                                ⚡ Inspect
                              </button>
                              <Link
                                href={getProductUrl(p)}
                                target="_blank"
                                className="p-1 text-slate-400 hover:text-slate-700 transition"
                                title="Open Live Page"
                              >
                                ↗
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                    <p className="text-sm font-medium">No products match your current search or filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setProductFilter('all');
                        setProductCategoryFilter('all');
                        setProductBrandFilter('all');
                        setProductSearch('');
                        setCurrentPage(1);
                      }}
                      className="mt-3 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* 4. COMPACT DESKTOP TABLE VIEW */}
              <div className={`${viewMode === 'table' ? 'block' : viewMode === 'cards' ? 'hidden' : 'hidden md:block'}`}>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200 select-none">
                      <tr>
                        {/* Sticky Left Column: Product Name */}
                        <th
                          onClick={() => handleSort('title')}
                          className="py-3 px-4 sticky left-0 bg-slate-50 z-20 cursor-pointer hover:bg-slate-100/90 transition shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Product Name</span>
                            <span className={`text-xs ${sortField === 'title' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Category */}
                        <th
                          onClick={() => handleSort('category')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Category</span>
                            <span className={`text-xs ${sortField === 'category' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Part Number */}
                        <th
                          onClick={() => handleSort('part_number')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Part Number</span>
                            <span className={`text-xs ${sortField === 'part_number' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'part_number' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Page Views */}
                        <th
                          onClick={() => handleSort('views')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Page Views</span>
                            <span className={`text-xs ${sortField === 'views' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'views' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Enquire Clicks */}
                        <th
                          onClick={() => handleSort('clicks')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Enquiries</span>
                            <span className={`text-xs ${sortField === 'clicks' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'clicks' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Conversion Rate */}
                        <th
                          onClick={() => handleSort('conversion')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Conversion</span>
                            <span className={`text-xs ${sortField === 'conversion' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'conversion' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Demand Status */}
                        <th className="py-3 px-4">Demand Status</th>

                        {/* Last Enquired */}
                        <th
                          onClick={() => handleSort('last_enquired')}
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/90 transition"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Last Enquired</span>
                            <span className={`text-xs ${sortField === 'last_enquired' ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                              {sortField === 'last_enquired' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* Quick Inspector & Live Link */}
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedProducts.length > 0 ? (
                        paginatedProducts.map((p, idx) => {
                          const isHighDemand = p.enquire_clicks >= 2;
                          const isActive = p.enquire_clicks > 0;
                          const isOpportunity = p.views > 0 && p.enquire_clicks === 0;

                          return (
                            <tr
                              key={p.slug || idx}
                              onClick={() => setInspectedProduct(p)}
                              className="group hover:bg-amber-50/40 transition-colors cursor-pointer"
                              title="Click row to inspect demand details"
                            >
                              {/* Sticky Left Column: Product Name */}
                              <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate sticky left-0 bg-white group-hover:bg-amber-50/40 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]" title={p.title}>
                                <span className="hover:text-amber-600 font-bold transition">
                                  {p.title}
                                </span>
                                {p.brand && (
                                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5 truncate">{p.brand}</span>
                                )}
                              </td>

                              {/* Category */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                                  {p.category}
                                </span>
                              </td>

                              {/* Part Number with 1-Click Copy */}
                              <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {p.part_number && p.part_number !== '-' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyPart(p.part_number, e)}
                                    title="Click to copy part number"
                                    className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded transition cursor-pointer ${
                                      copiedPart === p.part_number
                                        ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                        : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200/80'
                                    }`}
                                  >
                                    {copiedPart === p.part_number ? (
                                      <>
                                        <span>✓</span>
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="opacity-50">📋</span>
                                        <span>{p.part_number}</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="font-mono text-slate-400">-</span>
                                )}
                              </td>

                              {/* Views */}
                              <td className="py-3 px-4 text-center font-bold text-slate-800">
                                {p.views}
                              </td>

                              {/* Enquire Clicks */}
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-block shadow-2xs ${
                                    isHighDemand
                                      ? 'bg-green-100 text-green-800 border border-green-300'
                                      : isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'text-slate-400 bg-slate-100'
                                  }`}
                                >
                                  {p.enquire_clicks}
                                </span>
                              </td>

                              {/* Conversion Rate */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                                    <div
                                      className={`h-1.5 rounded-full ${p.conversion_rate >= 10 ? 'bg-emerald-500' : p.conversion_rate > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                                      style={{ width: `${Math.min(p.conversion_rate, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-600 font-medium">{p.conversion_rate}%</span>
                                </div>
                              </td>

                              {/* Demand Status */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {isHighDemand ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                                    <span>🔥</span>
                                    <span>High Demand</span>
                                  </span>
                                ) : isActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Active Demand</span>
                                  </span>
                                ) : isOpportunity ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span>👀</span>
                                    <span>Opportunity</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    <span>Zero Inquiries</span>
                                  </span>
                                )}
                              </td>

                              {/* Last Enquired */}
                              <td className="py-3 px-4 text-right text-slate-500 font-mono" title={p.last_enquired_at ? `${formatIST(p.last_enquired_at)} IST` : undefined}>
                                {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectedProduct(p)}
                                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                                    title="Open Demand Inspector"
                                  >
                                    ⚡ Inspect
                                  </button>
                                  <Link
                                    href={getProductUrl(p)}
                                    target="_blank"
                                    className="p-1 text-slate-400 hover:text-slate-700 transition font-bold"
                                    title="Open Live Product Page"
                                  >
                                    ↗
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            <p className="text-sm font-medium">No products match your current search or filters.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setProductFilter('all');
                                setProductCategoryFilter('all');
                                setProductBrandFilter('all');
                                setProductSearch('');
                                setCurrentPage(1);
                              }}
                              className="mt-3 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. PAGINATION BAR */}
              {sortedProducts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <strong className="text-slate-900 font-semibold">{pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
                      <strong className="text-slate-900 font-semibold">
                        {pageSize === -1 ? sortedProducts.length : Math.min(currentPage * pageSize, sortedProducts.length)}
                      </strong> of{' '}
                      <strong className="text-slate-900 font-semibold">{sortedProducts.length}</strong> products
                    </span>
                    {pageSize !== -1 && (
                      <span className="text-slate-400 hidden sm:inline">• Page {currentPage} of {totalPages}</span>
                    )}
                  </div>

                  {pageSize !== -1 && totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition cursor-pointer"
                      >
                        ← Prev
                      </button>

                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                          .map((item, i, arr) => {
                            const prev = arr[i - 1];
                            const showEllipsis = prev && item - prev > 1;
                            return (
                              <React.Fragment key={item}>
                                {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                                <button
                                  type="button"
                                  onClick={() => setCurrentPage(item)}
                                  style={{ color: currentPage === item ? '#ffffff' : undefined }}
                                  className={`w-8 h-8 rounded-lg font-medium transition text-xs cursor-pointer ${
                                    currentPage === item
                                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {item}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. PRODUCT DEMAND INSPECTOR SLIDE-OVER DRAWER MODAL */}
            {inspectedProduct && (
              <div
                className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn"
                onClick={() => setInspectedProduct(null)}
              >
                <div
                  className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200 animate-slideLeft"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drawer Header */}
                  <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          {inspectedProduct.category}
                        </span>
                        {inspectedProduct.enquire_clicks >= 2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                            🔥 High Demand
                          </span>
                        ) : inspectedProduct.enquire_clicks > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ⚡ Active Demand
                          </span>
                        ) : inspectedProduct.views > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            👀 Opportunity
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            ❄️ Cold Inventory
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedProduct(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                        title="Close Drawer"
                      >
                        ✕
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-2.5 leading-snug">
                      {inspectedProduct.title}
                    </h3>
                    {inspectedProduct.brand && (
                      <p className="text-xs text-slate-500 mt-1">
                        Compatible with: <strong className="text-slate-700">{inspectedProduct.brand}</strong>
                      </p>
                    )}
                  </div>

                  {/* Drawer Content */}
                  <div className="p-5 sm:p-6 space-y-6 flex-1">
                    {/* Part Number & Live Page Link Box */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Part Number</span>
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {inspectedProduct.part_number || 'None'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {inspectedProduct.part_number && inspectedProduct.part_number !== '-' && (
                          <button
                            type="button"
                            onClick={() => handleCopyPart(inspectedProduct.part_number)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {copiedPart === inspectedProduct.part_number ? '✓ Copied!' : '📋 Copy Part #'}
                          </button>
                        )}
                        <Link
                          href={getProductUrl(inspectedProduct)}
                          target="_blank"
                          style={{ color: '#ffffff' }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Live Page</span>
                          <span>↗</span>
                        </Link>
                      </div>
                    </div>

                    {/* 4 Performance Metric Boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Views</span>
                        <span className="text-xl font-extrabold text-slate-900 mt-1 block font-mono">{inspectedProduct.views}</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Enquiries</span>
                        <span className="text-xl font-extrabold text-emerald-600 mt-1 block font-mono">{inspectedProduct.enquire_clicks}</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Conversion</span>
                        <span className="text-xl font-extrabold text-slate-800 mt-1 block font-mono">{inspectedProduct.conversion_rate}%</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Last Inquiry</span>
                        <span className="text-xs font-semibold text-slate-700 mt-2 block font-mono">
                          {inspectedProduct.last_enquired_at ? formatTimeAgo(inspectedProduct.last_enquired_at) : 'Never'}
                        </span>
                      </div>
                    </div>

                    {/* Test WhatsApp Inquiry Button */}
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <span>💬 Test Buyer WhatsApp Link</span>
                        </h4>
                        <p className="text-[11px] text-emerald-700/80 mt-0.5">
                          Open WhatsApp with the exact pre-filled message buyers see
                        </p>
                      </div>
                      <a
                        href={getWhatsAppTestUrl(inspectedProduct)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#ffffff' }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                      >
                        <span>Test WhatsApp ↗</span>
                      </a>
                    </div>

                    {/* Live Interaction Events Log for this Specific Part */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>⚡ Recent Interaction Events</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold font-mono">
                            {inspectedProductEvents.length} events
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400">Stream History</span>
                      </div>

                      {inspectedProductEvents.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {inspectedProductEvents.map((ev, idx) => (
                            <div
                              key={ev.id || idx}
                              className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    ev.event_type === 'click'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : ev.event_type === 'form_submit'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {ev.event_type}
                                  </span>
                                  <span className="font-semibold text-slate-900 truncate">
                                    {ev.element_text || ev.page_title || 'Product View'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                                  <span>{ev.city ? `${ev.city}, ${ev.country}` : 'India'}</span>
                                  <span>•</span>
                                  <span>{ev.device_type || 'Mobile'}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(ev.created_at)}</span>
                                </div>
                              </div>
                              {ev.visitor_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectedProduct(null);
                                    openVisitorJourney(ev.visitor_id);
                                  }}
                                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 underline whitespace-nowrap cursor-pointer"
                                  title="Inspect Full Visitor Journey"
                                >
                                  Journey ↗
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          No recent interaction events recorded for this specific item in the current cache.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">MM Earthmovers Inventory Intelligence</span>
                    <button
                      type="button"
                      onClick={() => setInspectedProduct(null)}
                      className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIENCE, GEOLOCATION & TRAFFIC SOURCES */}
        {activeTab === 'audience' && (() => {
          // Compute totals for percentages
          const totalGeoVisitors = (stats?.topCountries || []).reduce((acc, c) => acc + (parseInt(c.visitor_count, 10) || 0), 0) || (Number(stats?.kpis?.totalVisitors) || 1);
          const totalSessions = (stats?.topReferrers || []).reduce((acc, r) => acc + (parseInt(r.count, 10) || 0), 0) || 1;
          const totalDevices = (stats?.devices || []).reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0) || 1;
          const mobileCount = stats?.devices?.find(d => d.device_type?.toLowerCase() === 'mobile')?.count || '0';
          const mobilePct = Math.round(((parseInt(mobileCount, 10) || 0) / totalDevices) * 100);

          // Group Referrers into Channels
          const channelMap = new Map<string, { count: number; icon: string; color: string; bg: string }>();
          (stats?.topReferrers || []).forEach((ref) => {
            const ch = getChannelCategory(ref.referrer);
            const cur = channelMap.get(ch.name) || { count: 0, icon: ch.icon, color: ch.color, bg: ch.bg };
            cur.count += parseInt(ref.count, 10) || 0;
            channelMap.set(ch.name, cur);
          });
          const channelsList = Array.from(channelMap.entries()).map(([name, data]) => ({
            name,
            ...data,
            pct: Math.round((data.count / totalSessions) * 100),
          })).sort((a, b) => b.count - a.count);

          // Top Country & City for Scorecards
          const topCountry = stats?.topCountries?.[0];
          const topCity = stats?.topCities?.[0];
          const topChannel = channelsList[0];

          // Filtered Cities and Countries based on geoSearch and geoTab
          const q = geoSearch.toLowerCase().trim();
          const filteredCountries = (stats?.topCountries || []).filter((c) => {
            if (geoTab === 'india' && c.country_code !== 'IN' && c.country.toLowerCase() !== 'india') return false;
            if (geoTab === 'international' && (c.country_code === 'IN' || c.country.toLowerCase() === 'india')) return false;
            if (q) return c.country.toLowerCase().includes(q) || c.country_code.toLowerCase().includes(q);
            return true;
          });

          const filteredCities = (stats?.topCities || []).filter((c) => {
            const cityDecoded = decodeURIComponent(c.city).replace(/%20/g, ' ');
            if (geoTab === 'india' && c.country.toLowerCase() !== 'india') return false;
            if (geoTab === 'international' && c.country.toLowerCase() === 'india') return false;
            if (q) {
              return (
                cityDecoded.toLowerCase().includes(q) ||
                (c.region || '').toLowerCase().includes(q) ||
                c.country.toLowerCase().includes(q)
              );
            }
            return true;
          });

          const filteredRegions = (stats?.topRegions || []).filter((r) => {
            if (geoTab === 'india' && r.country.toLowerCase() !== 'india') return false;
            if (geoTab === 'international' && r.country.toLowerCase() === 'india') return false;
            if (q) return r.region.toLowerCase().includes(q) || r.country.toLowerCase().includes(q);
            return true;
          });

          return (
            <div className="space-y-6">
              {/* 1. TOP GEO & SOURCES KPI SUMMARY SCORECARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Top Country */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Top Market</span>
                    <span className="text-xl">{topCountry ? getCountryFlag(topCountry.country_code) : '🌐'}</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1 font-sans truncate">
                    {topCountry ? topCountry.country : 'Unknown'}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {topCountry ? `${topCountry.visitor_count} visitors (${Math.round(((parseInt(topCountry.visitor_count, 10) || 0) / totalGeoVisitors) * 100)}% of traffic)` : 'No geo data'}
                  </span>
                </div>

                {/* Top Commercial Hub City */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Top Hub City</span>
                    <span className="text-xl">🏙️</span>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-sans truncate">
                    {topCity ? decodeURIComponent(topCity.city).replace(/%20/g, ' ') : 'Unknown'}
                  </div>
                  <span className="text-[11px] text-emerald-800/80 mt-1 block truncate">
                    {topCity ? `${topCity.region ? `${topCity.region}, ` : ''}${topCity.country} • ${topCity.visitor_count} visitors` : 'No city data'}
                  </span>
                </div>

                {/* Primary Acquisition Channel */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Primary Channel</span>
                    <span className="text-xl">{topChannel?.icon || '🔗'}</span>
                  </div>
                  <div className="text-2xl font-extrabold text-blue-700 mt-1 font-sans truncate">
                    {topChannel ? topChannel.name : 'Direct'}
                  </div>
                  <span className="text-[11px] text-blue-800/80 mt-1 block">
                    {topChannel ? `${topChannel.count} sessions (${topChannel.pct}% of traffic)` : 'Direct visits'}
                  </span>
                </div>

                {/* Mobile Buyer Share */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Mobile Share</span>
                    <span className="text-xl">📱</span>
                  </div>
                  <div className="text-2xl font-extrabold text-purple-700 mt-1 font-sans">
                    {mobilePct}% Mobile
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-200/80">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${mobilePct}%` }}></div>
                  </div>
                </div>
              </div>

              {/* 2. UNIFIED GEOGRAPHIC INTELLIGENCE HUB (Minimalist & Feature-Rich) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
                {/* Master Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>📍 Commercial Geographic Intelligence</span>
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        Live Cloudflare Geo
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Procurement footprint and buyer inquiries mapped across industrial mining clusters, domestic states, and export markets
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* View Switcher: Cities / States / Countries */}
                    <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setGeoLevel('cities')}
                        style={{ color: geoLevel === 'cities' ? '#ffffff' : undefined }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          geoLevel === 'cities'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🏙️</span>
                        <span>Cities ({filteredCities.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeoLevel('regions')}
                        style={{ color: geoLevel === 'regions' ? '#ffffff' : undefined }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          geoLevel === 'regions'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🏛️</span>
                        <span>States ({filteredRegions.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeoLevel('countries')}
                        style={{ color: geoLevel === 'countries' ? '#ffffff' : undefined }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          geoLevel === 'countries'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🌍</span>
                        <span>Countries ({filteredCountries.length})</span>
                      </button>
                    </div>

                    {/* Scope Toggle: All / India / International */}
                    <div className="bg-slate-100/80 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setGeoTab('all')}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                          geoTab === 'all'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeoTab('india')}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                          geoTab === 'india'
                            ? 'bg-white text-emerald-800 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🇮🇳</span>
                        <span>India</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeoTab('international')}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                          geoTab === 'international'
                            ? 'bg-white text-blue-800 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🌐</span>
                        <span>Export</span>
                      </button>
                    </div>

                    {/* Search Geo */}
                    <div className="relative min-w-[160px] sm:min-w-[190px]">
                      <input
                        type="text"
                        value={geoSearch}
                        onChange={(e) => setGeoSearch(e.target.value)}
                        placeholder="Search location..."
                        className="w-full px-3 py-1.5 pl-7 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                      {geoSearch && (
                        <button
                          type="button"
                          onClick={() => setGeoSearch('')}
                          className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Export Geo CSV */}
                    <button
                      type="button"
                      onClick={handleExportGeoCSV}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Export Geographic & Acquisition Data to CSV"
                    >
                      <span>📥</span>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Minimalist Macro Summary Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-600">Top Inquiring Hub:</span>
                    <strong className="text-slate-900">
                      {topCity ? `${decodeURIComponent(topCity.city).replace(/%20/g, ' ')}, ${topCity.region || topCity.country}` : 'None'}
                    </strong>
                    {topCity?.inquiries_count && parseInt(topCity.inquiries_count, 10) > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {topCity.inquiries_count} RFQs
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                    <span>
                      🇮🇳 India Domestic: <strong className="text-slate-800">{Math.round(((parseInt(topCountry?.visitor_count || '0', 10) || 0) / totalGeoVisitors) * 100)}%</strong>
                    </span>
                    <span>•</span>
                    <span>
                      🌐 Export Inquiries: <strong className="text-slate-800">{Math.max(100 - Math.round(((parseInt(topCountry?.visitor_count || '0', 10) || 0) / totalGeoVisitors) * 100), 0)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Master Interactive Data Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4"># Rank &amp; Commercial Hub</th>
                        <th className="py-3 px-4">Region / Market</th>
                        <th className="py-3 px-4 text-center">Visitors &amp; Share</th>
                        <th className="py-3 px-4 text-center">Buyer Intent &amp; RFQs</th>
                        <th className="py-3 px-4 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* LEVEL 1: CITIES (Default & Primary B2B View) */}
                      {geoLevel === 'cities' && (
                        filteredCities.length > 0 ? (
                          filteredCities.map((city, idx) => {
                            const count = parseInt(city.visitor_count, 10) || 0;
                            const pct = Math.round((count / totalGeoVisitors) * 100);
                            const cityClean = decodeURIComponent(city.city).replace(/%20/g, ' ');
                            const inquiries = parseInt(city.inquiries_count || '0', 10);
                            const cluster = getIndustrialClusterTag(cityClean);
                            const flag = getCountryFlag(city.country_code || (city.country.toLowerCase() === 'india' ? 'IN' : 'UN'));

                            return (
                              <tr key={idx} className="hover:bg-amber-50/20 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-lg">{flag}</span>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                        <span>{cityClean}</span>
                                        {cluster && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cluster.bg}`}>
                                            {cluster.icon} {cluster.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-slate-400">
                                        {city.region ? `${city.region}, ` : ''}{city.country}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  {city.region ? (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                                      {city.region}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="font-mono font-bold text-slate-900 text-xs">
                                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                                  </div>
                                  <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                                    <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  {inquiries > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span>💬</span>
                                      <span>{inquiries} RFQ{inquiries > 1 ? 's' : ''} Generated</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Browsing</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('stream');
                                        setEventSearch(cityClean);
                                      }}
                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                                      title={`Filter Live Stream for ${cityClean}`}
                                    >
                                      ⚡ Stream
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('products');
                                      }}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                                      title="Inspect Demand"
                                    >
                                      Demand
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                              No matching cities found in this filter range.
                            </td>
                          </tr>
                        )
                      )}

                      {/* LEVEL 2: STATES / REGIONS */}
                      {geoLevel === 'regions' && (
                        filteredRegions.length > 0 ? (
                          filteredRegions.map((region, idx) => {
                            const count = parseInt(region.visitor_count, 10) || 0;
                            const pct = Math.round((count / totalGeoVisitors) * 100);
                            const inquiries = parseInt(region.inquiries_count || '0', 10);
                            const flag = getCountryFlag(region.country_code || (region.country.toLowerCase() === 'india' ? 'IN' : 'UN'));

                            return (
                              <tr key={idx} className="hover:bg-amber-50/20 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-lg">{flag}</span>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs">
                                        {region.region}
                                      </div>
                                      <span className="text-[11px] text-slate-400">{region.country}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                                    {region.country}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="font-mono font-bold text-slate-900 text-xs">
                                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                                  </div>
                                  <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                                    <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  {inquiries > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span>💬</span>
                                      <span>{inquiries} RFQ{inquiries > 1 ? 's' : ''}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Browsing</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('stream');
                                      setEventSearch(region.region);
                                    }}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                                  >
                                    ⚡ Stream
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                              No regional state data matches the filter.
                            </td>
                          </tr>
                        )
                      )}

                      {/* LEVEL 3: COUNTRIES */}
                      {geoLevel === 'countries' && (
                        filteredCountries.length > 0 ? (
                          filteredCountries.map((country, idx) => {
                            const count = parseInt(country.visitor_count, 10) || 0;
                            const pct = Math.round((count / totalGeoVisitors) * 100);
                            const inquiries = parseInt(country.inquiries_count || '0', 10);
                            const flag = getCountryFlag(country.country_code);

                            return (
                              <tr key={idx} className="hover:bg-amber-50/20 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-xl">{flag}</span>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs">
                                        {country.country}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">({country.country_code})</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                                    {country.country_code === 'IN' ? 'Domestic' : 'International / Export'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="font-mono font-bold text-slate-900 text-xs">
                                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                                  </div>
                                  <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                                    <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  {inquiries > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span>💬</span>
                                      <span>{inquiries} RFQ{inquiries > 1 ? 's' : ''}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Browsing</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('stream');
                                      setEventSearch(country.country);
                                    }}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                                  >
                                    ⚡ Stream
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                              No country data matches the filter.
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. ACQUISITION CHANNELS & TRAFFIC SOURCES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card: Traffic Acquisition Channels */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>🚦 Acquisition Channels</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Categorized breakdown of inbound buyer channels</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 font-semibold">
                      {totalSessions} sessions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {channelsList.length > 0 ? (
                      channelsList.map((ch, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <span className="text-base">{ch.icon}</span>
                              <span>{ch.name}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {ch.count} sessions <span className="text-slate-400 font-normal">({ch.pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.max(ch.pct, 4)}%`, backgroundColor: ch.color }}></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No session sources captured yet.</p>
                    )}
                  </div>
                </div>

                {/* Card: Top Referrer URLs & Domains */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>🔗 Top Referrer URLs & Domains</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Exact external referral sources driving traffic</p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Top {stats?.topReferrers?.length || 0}</span>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {stats?.topReferrers && stats.topReferrers.length > 0 ? (
                      stats.topReferrers.map((ref, idx) => {
                        const count = parseInt(ref.count, 10) || 0;
                        const pct = Math.round((count / totalSessions) * 100);
                        const ch = getChannelCategory(ref.referrer);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:bg-slate-100/70 transition">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-sm">{ch.icon}</span>
                              <span className="font-mono font-medium text-slate-800 truncate" title={ref.referrer}>
                                {ref.referrer}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 ml-3 shrink-0">
                              {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No referrer data captured yet.</p>
                    )}
                  </div>

                  {/* UTM Marketing Campaigns Sub-table (if available) */}
                  {stats?.utmCampaigns && stats.utmCampaigns.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        📢 Active UTM Campaigns
                      </span>
                      <div className="space-y-1.5">
                        {stats.utmCampaigns.map((utm, i) => (
                          <div key={i} className="flex items-center justify-between text-xs font-mono p-2 bg-amber-50/60 border border-amber-200/60 rounded-lg">
                            <span className="truncate text-amber-900">
                              {utm.utm_campaign || utm.utm_source || 'Campaign'} <span className="text-[10px] text-amber-600">({utm.utm_medium || 'medium'})</span>
                            </span>
                            <span className="font-bold text-amber-800">{utm.count} visits</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. HARDWARE & SOFTWARE ECOSYSTEM (Devices, OS, Browsers) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>💻 Technology, Device & Browser Ecosystem</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Visitor devices, operating systems, and client software</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Hardware Breakdown</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Box 1: Device Category */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                        <span>📱 Device Category</span>
                      </h4>
                      <div className="space-y-3">
                        {stats?.devices?.map((d, i) => {
                          const count = parseInt(d.count, 10) || 0;
                          const pct = Math.round((count / totalDevices) * 100);
                          const icon = d.device_type?.toLowerCase() === 'mobile' ? '📱' : d.device_type?.toLowerCase() === 'tablet' ? '📟' : '💻';
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="capitalize text-slate-700 flex items-center gap-1.5">
                                  <span>{icon}</span>
                                  <span>{d.device_type}</span>
                                </span>
                                <span className="font-mono font-bold text-slate-900">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                                <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Operating Systems */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                        <span>⚙️ Operating Systems</span>
                      </h4>
                      <div className="space-y-3">
                        {stats?.operatingSystems && stats.operatingSystems.length > 0 ? (
                          stats.operatingSystems.map((os, i) => {
                            const count = parseInt(os.count, 10) || 0;
                            const pct = Math.round((count / totalDevices) * 100);
                            const osName = os.os || 'Other';
                            const icon = osName.toLowerCase().includes('android') ? '🤖' : osName.toLowerCase().includes('ios') ? '🍎' : osName.toLowerCase().includes('win') ? '🪟' : osName.toLowerCase().includes('mac') ? '🍏' : '💻';
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs font-medium mb-1">
                                  <span className="text-slate-700 flex items-center gap-1.5 truncate">
                                    <span>{icon}</span>
                                    <span className="truncate">{osName}</span>
                                  </span>
                                  <span className="font-mono font-bold text-slate-900">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                                  <div className="bg-emerald-600 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 py-3 text-center">No OS data captured yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Box 3: Browsers */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                        <span>🌐 Web Browsers</span>
                      </h4>
                      <div className="space-y-3">
                        {stats?.browsers?.map((b, i) => {
                          const count = parseInt(b.count, 10) || 0;
                          const pct = Math.round((count / totalDevices) * 100);
                          const bName = b.browser || 'Other';
                          const icon = bName.toLowerCase().includes('chrome') ? '🟢' : bName.toLowerCase().includes('safari') ? '🔵' : bName.toLowerCase().includes('firefox') ? '🟠' : bName.toLowerCase().includes('edge') ? '🔷' : '🌐';
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-slate-700 flex items-center gap-1.5 truncate">
                                  <span>{icon}</span>
                                  <span className="truncate">{bName}</span>
                                </span>
                                <span className="font-mono font-bold text-slate-900">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                                <div className="bg-purple-600 h-1 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: SEARCH DEMAND, DWELL & COMPETITOR SENTINEL */}
        {activeTab === 'demand' && (() => {
          // Computed Metrics
          const totalSearches =
            stats?.searchSummary?.totalSearches ??
            (stats?.searchQueries || []).reduce((acc, s) => acc + (parseInt(s.count, 10) || 0), 0);
          const zeroResultsCount =
            stats?.searchSummary?.zeroResultsSearches ??
            (stats?.searchQueries || [])
              .filter((s) => s.zero_results)
              .reduce((acc, s) => acc + (parseInt(s.count, 10) || 0), 0);
          const catalogGapRate =
            stats?.searchSummary?.catalogGapRate ??
            (totalSearches > 0 ? Math.round((zeroResultsCount / totalSearches) * 100) : 0);

          const bounceUnder10 = parseInt(stats?.dwellBuckets?.bounce_under_10s || '0', 10);
          const skim1060 = parseInt(stats?.dwellBuckets?.skim_10_60s || '0', 10);
          const engaged15 = parseInt(stats?.dwellBuckets?.engaged_1_5m || '0', 10);
          const deep515 = parseInt(stats?.dwellBuckets?.deep_5_15m || '0', 10);
          const zombie15 = parseInt(stats?.dwellBuckets?.zombie_over_15m || '0', 10);
          const totalDwellSessions = (bounceUnder10 + skim1060 + engaged15 + deep515 + zombie15) || 1;

          const deepReadPct = Math.round(((engaged15 + deep515) / totalDwellSessions) * 100);
          const bouncePct = Math.round((bounceUnder10 / totalDwellSessions) * 100);
          const skimPct = Math.round((skim1060 / totalDwellSessions) * 100);
          const engagedPct = Math.round((engaged15 / totalDwellSessions) * 100);
          const deepPct = Math.round((deep515 / totalDwellSessions) * 100);
          const zombiePct = Math.round((zombie15 / totalDwellSessions) * 100);

          // Filter Search Queries
          const filteredSearches = (stats?.searchQueries || []).filter((q) => {
            const matchesQuery =
              !searchQueryFilter.trim() ||
              q.query_text.toLowerCase().includes(searchQueryFilter.toLowerCase());
            if (!matchesQuery) return false;
            if (searchTab === 'zero') return q.zero_results;
            if (searchTab === 'stock') return !q.zero_results;
            if (searchTab === 'parts')
              return /^[0-9A-Za-z]+([-\s/._][0-9A-Za-z]+)*$/.test(q.query_text) && q.query_text.length >= 3;
            return true;
          });

          // Filter Sentinel Sessions
          const suspiciousSessions = (stats?.suspiciousDwellSessions || []).filter((s) => {
            if (sentinelFilter === 'flagged') return !!s.flag;
            if (sentinelFilter === 'scrapers') return s.heuristic === 'rapid_scraper';
            if (sentinelFilter === 'lurkers')
              return s.heuristic === 'lurker_zombie' || s.heuristic === 'competitor_recon';
            return true;
          });

          const flaggedCount = (stats?.flags || []).length;
          const detectedAlertsCount = stats?.suspiciousDwellSessions?.length || 0;

          return (
            <div className="space-y-6">
              {/* Transient Action / Feedback Banner */}
              {activeFlagFeedback && (
                <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg border border-amber-500/40">
                  <span className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">🛡️ Surveillance Action:</span>
                    <span>{activeFlagFeedback}</span>
                  </span>
                  <button
                    onClick={() => setActiveFlagFeedback(null)}
                    className="text-slate-400 hover:text-white font-bold ml-4"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 1. TOP EXECUTIVE KPI SUMMARY CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Buyer Searches</span>
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold">🔍</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{totalSearches}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-600">{totalSearches - zeroResultsCount} in-stock</span>
                    <span>•</span>
                    <span className="font-semibold text-rose-600">{zeroResultsCount} unmet</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Catalog Gap Rate</span>
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold">💡</span>
                  </div>
                  <div className="text-2xl font-extrabold text-rose-600">{catalogGapRate}%</div>
                  <div className="mt-1.5 text-xs text-slate-500 truncate">
                    {zeroResultsCount > 0 ? `${zeroResultsCount} parts sought by buyers` : '100% catalog coverage'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Deep Specs Dwell</span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold">⏱️</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{deepReadPct}%</div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {engaged15 + deep515} sessions &gt; 1m evaluating
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sentinel Alerts</span>
                    <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold">🛡️</span>
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700">{detectedAlertsCount}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-amber-800">{flaggedCount} watchlisted</span>
                    <span>•</span>
                    <span>Passive surveillance</span>
                  </div>
                </div>
              </div>

              {/* 2. SECTION A: BUYER SEARCH DEMAND & CATALOG GAP FINDER */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>🔍 Buyer Search Demand & Catalog Gap Finder</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {filteredSearches.length} queries
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct market demand signals: uncover exact part numbers searched, stock hits, and zero-result sourcing leads
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportSearchCSV}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                      title="Download full search demand report as CSV"
                    >
                      <span>📥</span>
                      <span>Export Demand CSV</span>
                    </button>
                  </div>
                </div>

                {/* Search Demand Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Filter search queries, part numbers, or brands..."
                      value={searchQueryFilter}
                      onChange={(e) => setSearchQueryFilter(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                    />
                    {searchQueryFilter && (
                      <button
                        onClick={() => setSearchQueryFilter('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                      onClick={() => setSearchTab('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        searchTab === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({stats?.searchQueries?.length || 0})
                    </button>
                    <button
                      onClick={() => setSearchTab('zero')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        searchTab === 'zero'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      🔥 0 Results / Gaps ({zeroResultsCount})
                    </button>
                    <button
                      onClick={() => setSearchTab('stock')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        searchTab === 'stock'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      ✅ In Stock ({totalSearches - zeroResultsCount})
                    </button>
                    <button
                      onClick={() => setSearchTab('parts')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        searchTab === 'parts'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      🔢 Part Numbers
                    </button>
                  </div>
                </div>

                {/* 2-Column Split: Search Demand Table (Left) + High-Intent Clipboard Copies (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2/3): Search Demand Table */}
                  <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Search Query / Part Keyword</th>
                          <th className="py-3 px-4">Stock Match</th>
                          <th className="py-3 px-4 text-center">Inquiry Count</th>
                          <th className="py-3 px-4 text-right">Procurement Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSearches.length > 0 ? (
                          filteredSearches.map((s, idx) => {
                            const count = parseInt(s.count, 10) || 0;
                            const sharePct = totalSearches > 0 ? Math.round((count / totalSearches) * 100) : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 font-mono text-xs">
                                    "{s.query_text}"
                                  </div>
                                  <div className="w-32 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                    <div
                                      className={`h-1 rounded-full ${s.zero_results ? 'bg-rose-500' : 'bg-blue-600'}`}
                                      style={{ width: `${Math.max(sharePct, 6)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  {s.zero_results ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <span>⚠️</span>
                                      <span>0 Results (Catalog Gap)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span>✓</span>
                                      <span>In Stock Match</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <span className="font-mono font-bold text-slate-900 text-xs">{count}</span>
                                  <span className="text-[10px] text-slate-400 block">{sharePct}% share</span>
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                          navigator.clipboard.writeText(s.query_text);
                                          setActiveFlagFeedback(`Copied query "${s.query_text}" to clipboard`);
                                          setTimeout(() => setActiveFlagFeedback(null), 2500);
                                        }
                                      }}
                                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-xs transition"
                                      title="Copy query text"
                                    >
                                      📋
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductSearch(s.query_text);
                                        setActiveTab('products');
                                      }}
                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold transition"
                                      title="Inspect demand in Products Report tab"
                                    >
                                      View Demand →
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                              No search queries match the active filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column (1/3): High-Intent Clipboard Copies */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span>📋 High-Intent Copied Items</span>
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Micro-Conversions
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Buyers copying part numbers or contact details to clipboard indicates intent to purchase or quote offline.
                      </p>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {stats?.topCopiedItems && stats.topCopiedItems.length > 0 ? (
                          stats.topCopiedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white border border-amber-200/80 rounded-xl text-xs shadow-2xs hover:border-amber-300 transition"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-amber-900 font-mono truncate" title={item.copied_text}>
                                  {item.copied_text}
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                  {item.item_type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[11px] whitespace-nowrap">
                                  {item.count}×
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPart(item.copied_text, e)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                                  title="Copy"
                                >
                                  📋
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 py-6 text-center">No clipboard actions recorded yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                      💡 Tip: Copied part numbers often precede direct WhatsApp RFQs or dealer phone inquiries.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SECTION B: DWELL TIME & DEEP READING DISTRIBUTION */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>⏱️ Dwell Time & Deep Reading Distribution</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Distinguish genuine buyers carefully examining machine specifications from rapid skimmers and idle tabs
                    </p>
                  </div>

                  {/* Toggle: Page Dwell vs Section Attention */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setDwellView('pages')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        dwellView === 'pages'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📄 Page-Level Dwell
                    </button>
                    <button
                      onClick={() => setDwellView('sections')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        dwellView === 'sections'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📑 Section Attention
                    </button>
                  </div>
                </div>

                {/* Horizontal Segmented Dwell Distribution Curve */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Session Dwell Time Distribution</span>
                    <span className="font-mono text-slate-500">{totalDwellSessions} recorded sessions</span>
                  </div>

                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200/80">
                    <div
                      style={{ width: `${Math.max(bouncePct, bounceUnder10 > 0 ? 2 : 0)}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`<10s Bounce: ${bounceUnder10} sessions (${bouncePct}%)`}
                    />
                    <div
                      style={{ width: `${Math.max(skimPct, skim1060 > 0 ? 2 : 0)}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`10s-60s Skim: ${skim1060} sessions (${skimPct}%)`}
                    />
                    <div
                      style={{ width: `${Math.max(engagedPct, engaged15 > 0 ? 2 : 0)}%` }}
                      className="bg-blue-500 h-full transition-all"
                      title={`1m-5m Engaged: ${engaged15} sessions (${engagedPct}%)`}
                    />
                    <div
                      style={{ width: `${Math.max(deepPct, deep515 > 0 ? 2 : 0)}%` }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`5m-15m Deep Study: ${deep515} sessions (${deepPct}%)`}
                    />
                    <div
                      style={{ width: `${Math.max(zombiePct, zombie15 > 0 ? 2 : 0)}%` }}
                      className="bg-purple-600 h-full transition-all"
                      title={`>15m Stale/Zombie: ${zombie15} sessions (${zombiePct}%)`}
                    />
                  </div>

                  {/* Distribution Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 pt-3 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-slate-600 font-medium">&lt;10s Bounce:</span>
                      <span className="font-bold text-slate-900 font-mono">{bounceUnder10} ({bouncePct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span className="text-slate-600 font-medium">10-60s Skim:</span>
                      <span className="font-bold text-slate-900 font-mono">{skim1060} ({skimPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      <span className="text-slate-600 font-medium">1-5m Engaged:</span>
                      <span className="font-bold text-slate-900 font-mono">{engaged15} ({engagedPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      <span className="text-slate-600 font-medium">5-15m Deep:</span>
                      <span className="font-bold text-slate-900 font-mono">{deep515} ({deepPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                      <span className="text-slate-600 font-medium">&gt;15m Stale:</span>
                      <span className="font-bold text-slate-900 font-mono">{zombie15} ({zombiePct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Dwell Breakdown Table */}
                {dwellView === 'pages' ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Page Path & Catalog View</th>
                          <th className="py-3 px-4 text-center">Sessions</th>
                          <th className="py-3 px-4 text-center">Pageviews</th>
                          <th className="py-3 px-4 text-center">Avg. Dwell Time</th>
                          <th className="py-3 px-4 text-right">Engagement Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats?.pageDwellStats && stats.pageDwellStats.length > 0 ? (
                          stats.pageDwellStats.map((p, idx) => {
                            const dwellSec = parseFloat(p.avg_dwell_seconds) || 0;
                            const isDeep = dwellSec >= 60;
                            const isHealthy = dwellSec >= 20 && dwellSec < 60;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 px-4">
                                  <div className="font-mono text-xs font-bold text-slate-900 truncate max-w-sm" title={p.page_path}>
                                    {p.page_path}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-sm">
                                    {p.page_title}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-xs font-bold text-slate-700">
                                  {p.sessions}
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-xs font-bold text-slate-700">
                                  {p.views}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-mono font-extrabold text-sm text-slate-900">
                                    {p.avg_dwell_seconds}s
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      isDeep
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : isHealthy
                                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {isDeep ? '🌟 Deep Specification Review' : isHealthy ? '📖 Healthy Reading' : '⚡ Quick Skim'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                              No page-level dwell data recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats?.sectionAttention && stats.sectionAttention.length > 0 ? (
                      stats.sectionAttention.map((sec, idx) => {
                        const cleanName = sec.section_id
                          .replace(/-/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        const dwellNum = parseFloat(sec.avg_dwell_seconds) || 0;
                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 shadow-xs">
                            <div
                              className="text-[11px] uppercase text-amber-700 font-bold mb-1 tracking-wider truncate"
                              title={sec.section_id}
                            >
                              #{cleanName}
                            </div>
                            <div className="text-2xl font-extrabold text-slate-900">{sec.avg_dwell_seconds}s</div>
                            <div className="text-xs text-slate-500 mt-1">{sec.views} view sessions</div>
                            <div className="w-full bg-slate-200/80 rounded-full h-1 mt-3 overflow-hidden">
                              <div
                                className="bg-amber-600 h-1 rounded-full"
                                style={{ width: `${Math.min(Math.max((dwellNum / 40) * 100, 8), 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500 col-span-4 py-6 text-center">No section view data collected yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 4. SECTION C: COMPETITOR & NUISANCE SENTINEL ("FLAG INSTANTLY" FEATURE) */}
              <div className="bg-white border-2 border-amber-500/30 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-bold">🛡️</span>
                      <h2 className="text-base font-bold text-slate-900">
                        Competitor & Nuisance Surveillance Sentinel
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Passive Behavioral Tagging
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Automated dwell and velocity heuristics detect rapid catalog scraping, automated crawlers, and abnormal stale lurkers.
                      <strong className="text-slate-700 ml-1">No automated blocking is applied</strong> — tag and flag visitors instantly to monitor them across all dashboard views.
                    </p>
                  </div>

                  {/* Sentinel Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
                    <button
                      onClick={() => setSentinelFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        sentinelFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Candidates ({stats?.suspiciousDwellSessions?.length || 0})
                    </button>
                    <button
                      onClick={() => setSentinelFilter('flagged')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        sentinelFilter === 'flagged'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      🚩 Flagged ({flaggedCount})
                    </button>
                    <button
                      onClick={() => setSentinelFilter('scrapers')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        sentinelFilter === 'scrapers'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      🤖 Scrapers
                    </button>
                    <button
                      onClick={() => setSentinelFilter('lurkers')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        sentinelFilter === 'lurkers'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      🕵️ Lurkers &amp; Zombies
                    </button>
                  </div>
                </div>

                {/* Heuristic Guidance Notice */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-[11px] bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/70">
                  <div className="flex items-start gap-2">
                    <span className="text-base">🤖</span>
                    <div>
                      <strong className="text-purple-900 block">Rapid Catalog Scraper</strong>
                      <span className="text-slate-600">Visited 3+ distinct part pages in under 25s (pricing/inventory scraping script).</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-base">🕵️</span>
                    <div>
                      <strong className="text-amber-900 block">Competitor Recon / Lurker</strong>
                      <span className="text-slate-600">Over 10-20 minutes open on product technical specs with 0 click interactions.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-base">🚩</span>
                    <div>
                      <strong className="text-rose-900 block">Instant Tagging (No Block)</strong>
                      <span className="text-slate-600">Clicking "Flag" tags them across Live Stream &amp; Visitors without breaking their page access.</span>
                    </div>
                  </div>
                </div>

                {/* Candidate Sessions Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Visitor / Network Entity</th>
                        <th className="py-3 px-4">Origin Hub</th>
                        <th className="py-3 px-4 text-center">Dwell &amp; Velocity</th>
                        <th className="py-3 px-4">Heuristic Diagnostic</th>
                        <th className="py-3 px-4 text-center">Surveillance Flag</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suspiciousSessions.length > 0 ? (
                        suspiciousSessions.map((s, idx) => {
                          const isFlagged = !!s.flag;
                          const isBusy = flaggingInProgress === s.visitor_id;
                          return (
                            <tr
                              key={idx}
                              className={`transition ${
                                isFlagged ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              {/* Visitor ID & Device */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900">
                                    {s.visitor_id.slice(0, 10)}...
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                        navigator.clipboard.writeText(s.visitor_id);
                                        setActiveFlagFeedback(`Copied Visitor ID ${s.visitor_id}`);
                                        setTimeout(() => setActiveFlagFeedback(null), 2500);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-slate-700 text-xs"
                                    title="Copy full Visitor ID"
                                  >
                                    📋
                                  </button>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>{s.device_type}</span>
                                  {s.ip_address && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-slate-600">IP: {s.ip_address}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Origin Hub */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="text-xs text-slate-700 font-medium">
                                  {s.city !== 'Unknown' ? `${s.city}, ` : ''}{s.country}
                                </span>
                                <span className="block text-[10px] text-slate-400 truncate max-w-[150px]" title={s.entry_page}>
                                  Entry: {s.entry_page}
                                </span>
                              </td>

                              {/* Dwell Duration & Navigation Velocity */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className="font-mono font-extrabold text-sm text-slate-900 block">
                                  {formatDuration(s.duration_seconds)}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono block">
                                  {s.distinct_pages} pages • {s.clicks_count} clicks
                                </span>
                              </td>

                              {/* Heuristic Diagnostic */}
                              <td className="py-3 px-4">
                                {s.heuristic === 'rapid_scraper' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                    <span>🤖</span>
                                    <span>Rapid Scraper (&lt;25s on {s.distinct_pages}p)</span>
                                  </span>
                                )}
                                {s.heuristic === 'lurker_zombie' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span>🕵️</span>
                                    <span>Specs Lurker (0 clicks in {formatDuration(s.duration_seconds)})</span>
                                  </span>
                                )}
                                {s.heuristic === 'competitor_recon' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    <span>🚩</span>
                                    <span>Competitor Recon (&gt;20m dwell)</span>
                                  </span>
                                )}
                                {s.heuristic === 'deep_evaluator' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span>⭐</span>
                                    <span>Deep Catalog Evaluator</span>
                                  </span>
                                )}
                              </td>

                              {/* Active Flag Status */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {isFlagged ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                    <span>🚩</span>
                                    <span className="uppercase">{s.flag?.flag_type}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium italic">Unflagged</span>
                                )}
                              </td>

                              {/* Flag Instantly Controls & Secondary Actions */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isFlagged ? (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleRemoveFlag(s.visitor_id, s.flag?.flag_type)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                                      title="Remove surveillance flag"
                                    >
                                      {isBusy ? '...' : '✕ Unflag'}
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleToggleFlag('visitor_id', s.visitor_id, 'competitor')}
                                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded text-xs font-bold transition shadow-2xs"
                                        title="Flag as Competitor (Passive Tag)"
                                      >
                                        {isBusy ? '...' : '🚩 Competitor'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleToggleFlag('visitor_id', s.visitor_id, 'scraper')}
                                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-bold transition"
                                        title="Flag as Automated Scraper"
                                      >
                                        🤖
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openVisitorJourney(s.visitor_id)}
                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition"
                                    title="Inspect visitor click and navigation journey"
                                  >
                                    Journey
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Restrict access for visitor ${s.visitor_id.slice(0, 8)}...? This will block them from browsing parts catalog.`)) {
                                        handleEscalateRestriction('visitor_id', s.visitor_id, `Escalated from Sentinel: ${s.heuristic}`);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded text-xs transition"
                                    title="Escalate: Block this visitor from accessing catalog"
                                  >
                                    🚫
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                            No suspicious dwell or scraper sessions detected in this time range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: UNIQUE VISITORS & LEADS */}
        {activeTab === 'visitors' && (
          <div className="space-y-6">
            {/* EXECUTIVE BUYER & LEAD SCORECARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Distinct Visitors */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distinct Visitors</span>
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold shadow-2xs">👥</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {visitorSummaryCounts.total.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Unique client devices & networks in period</p>
              </div>

              {/* Card 2: Identified Leads */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Identified Leads</span>
                  <span className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center text-sm font-bold shadow-2xs">🌟</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 tracking-tight flex items-baseline gap-2">
                  {visitorSummaryCounts.leads.toLocaleString('en-IN')}
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    High Intent
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Stitched customer names & contact numbers</p>
              </div>

              {/* Card 3: WhatsApp RFQs */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">WhatsApp RFQ Inquirers</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold shadow-2xs">💬</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight flex items-baseline gap-2">
                  {visitorSummaryCounts.rfq.toLocaleString('en-IN')}
                  {visitorSummaryCounts.total > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {((visitorSummaryCounts.rfq / visitorSummaryCounts.total) * 100).toFixed(1)}% Conv
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Direct parts quote inquiries initiated</p>
              </div>

              {/* Card 4: Repeat Fleets */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Repeat Fleets (3+ Sessions)</span>
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold shadow-2xs">🔁</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight flex items-baseline gap-2">
                  {visitorSummaryCounts.repeat.toLocaleString('en-IN')}
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Fleet Accounts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Mining contractors & workshop procurement</p>
              </div>
            </div>

            {/* SEARCH, SEGMENT FILTERS & ACTIONS TOOLBAR */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, phone (+91), visitor ID, IP address, city, state, or viewed page..."
                    value={visitorSearchQuery}
                    onChange={(e) => {
                      setVisitorSearchQuery(e.target.value);
                      setVisitorPage(1);
                    }}
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition placeholder:text-slate-400"
                  />
                  {visitorSearchQuery && (
                    <button
                      onClick={() => {
                        setVisitorSearchQuery('');
                        setVisitorPage(1);
                      }}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-sm"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Right Toolbar Controls */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* Device Filter */}
                  <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-medium text-slate-600">
                    <button
                      onClick={() => { setVisitorDeviceFilter('all'); setVisitorPage(1); }}
                      className={`px-2.5 py-1 rounded-lg transition ${visitorDeviceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setVisitorDeviceFilter('mobile'); setVisitorPage(1); }}
                      className={`px-2.5 py-1 rounded-lg transition ${visitorDeviceFilter === 'mobile' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                    >
                      📱 Mobile
                    </button>
                    <button
                      onClick={() => { setVisitorDeviceFilter('desktop'); setVisitorPage(1); }}
                      className={`px-2.5 py-1 rounded-lg transition ${visitorDeviceFilter === 'desktop' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                    >
                      🖥️ Desktop
                    </button>
                  </div>

                  {/* Rows Per Page */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-1">
                    <span>Show:</span>
                    <select
                      value={visitorPageSize}
                      onChange={(e) => {
                        setVisitorPageSize(Number(e.target.value));
                        setVisitorPage(1);
                      }}
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportVisitorsCSV}
                    disabled={filteredVisitors.length === 0}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>📥</span>
                    <span>Export CSV ({filteredVisitors.length})</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchVisitors()}
                    disabled={isVisitorsLoading}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 transition shadow-xs disabled:opacity-50"
                    title="Refresh visitors directory"
                  >
                    <span className={isVisitorsLoading ? 'animate-spin inline-block' : ''}>🔄</span>
                  </button>
                </div>
              </div>

              {/* Segment Filter Pills */}
              <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setVisitorFilterTab('all'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                    visitorFilterTab === 'all'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Buyers ({visitorSummaryCounts.total})
                </button>
                <button
                  onClick={() => { setVisitorFilterTab('leads'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                    visitorFilterTab === 'leads'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <span>🌟 Identified Leads</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">{visitorSummaryCounts.leads}</span>
                </button>
                <button
                  onClick={() => { setVisitorFilterTab('rfq'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                    visitorFilterTab === 'rfq'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <span>💬 WhatsApp RFQs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">{visitorSummaryCounts.rfq}</span>
                </button>
                <button
                  onClick={() => { setVisitorFilterTab('repeat'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                    visitorFilterTab === 'repeat'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                  }`}
                >
                  <span>🔁 Repeat Fleets (3+)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">{visitorSummaryCounts.repeat}</span>
                </button>
                <button
                  onClick={() => { setVisitorFilterTab('flagged'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                    visitorFilterTab === 'flagged'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                  }`}
                >
                  <span>🚩 Flagged / Competitors</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">{visitorSummaryCounts.flagged}</span>
                </button>
                <button
                  onClick={() => { setVisitorFilterTab('restricted'); setVisitorPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                    visitorFilterTab === 'restricted'
                      ? 'bg-slate-800 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🚫 Restricted</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">{visitorSummaryCounts.restricted}</span>
                </button>
              </div>
            </div>

            {/* MASTER VISITOR & BUYER DIRECTORY TABLE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Visitor Directory & Commercial Leads</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {paginatedVisitors.length} of {filteredVisitors.length} buyers matching criteria
                  </p>
                </div>
                {contactCopiedFeedback && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in">
                    ✓ Copied {contactCopiedFeedback} to clipboard!
                  </span>
                )}
              </div>

              {filteredVisitors.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                    🔍
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No matching buyers found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try clearing your search query or switching to &apos;All Buyers&apos; to view all persistent visitor records.
                  </p>
                  {(visitorSearchQuery || visitorFilterTab !== 'all' || visitorDeviceFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setVisitorSearchQuery('');
                        setVisitorFilterTab('all');
                        setVisitorDeviceFilter('all');
                        setVisitorPage(1);
                      }}
                      className="mt-4 px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50/90 text-slate-500 font-semibold tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-4">Buyer / Lead Profile</th>
                        <th className="py-3.5 px-4">Location & Industrial Cluster</th>
                        <th className="py-3.5 px-4">Network & Client</th>
                        <th className="py-3.5 px-4">Commercial Intent</th>
                        <th className="py-3.5 px-4">Activity Lifecycle</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedVisitors.map((vis) => {
                        const isTargetRestricted =
                          vis.is_restricted ||
                          restrictions.some(
                            (r) =>
                              r.value.toLowerCase() === vis.visitor_id.toLowerCase() ||
                              (vis.ip_address && r.value === vis.ip_address)
                          );
                        const targetFlag = stats?.flags?.find(
                          (f) =>
                            f.target_value.toLowerCase() === vis.visitor_id.toLowerCase() ||
                            (vis.ip_address && f.target_value === vis.ip_address)
                        );
                        const isTargetFlagged = vis.is_flagged || Boolean(targetFlag);
                        const effectiveFlagType = targetFlag?.flag_type || vis.flag_type;
                        const industrialCluster = getIndustrialBadge(vis.region, vis.city);

                        // Clean WhatsApp contact
                        const cleanPhone = vis.identified_contact ? vis.identified_contact.replace(/\D/g, '') : null;
                        const fullPhone = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : null;
                        const waDirectUrl = fullPhone
                          ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(
                              `Hello ${vis.identified_name || 'Sir'}, thank you for visiting MM Earthmovers. How may we assist you with spare parts availability and quotes today?`
                            )}`
                          : null;

                        return (
                          <tr key={vis.visitor_id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Column 1: Buyer Profile */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                {vis.identified_name ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-amber-900 text-sm flex items-center gap-1">
                                        🌟 {vis.identified_name}
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                        Identified Lead
                                      </span>
                                    </div>
                                    {vis.identified_contact && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
                                        <span>📞 {vis.identified_contact}</span>
                                        <button
                                          onClick={(e) => copyToClipboard(vis.identified_contact!, 'Phone', e)}
                                          className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                                          title="Copy phone number"
                                        >
                                          📋
                                        </button>
                                        {waDirectUrl && (
                                          <a
                                            href={waDirectUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 transition"
                                            title="Message on WhatsApp"
                                          >
                                            💬 WhatsApp
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                                      {vis.visitor_id.slice(0, 14)}...
                                    </span>
                                    <button
                                      onClick={(e) => copyToClipboard(vis.visitor_id, 'Visitor ID', e)}
                                      className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                                      title="Copy full Visitor ID"
                                    >
                                      📋
                                    </button>
                                  </div>
                                )}

                                {/* Badges Strip */}
                                <div className="flex items-center flex-wrap gap-1 pt-0.5">
                                  {isTargetFlagged && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                      🚩 {effectiveFlagType || 'Flagged'}
                                    </span>
                                  )}
                                  {Number(vis.whatsapp_clicks) > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      💬 {vis.whatsapp_clicks} RFQ{Number(vis.whatsapp_clicks) > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {vis.total_sessions >= 3 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      🔁 Repeat Fleet ({vis.total_sessions}x)
                                    </span>
                                  )}
                                  {vis.last_rfq_part && (
                                    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 max-w-[200px] truncate" title={vis.last_rfq_part}>
                                      💬 &ldquo;{vis.last_rfq_part}&rdquo;
                                    </span>
                                  )}
                                  {vis.last_page_viewed && vis.last_page_viewed.startsWith('/products/') && (
                                    <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[180px] truncate" title={vis.last_page_viewed}>
                                      📦 {vis.last_page_viewed.replace('/products/', '')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Location & Industrial Hub */}
                            <td className="py-3.5 px-4 text-slate-700">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-base">{getCountryFlag(vis.country_code || vis.country || '')}</span>
                                  <span>
                                    {vis.city ? `${decodeURIComponent(vis.city).replace(/%20/g, ' ')}, ` : ''}
                                    {vis.region ? `${vis.region}, ` : ''}
                                    {vis.country || 'Unknown'}
                                  </span>
                                </div>
                                {industrialCluster && (
                                  <div>
                                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${industrialCluster.bg}`}>
                                      {industrialCluster.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Column 3: Network & Client */}
                            <td className="py-3.5 px-4 text-slate-600">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {vis.ip_address ? (
                                    <>
                                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800 border border-slate-200/60">
                                        {vis.ip_address}
                                      </span>
                                      <button
                                        onClick={(e) => copyToClipboard(vis.ip_address!, 'IP', e)}
                                        className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                                        title="Copy IP"
                                      >
                                        📋
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 font-mono text-xs">—</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1">
                                  <span>{vis.device_type === 'mobile' ? '📱' : vis.device_type === 'tablet' ? '📟' : '🖥️'}</span>
                                  <span>{vis.device_type || 'Desktop'}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]" title={`${vis.browser || ''} on ${vis.os || ''}`}>
                                    {vis.browser || 'Browser'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 4: Commercial Engagement */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-bold text-slate-900">{vis.total_sessions}</span>
                                  <span className="text-slate-500 text-[11px]">sessions</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-bold text-slate-900">{vis.total_clicks}</span>
                                  <span className="text-slate-500 text-[11px]">clicks</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  {Number(vis.total_copies || 0) > 0 && (
                                    <span className="text-indigo-700 font-medium bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                      📋 {vis.total_copies} part copies
                                    </span>
                                  )}
                                  {Number(vis.total_events || 0) > 0 && (
                                    <span>{vis.total_events} events</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 5: Activity Lifecycle */}
                            <td className="py-3.5 px-4 text-slate-500 font-mono" title={`${formatIST(vis.last_seen_at)} IST`}>
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-slate-800">
                                  {formatTimeAgo(vis.last_seen_at)}
                                </div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  {formatIST(vis.last_seen_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                                {vis.first_seen_at && vis.first_seen_at !== vis.last_seen_at && (
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    First seen: {formatIST(vis.first_seen_at, { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Column 6: Action Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end flex-wrap gap-1.5">
                                {/* Journey Button */}
                                <button
                                  onClick={() => openVisitorJourney(vis.visitor_id)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                                  title="View full clickstream audit"
                                >
                                  <span>🧭</span>
                                  <span>Journey</span>
                                </button>

                                {/* WhatsApp Direct Button */}
                                {waDirectUrl && (
                                  <a
                                    href={waDirectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                                    title="Open WhatsApp chat with lead"
                                  >
                                    <span>💬</span>
                                    <span>Chat</span>
                                  </a>
                                )}

                                {/* Sentinel Flag Action */}
                                {isTargetFlagged ? (
                                  <button
                                    onClick={() => handleRemoveFlag(vis.ip_address || vis.visitor_id, effectiveFlagType || undefined)}
                                    disabled={flaggingInProgress === (vis.ip_address || vis.visitor_id)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                                    title="Remove competitor/scraper sentinel flag"
                                  >
                                    Unflag
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleToggleFlag(
                                        vis.ip_address ? 'ip' : 'visitor_id',
                                        vis.ip_address || vis.visitor_id,
                                        'competitor',
                                        `Flagged from Visitors directory (${vis.city || vis.country || 'Unknown'})`
                                      )
                                    }
                                    disabled={flaggingInProgress === (vis.ip_address || vis.visitor_id)}
                                    className="px-2 py-1 bg-amber-50/70 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-lg text-xs font-medium transition"
                                    title="Flag as Competitor Lurker (Sentinel passive monitoring)"
                                  >
                                    🚩 Flag
                                  </button>
                                )}

                                {/* Restrict / Unrestrict Button */}
                                {isTargetRestricted ? (
                                  <button
                                    onClick={() => handleRemoveRestriction(vis.visitor_id)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                                    title="Remove restriction and allow access"
                                  >
                                    Unrestrict
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleAddRestriction(
                                        vis.ip_address || vis.visitor_id,
                                        vis.ip_address ? 'ip' : 'visitor_id',
                                        `Restricted from Visitors directory (${vis.city || vis.country || 'Unknown'})`
                                      )
                                    }
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                                    title="Block this visitor/IP from viewing products"
                                  >
                                    Restrict
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAGINATION BAR */}
              {filteredVisitors.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div>
                    Showing <strong className="text-slate-900 font-semibold">{((visitorPage - 1) * visitorPageSize) + 1}</strong> to{' '}
                    <strong className="text-slate-900 font-semibold">
                      {Math.min(visitorPage * visitorPageSize, filteredVisitors.length)}
                    </strong>{' '}
                    of <strong className="text-slate-900 font-semibold">{filteredVisitors.length}</strong> buyers
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setVisitorPage((p) => Math.max(1, p - 1))}
                      disabled={visitorPage <= 1}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="px-2.5 py-1 font-semibold text-slate-800">
                      Page {visitorPage} of {visitorTotalPages}
                    </span>
                    <button
                      onClick={() => setVisitorPage((p) => Math.min(visitorTotalPages, p + 1))}
                      disabled={visitorPage >= visitorTotalPages}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ACCESS CONTROL & RESTRICTIONS */}
        {activeTab === 'restrictions' && (
          <div className="space-y-6">
            {/* Feedback Notification Banner */}
            {restrictionActionFeedback && (
              <div
                className={`p-4 rounded-xl text-sm font-semibold border flex items-center justify-between ${
                  restrictionActionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span>{restrictionActionFeedback.text}</span>
                <button
                  onClick={() => setRestrictionActionFeedback(null)}
                  className="text-xs underline ml-4 hover:opacity-80"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Card 1: Add Restriction Form */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🛡️</span>
                <h2 className="text-base font-bold text-slate-900">Add IP or Visitor ID to Restriction List</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6 max-w-2xl leading-relaxed">
                Restricted IPs or Visitor IDs will be automatically blocked from accessing product catalog pages,
                machine models, and catalog search APIs (redirected to{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">/#contact</code>).
                They will see the targeted parts assistance inquiry form instead, and their scraping activity will be dropped from product analytics.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRestriction();
                }}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200/80"
              >
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Restriction Type
                  </label>
                  <select
                    value={newRestrictionType}
                    onChange={(e) => setNewRestrictionType(e.target.value as 'ip' | 'visitor_id')}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ip">IP Address (e.g. 49.37.155.22)</option>
                    <option value="visitor_id">Visitor ID (UUID)</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {newRestrictionType === 'ip' ? 'IP Address' : 'Visitor ID (UUID)'}{' '}
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newRestrictionType === 'ip'
                        ? 'e.g. 103.212.144.50'
                        : 'e.g. b1747b10-0ca4-4db3-9d58-eecc3cfe6479'
                    }
                    value={newRestrictionInput}
                    onChange={(e) => setNewRestrictionInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nuisance scraper / competitor"
                    value={newRestrictionNote}
                    onChange={(e) => setNewRestrictionNote(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRestriction}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingRestriction ? 'Saving...' : '+ Restrict Target'}
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Current Restrictions Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Restricted List</h3>
                  <p className="text-xs text-slate-500">Currently enforced IP addresses and Visitor IDs</p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {restrictions.length} active rule{restrictions.length === 1 ? '' : 's'}
                </span>
              </div>

              {restrictions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <span className="text-3xl block mb-2">🛡️</span>
                  <p className="text-sm font-semibold text-slate-700">No active restrictions</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Add an IP or Visitor ID above to restrict access to products.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Identifier Value</th>
                        <th className="py-3 px-4">Note / Reason</th>
                        <th className="py-3 px-4">Added On</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {restrictions.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.type === 'ip'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {r.type === 'ip' ? 'IP Address' : 'Visitor ID'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {r.value}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {r.note || <span className="text-slate-400 italic">No notes</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {formatIST(r.created_at, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })} IST
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveRestriction(r.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              Remove Rule
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* VISITOR JOURNEY MODAL (Responsive: Slide-up Bottom Sheet on Mobile, Right Drawer on Desktop) */}
      {selectedVisitorId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end md:items-stretch md:justify-end transition-opacity"
          onClick={() => setSelectedVisitorId(null)}
        >
          <div
            className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-none md:border-l border-slate-200 max-h-[88vh] md:max-h-none md:h-full p-5 sm:p-6 overflow-y-auto flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 md:hidden"></div>

            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Visitor Journey Timeline</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[220px] sm:max-w-none">
                  ID: {selectedVisitorId}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitorId(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition shadow-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 py-6">
              {isJourneyLoading ? (
                <div className="text-center py-12 text-slate-400">Loading visitor timeline...</div>
              ) : visitorJourney.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No events found for this visitor.</div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                  {visitorJourney.map((step, idx) => (
                    <div key={idx} className="relative pl-6">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                          step.event_type === 'click'
                            ? 'bg-blue-500'
                            : step.event_type === 'form_submit'
                            ? 'bg-purple-500'
                            : step.event_type === 'copy'
                            ? 'bg-amber-500'
                            : step.event_type === 'rage_click'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                      ></span>

                      <div className="text-xs text-slate-400 font-mono">
                        {formatIST(step.created_at, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} IST ({formatTimeAgo(step.created_at)})
                      </div>

                      <div className="font-semibold text-slate-900 text-sm mt-0.5">
                        <span className="capitalize">{step.event_type.replace('_', ' ')}</span>: {step.element_text || step.page_path}
                      </div>

                      {step.element_target && (
                        <div className="text-xs text-blue-600 truncate mt-0.5 font-medium">
                          Target: {step.element_target}
                        </div>
                      )}

                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                        <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 overflow-x-auto font-mono">
                          {JSON.stringify(step.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
