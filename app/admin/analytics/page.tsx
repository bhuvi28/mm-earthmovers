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
  }>;
  topCountries: Array<{ country: string; country_code: string; visitor_count: string }>;
  topCities: Array<{ city: string; country: string; visitor_count: string }>;
  devices: Array<{ device_type: string; count: string }>;
  browsers: Array<{ browser: string; count: string }>;
  topReferrers: Array<{ referrer: string; count: string }>;
  searchQueries: Array<{ query_text: string; zero_results: boolean; count: string }>;
  topCopiedItems: Array<{ copied_text: string; item_type: string; count: string }>;
  sectionAttention: Array<{
    section_id: string;
    page_path: string;
    views: string;
    avg_dwell_seconds: string;
  }>;
  topPages: Array<{ page_path: string; page_title: string; views: string }>;
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
    totalEnquireClicks: number;
  };
  products: ProductEnquiryStat[];
}

export type ProductSortField = 'clicks' | 'views' | 'conversion' | 'title' | 'category' | 'part_number' | 'last_enquired';

export default function AnalyticsDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [activeTab, setActiveTab] = useState<'stream' | 'products' | 'audience' | 'demand' | 'visitors' | 'restrictions'>('stream');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [productData, setProductData] = useState<ProductEnquiryData | null>(null);
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'zero'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
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

  // Sorting & Pagination UX States
  const [sortField, setSortField] = useState<ProductSortField>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedPart, setCopiedPart] = useState<string | null>(null);

  // Chart UX States
  const [chartMetricFilter, setChartMetricFilter] = useState<'all' | 'pageviews' | 'clicks' | 'visitors'>('all');
  const [pinnedPeriod, setPinnedPeriod] = useState<string | null>(null);

  useEffect(() => {
    setPinnedPeriod(null);
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
    }
  }, [isAuthenticated, fetchStats, fetchEvents, fetchProductEnquiries, fetchRestrictions]);

  // Auto-refresh interval (every 15 seconds)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchEvents();
      fetchProductEnquiries();
      fetchRestrictions();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchStats, fetchEvents, fetchProductEnquiries, fetchRestrictions]);

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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
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
      if (productFilter === 'zero' && p.enquire_clicks > 0) return false;

      if (productCategoryFilter !== 'all' && p.category.toLowerCase() !== productCategoryFilter.toLowerCase()) {
        return false;
      }

      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchPart = (p.part_number || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        return matchTitle || matchPart || matchCat || matchBrand;
      }
      return true;
    });
  }, [productData, productFilter, productCategoryFilter, productSearch]);

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

  // Continuous, gap-free Time Series data strictly aligned to IST
  const formattedTimeSeries = useMemo(() => {
    if (!stats?.timeSeries) return [];

    const rawMap = new Map<string, { visitors: number; pageviews: number; clicks: number }>();
    stats.timeSeries.forEach((t) => {
      rawMap.set(t.period, {
        visitors: parseInt(t.visitors, 10) || 0,
        pageviews: parseInt(t.pageviews, 10) || 0,
        clicks: parseInt(t.clicks, 10) || 0,
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
        const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0 };
        const label = `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
        result.push({
          period: periodKey,
          label,
          visitors: data.visitors,
          pageviews: data.pageviews,
          clicks: data.clicks,
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
        const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0 };
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        result.push({
          period: periodKey,
          label,
          visitors: data.visitors,
          pageviews: data.pageviews,
          clicks: data.clicks,
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
      return {
        period: t.period,
        label,
        visitors: v,
        pageviews: p,
        clicks: c,
        total: p + c,
      };
    });
  }, [stats?.timeSeries, timeRange]);

  // Aggregate stats across the visible chart time series
  const chartTotals = useMemo(() => {
    let totalViews = 0;
    let totalClicks = 0;
    let totalVisitors = 0;
    let peakPeriod = { label: '-', views: 0, clicks: 0 };

    formattedTimeSeries.forEach((t) => {
      totalViews += t.pageviews;
      totalClicks += t.clicks;
      totalVisitors += t.visitors;
      if (t.pageviews > peakPeriod.views) {
        peakPeriod = { label: t.label, views: t.pageviews, clicks: t.clicks };
      }
    });

    return { totalViews, totalClicks, totalVisitors, peakPeriod };
  }, [formattedTimeSeries]);

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
            👤 Visitors & Leads
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
            {/* Traffic & Activity Trend (IST) - Advanced Interactive UX */}
            {stats && formattedTimeSeries.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                {/* Header Row: Title & Context */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>📈 Activity & Traffic Trend</span>
                      </h2>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        IST Timezone
                      </span>
                      {chartTotals.peakPeriod.views > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          ⭐ Peak: {chartTotals.peakPeriod.label} ({chartTotals.peakPeriod.views} views)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {timeRange === 'today'
                        ? 'Hourly breakdown of visitors, pageviews, and clicks today (Indian Standard Time)'
                        : `Daily breakdown of visitors, pageviews, and clicks (${timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'All Time'}) in Indian Standard Time`}
                    </p>
                  </div>

                  {/* Interactive Metric Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200/80 rounded-xl text-xs self-start lg:self-auto">
                    <button
                      onClick={() => setChartMetricFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        chartMetricFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Metrics
                    </button>
                    <button
                      onClick={() => setChartMetricFilter('pageviews')}
                      className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        chartMetricFilter === 'pageviews'
                          ? 'bg-amber-500 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 border border-white/60"></span>
                      Pageviews ({chartTotals.totalViews})
                    </button>
                    <button
                      onClick={() => setChartMetricFilter('clicks')}
                      className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        chartMetricFilter === 'clicks'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400 border border-white/60"></span>
                      Clicks ({chartTotals.totalClicks})
                    </button>
                    <button
                      onClick={() => setChartMetricFilter('visitors')}
                      className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        chartMetricFilter === 'visitors'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white/60"></span>
                      Visitors ({chartTotals.totalVisitors})
                    </button>
                  </div>
                </div>

                {/* Pinned Period Details Banner (Touch & Click Support) */}
                {(() => {
                  const pinnedData = pinnedPeriod ? formattedTimeSeries.find((t) => t.period === pinnedPeriod) : null;
                  if (!pinnedData) return null;

                  return (
                    <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn shadow-xs">
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <span className="font-bold text-amber-900 font-mono text-xs sm:text-sm flex items-center gap-1.5">
                          <span>📌</span>
                          <span>{pinnedData.period} ({pinnedData.label} IST)</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-amber-900">
                          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block shadow-2xs"></span>
                          <span>{pinnedData.pageviews} Views</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-blue-900">
                          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block shadow-2xs"></span>
                          <span>{pinnedData.clicks} Clicks</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-emerald-900">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-2xs"></span>
                          <span>{pinnedData.visitors} Unique Visitors</span>
                        </span>
                      </div>
                      <button
                        onClick={() => setPinnedPeriod(null)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-900 hover:bg-amber-100/80 rounded-lg text-xs font-medium transition"
                        title="Clear selection"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  );
                })()}

                {/* Main Interactive Chart with Y-Axis Grid */}
                <div className="relative">
                  {(() => {
                    // Compute max value based on active filter
                    const maxVal = Math.max(
                      ...formattedTimeSeries.map((t) => {
                        if (chartMetricFilter === 'pageviews') return t.pageviews;
                        if (chartMetricFilter === 'clicks') return t.clicks;
                        if (chartMetricFilter === 'visitors') return t.visitors;
                        return Math.max(t.pageviews, t.clicks, t.visitors);
                      }),
                      5
                    );

                    return (
                      <>
                        {/* Horizontal Background Reference Guidelines & Ticks */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-9 pt-16 pr-2">
                          <div className="w-full flex items-center gap-2 border-b border-dashed border-slate-200/80">
                            <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0">{maxVal}</span>
                          </div>
                          <div className="w-full flex items-center gap-2 border-b border-dashed border-slate-200/80">
                            <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0">{Math.round(maxVal / 2)}</span>
                          </div>
                          <div className="w-full flex items-center gap-2 border-b border-slate-200">
                            <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0">0</span>
                          </div>
                        </div>

                        {/* Bar Track Container */}
                        <div className="overflow-x-auto pb-2 pl-10">
                          <div className="min-w-[480px] flex items-end gap-1 sm:gap-2 h-56 pt-16 px-1">
                            {formattedTimeSeries.map((item, idx) => {
                              const isPinned = pinnedPeriod === item.period;
                              const isFirst = idx <= 1;
                              const isLast = idx >= formattedTimeSeries.length - 2;

                              const viewsHeight = Math.max(Math.round((item.pageviews / maxVal) * 100), item.pageviews > 0 ? 8 : 0);
                              const clicksHeight = Math.max(Math.round((item.clicks / maxVal) * 100), item.clicks > 0 ? 8 : 0);
                              const visitorsHeight = Math.max(Math.round((item.visitors / maxVal) * 100), item.visitors > 0 ? 8 : 0);

                              // Position tooltip edge-safely
                              const tooltipAlignmentClass = isFirst
                                ? 'left-0 sm:left-1/2 sm:-translate-x-1/2'
                                : isLast
                                ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
                                : 'left-1/2 -translate-x-1/2';

                              return (
                                <div
                                  key={idx}
                                  onClick={() => setPinnedPeriod(isPinned ? null : item.period)}
                                  className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
                                  title="Click to pin this period"
                                >
                                  {/* Column Backdrop Track (gives generous hover/tap area) */}
                                  <div
                                    className={`absolute inset-0 rounded-xl transition-all duration-150 ${
                                      isPinned
                                        ? 'bg-amber-100/70 ring-2 ring-amber-400/80'
                                        : 'group-hover:bg-slate-100/70'
                                    }`}
                                  />

                                  {/* Hover Tooltip (High contrast & edge-safe) */}
                                  <div
                                    style={{
                                      backgroundColor: '#0f172a',
                                      color: '#ffffff',
                                      border: '1px solid #334155',
                                    }}
                                    className={`dark-banner chart-tooltip absolute -top-16 z-30 hidden group-hover:flex flex-col items-center rounded-xl py-2 px-3 shadow-2xl whitespace-nowrap pointer-events-none transition-all ${tooltipAlignmentClass}`}
                                  >
                                    <span
                                      style={{ color: '#fbbf24', fontWeight: 700 }}
                                      className="tooltip-header font-mono text-xs tracking-wide"
                                    >
                                      {item.period} ({item.label} IST)
                                    </span>
                                    <div
                                      style={{ color: '#f8fafc' }}
                                      className="flex items-center gap-2 mt-1.5 text-[11px] font-sans"
                                    >
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#f59e0b' }}></span>
                                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.pageviews}</span>
                                        <span style={{ color: '#cbd5e1' }}>views</span>
                                      </span>
                                      <span style={{ color: '#475569' }}>•</span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }}></span>
                                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.clicks}</span>
                                        <span style={{ color: '#cbd5e1' }}>clicks</span>
                                      </span>
                                      <span style={{ color: '#475569' }}>•</span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#10b981' }}></span>
                                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.visitors}</span>
                                        <span style={{ color: '#cbd5e1' }}>visitors</span>
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        backgroundColor: '#0f172a',
                                        borderRight: '1px solid #334155',
                                        borderBottom: '1px solid #334155',
                                      }}
                                      className="w-2 h-2 rotate-45 -mb-3 mt-1.5"
                                    ></div>
                                  </div>

                                  {/* Bars Area: adapts seamlessly to active Metric Filter */}
                                  <div className="w-full flex items-end justify-center gap-1 h-32 relative z-10 px-0.5">
                                    {chartMetricFilter === 'all' && (
                                      <>
                                        <div
                                          style={{ height: `${viewsHeight}%` }}
                                          className="w-1/3 max-w-[14px] bg-amber-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                                          title={`Pageviews: ${item.pageviews}`}
                                        />
                                        <div
                                          style={{ height: `${clicksHeight}%` }}
                                          className="w-1/3 max-w-[14px] bg-blue-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                                          title={`Clicks: ${item.clicks}`}
                                        />
                                        <div
                                          style={{ height: `${visitorsHeight}%` }}
                                          className="w-1/3 max-w-[14px] bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                                          title={`Visitors: ${item.visitors}`}
                                        />
                                      </>
                                    )}

                                    {chartMetricFilter === 'pageviews' && (
                                      <div className="w-full flex flex-col items-center justify-end h-full">
                                        {item.pageviews > 0 && (
                                          <span className="text-[10px] font-mono font-bold text-amber-700 mb-0.5">
                                            {item.pageviews}
                                          </span>
                                        )}
                                        <div
                                          style={{ height: `${viewsHeight}%` }}
                                          className="w-full max-w-[32px] bg-amber-500 hover:bg-amber-600 rounded-t-md transition-all duration-300 shadow-xs"
                                        />
                                      </div>
                                    )}

                                    {chartMetricFilter === 'clicks' && (
                                      <div className="w-full flex flex-col items-center justify-end h-full">
                                        {item.clicks > 0 && (
                                          <span className="text-[10px] font-mono font-bold text-blue-700 mb-0.5">
                                            {item.clicks}
                                          </span>
                                        )}
                                        <div
                                          style={{ height: `${clicksHeight}%` }}
                                          className="w-full max-w-[32px] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-300 shadow-xs"
                                        />
                                      </div>
                                    )}

                                    {chartMetricFilter === 'visitors' && (
                                      <div className="w-full flex flex-col items-center justify-end h-full">
                                        {item.visitors > 0 && (
                                          <span className="text-[10px] font-mono font-bold text-emerald-700 mb-0.5">
                                            {item.visitors}
                                          </span>
                                        )}
                                        <div
                                          style={{ height: `${visitorsHeight}%` }}
                                          className="w-full max-w-[32px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300 shadow-xs"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Period Label */}
                                  <span
                                    style={{ color: '#334155' }}
                                    className={`text-[11px] font-mono truncate w-full text-center mt-2 relative z-10 transition-all ${
                                      isPinned ? 'font-bold text-amber-700' : 'font-semibold'
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Footer Legend & Helper Tip */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-4 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block shadow-2xs"></span> Pageviews
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block shadow-2xs"></span> Inbound Clicks
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-2xs"></span> Unique Visitors
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    💡 Click/tap any bar to lock details • Hover for quick inspection
                  </span>
                </div>
              </div>
            )}

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
            {/* Product Performance Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Catalog</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-sans">
                  {productData?.summary?.totalCatalogProducts || 144}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Live products in catalog</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">With Enquiries</span>
                  {productData?.summary?.totalCatalogProducts ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {Math.round(((productData.summary.withEnquiriesCount || 0) / productData.summary.totalCatalogProducts) * 100)}%
                    </span>
                  ) : null}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 font-sans">
                  {productData?.summary?.withEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-emerald-700/80 mt-1 block">High buyer interest</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Zero Enquiries</span>
                  {productData?.summary?.totalCatalogProducts ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {Math.round(((productData.summary.zeroEnquiriesCount || 0) / productData.summary.totalCatalogProducts) * 100)}%
                    </span>
                  ) : null}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 font-sans">
                  {productData?.summary?.zeroEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-rose-700/80 mt-1 block">Cold / un-enquired inventory</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Total Enquire Clicks</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-sans">
                  {productData?.summary?.totalEnquireClicks || 0}
                </div>
                <span className="text-[11px] text-amber-700/80 mt-1 block">WhatsApp quote requests</span>
              </div>
            </div>

            {/* Main Product Table / Cards Container */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
              {/* Toolbar Row 1: Heading & Status Tabs */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Product Enquiry Demand Report</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {sortedProducts.length} items
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live tracking of buyer demand, part number inquiries, and conversion efficiency
                  </p>
                </div>

                {/* Status Filter Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs self-start md:self-auto">
                  <button
                    onClick={() => {
                      setProductFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      productFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({productData?.products?.length || 0})
                  </button>
                  <button
                    onClick={() => {
                      setProductFilter('active');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      productFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active ({productData?.summary?.withEnquiriesCount || 0})
                  </button>
                  <button
                    onClick={() => {
                      setProductFilter('zero');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      productFilter === 'zero'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cold ({productData?.summary?.zeroEnquiriesCount || 0})
                  </button>
                </div>
              </div>

              {/* Toolbar Row 2: Search, Category, View Switcher, Page Size & CSV Export */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl mb-5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search title, part #, brand..."
                      className="w-full px-3.5 py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                    {productSearch && (
                      <button
                        onClick={() => {
                          setProductSearch('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => {
                      setProductCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                  >
                    <option value="all">All Categories ({availableCategories.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Mobile Sort Dropdown (Visible on small screens) */}
                  <div className="flex sm:hidden items-center gap-1.5 w-full">
                    <span className="text-xs text-slate-500 font-medium">Sort:</span>
                    <select
                      value={`${sortField}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-') as [ProductSortField, 'asc' | 'desc'];
                        setSortField(field);
                        setSortOrder(order);
                        setCurrentPage(1);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                    >
                      <option value="clicks-desc">Enquiries (High to Low)</option>
                      <option value="clicks-asc">Enquiries (Low to High)</option>
                      <option value="views-desc">Views (High to Low)</option>
                      <option value="conversion-desc">Conversion % (High to Low)</option>
                      <option value="title-asc">Title (A → Z)</option>
                      <option value="title-desc">Title (Z → A)</option>
                      <option value="part_number-asc">Part Number (A → Z)</option>
                      <option value="last_enquired-desc">Recently Enquired</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
                  {/* View Mode Toggle: Auto / Cards / Table */}
                  <div className="bg-white p-0.5 rounded-xl flex items-center border border-slate-200 shadow-xs text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('auto')}
                      title="Responsive (Cards on mobile, Table on desktop)"
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        viewMode === 'auto'
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      title="Grid Card View"
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                        viewMode === 'cards'
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
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
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                        viewMode === 'table'
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
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
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={-1}>All</option>
                    </select>
                  </div>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title="Export current filtered list to CSV"
                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>📥</span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* 1. MOBILE CARD VIEW (Active on mobile or when cards mode is toggled) */}
              <div className={`${viewMode === 'cards' ? 'block' : viewMode === 'table' ? 'hidden' : 'block md:hidden'}`}>
                {paginatedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {paginatedProducts.map((p) => (
                      <div
                        key={p.slug}
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header: Category & Demand Badge */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium truncate max-w-[140px]">
                              {p.category}
                            </span>
                            {p.enquire_clicks > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active Demand
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Zero Inquiries
                              </span>
                            )}
                          </div>

                          {/* Product Title & Brand */}
                          <div className="mb-3">
                            <Link
                              href={getProductUrl(p)}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-amber-600 transition text-sm leading-snug line-clamp-2"
                              title={p.title}
                            >
                              {p.title}
                            </Link>
                            {p.brand && (
                              <span className="block text-xs text-slate-500 mt-0.5">{p.brand}</span>
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
                                className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg transition ${
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

                        {/* Card Footer: Last Enquired & Live Link */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span title={p.last_enquired_at ? `${formatIST(p.last_enquired_at)} IST` : undefined}>
                            Last: <strong className="text-slate-700 font-mono font-medium">{p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}</strong>
                          </span>
                          <Link
                            href={getProductUrl(p)}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                          >
                            <span>View</span>
                            <span>↗</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                    <p className="text-sm font-medium">No products match your current search or filters.</p>
                    <button
                      onClick={() => {
                        setProductFilter('all');
                        setProductCategoryFilter('all');
                        setProductSearch('');
                        setCurrentPage(1);
                      }}
                      className="mt-3 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* 2. DESKTOP TABLE VIEW (Active on desktop or when table mode is toggled) */}
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
                            <span>Enquire Clicks</span>
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

                        {/* Action Link */}
                        <th className="py-3 px-4 text-center">Live</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedProducts.length > 0 ? (
                        paginatedProducts.map((p, idx) => (
                          <tr key={p.slug || idx} className="group hover:bg-slate-50/80 transition-colors">
                            {/* Sticky Left Column: Product Name */}
                            <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]" title={p.title}>
                              <Link
                                href={getProductUrl(p)}
                                target="_blank"
                                className="hover:text-amber-600 font-semibold transition"
                              >
                                {p.title}
                              </Link>
                              {p.brand && (
                                <span className="block text-[11px] text-slate-500 font-normal mt-0.5">{p.brand}</span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                                {p.category}
                              </span>
                            </td>

                            {/* Part Number with 1-Click Copy */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {p.part_number && p.part_number !== '-' ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPart(p.part_number, e)}
                                  title="Click to copy part number"
                                  className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded transition ${
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
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-block shadow-xs ${
                                  p.enquire_clicks > 0
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
                              {p.enquire_clicks > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Active Demand
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Zero Inquiries
                                </span>
                              )}
                            </td>

                            {/* Last Enquired */}
                            <td className="py-3 px-4 text-right text-slate-500 font-mono" title={p.last_enquired_at ? `${formatIST(p.last_enquired_at)} IST` : undefined}>
                              {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                            </td>

                            {/* Live Link */}
                            <td className="py-3 px-4 text-center">
                              <Link
                                href={getProductUrl(p)}
                                target="_blank"
                                className="text-slate-400 hover:text-amber-600 font-bold transition text-xs"
                                title="Open product page in new tab"
                              >
                                ↗
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            <p className="text-sm font-medium">No products match your current search or filters.</p>
                            <button
                              onClick={() => {
                                setProductFilter('all');
                                setProductCategoryFilter('all');
                                setProductSearch('');
                                setCurrentPage(1);
                              }}
                              className="mt-3 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
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

              {/* 3. PAGINATION BAR */}
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
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition"
                      >
                        ← Prev
                      </button>

                      {/* Numeric page pills with smart windowing */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                          .reduce<(number | string)[]>((acc, p, idx, arr) => {
                            if (idx > 0 && typeof arr[idx - 1] === 'number' && p - (arr[idx - 1] as number) > 1) {
                              acc.push('...');
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            typeof item === 'string' ? (
                              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400">
                                …
                              </span>
                            ) : (
                              <button
                                key={item}
                                onClick={() => setCurrentPage(item)}
                                className={`w-8 h-8 rounded-lg font-medium transition text-xs ${
                                  currentPage === item
                                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {item}
                              </button>
                            )
                          )}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIENCE & GEOLOCATION */}
        {activeTab === 'audience' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Countries */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Top Countries</h2>
              <p className="text-xs text-slate-500 mb-4">Visitor volume by country of origin</p>
              <div className="space-y-3">
                {stats?.topCountries && stats.topCountries.length > 0 ? (
                  stats.topCountries.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-800 font-medium">
                        {c.country} <span className="text-xs text-slate-400">({c.country_code})</span>
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-xs">
                        {c.visitor_count} visitors
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No geo data yet.</p>
                )}
              </div>
            </div>

            {/* Top Cities */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Top Cities</h2>
              <p className="text-xs text-slate-500 mb-4">Cities with highest commercial interest</p>
              <div className="space-y-3">
                {stats?.topCities && stats.topCities.length > 0 ? (
                  stats.topCities.map((city, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-800 font-medium">
                        {decodeURIComponent(city.city).replace(/%20/g, ' ')}, <span className="text-xs text-slate-500">{city.country}</span>
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-xs">
                        {city.visitor_count} visitors
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No city data yet.</p>
                )}
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Traffic Sources & Referrers</h2>
              <p className="text-xs text-slate-500 mb-4">Where your buyers originate from</p>
              <div className="space-y-3">
                {stats?.topReferrers && stats.topReferrers.length > 0 ? (
                  stats.topReferrers.map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-800 truncate max-w-xs">{ref.referrer}</span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-xs">
                        {ref.count} sessions
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No referrer data yet.</p>
                )}
              </div>
            </div>

            {/* Devices & Browsers */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Devices & Browsers</h2>
              <p className="text-xs text-slate-500 mb-4">Hardware and software ecosystem</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Device Category</h3>
                  <div className="space-y-2">
                    {stats?.devices?.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="capitalize text-slate-700">{d.device_type}</span>
                        <span className="font-bold text-slate-900">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Browser</h3>
                  <div className="space-y-2">
                    {stats?.browsers?.map((b, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-700 truncate">{b.browser}</span>
                        <span className="font-bold text-slate-900">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEARCHES, DEMAND & DEAD ZONES */}
        {activeTab === 'demand' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Demand & Unsatisfied Searches */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🔍 Buyer Search Demand</span>
                  </h2>
                  <p className="text-xs text-slate-500">Keywords & part numbers searched by catalog visitors</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.searchQueries && stats.searchQueries.length > 0 ? (
                  stats.searchQueries.map((s, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3.5 rounded-xl text-sm border ${
                        s.zero_results
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : 'bg-slate-50/80 border-slate-200/90 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate">"{s.query_text}"</span>
                          {s.zero_results ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              0 Results (Cold)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs whitespace-nowrap border ${
                        s.zero_results
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-white text-slate-700 border-slate-200 shadow-xs'
                      }`}>
                        {s.count} searches
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">No search queries recorded yet.</p>
                )}
              </div>
            </div>

            {/* High Intent Text Copying */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📋 High-Intent Copied Items</span>
                  </h2>
                  <p className="text-xs text-slate-500">Part numbers and contact details copied to clipboard</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.topCopiedItems && stats.topCopiedItems.length > 0 ? (
                  stats.topCopiedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-sm"
                    >
                      <div>
                        <span className="font-bold text-amber-900">{item.copied_text}</span>
                        <span className="block text-[11px] text-slate-500 uppercase tracking-wider">{item.item_type.replace('_', ' ')}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold text-xs">
                        {item.count} times
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">No clipboard copies recorded yet.</p>
                )}
              </div>
            </div>

            {/* Section Attention & Dead Zones */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs md:col-span-2">
              <h2 className="text-base font-bold text-slate-900 mb-1">Section Attention & Dwell Time</h2>
              <p className="text-xs text-slate-500 mb-4">
                Average seconds visitors spent viewing each on-page section before scrolling
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats?.sectionAttention && stats.sectionAttention.length > 0 ? (
                  stats.sectionAttention.map((sec, idx) => {
                    const cleanName = sec.section_id
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 shadow-xs">
                        <div className="text-[11px] uppercase text-amber-700 font-bold mb-1 tracking-wider truncate" title={sec.section_id}>
                          #{cleanName}
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900">{sec.avg_dwell_seconds}s</div>
                        <div className="text-xs text-slate-500 mt-1">{sec.views} view sessions</div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 col-span-4 py-6 text-center">No section view data collected yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: UNIQUE VISITORS & LEADS */}
        {activeTab === 'visitors' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Visitor Directory & Identified Leads</h2>
            <p className="text-xs text-slate-500 mb-4">List of distinct visitors with stitched customer identities and network IPs</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Visitor / Lead Identity</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Device & OS</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {events
                    .filter((v, i, arr) => arr.findIndex((x) => x.visitor_id === v.visitor_id) === i)
                    .map((vis) => {
                      const isTargetRestricted =
                        vis.is_restricted ||
                        restrictions.some(
                          (r) =>
                            r.value.toLowerCase() === vis.visitor_id.toLowerCase() ||
                            (vis.ip_address && r.value === vis.ip_address)
                        );

                      return (
                        <tr key={vis.visitor_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            {vis.identified_name ? (
                              <div>
                                <span className="font-bold text-amber-800 text-sm font-sans flex items-center gap-1">
                                  🌟 {vis.identified_name}
                                </span>
                                <span className="block text-slate-500 text-xs mt-0.5">{vis.identified_contact}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {vis.visitor_id}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {vis.ip_address ? (
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-medium">
                                {vis.ip_address}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {vis.city ? `${decodeURIComponent(vis.city).replace(/%20/g, ' ')}, ` : ''}
                            {vis.country || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 capitalize">
                            {vis.device_type} • {vis.browser}
                          </td>
                          <td className="py-3 px-4">
                            {isTargetRestricted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                Restricted
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono" title={`${formatIST(vis.created_at)} IST`}>
                            {formatTimeAgo(vis.created_at)}
                            <span className="block text-[10px] text-slate-400 font-sans">
                              {formatIST(vis.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openVisitorJourney(vis.visitor_id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition shadow-xs"
                              >
                                Journey
                              </button>
                              {isTargetRestricted ? (
                                <button
                                  onClick={() => handleRemoveRestriction(vis.visitor_id)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                                  title="Remove restriction"
                                >
                                  Unrestrict
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleAddRestriction(
                                      vis.ip_address || vis.visitor_id,
                                      vis.ip_address ? 'ip' : 'visitor_id',
                                      `Restricted from Visitors tab (${vis.city || vis.country || 'Unknown'})`
                                    )
                                  }
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                                  title="Restrict this visitor/IP from viewing products"
                                >
                                  Restrict {vis.ip_address ? 'IP' : 'ID'}
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
