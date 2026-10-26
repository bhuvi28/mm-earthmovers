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

export default function AnalyticsDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [activeTab, setActiveTab] = useState<'stream' | 'products' | 'audience' | 'demand' | 'visitors'>('stream');
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
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
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
        body: JSON.stringify({ view: 'events', limit: 50 }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [isAuthenticated]);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchEvents();
      fetchProductEnquiries();
    }
  }, [isAuthenticated, fetchStats, fetchEvents, fetchProductEnquiries]);

  // Auto-refresh interval (every 15 seconds)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchEvents();
      fetchProductEnquiries();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchStats, fetchEvents, fetchProductEnquiries]);

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
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
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
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchPart = p.part_number.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        return matchTitle || matchPart || matchCat || matchBrand;
      }
      return true;
    });
  }, [productData, productFilter, productCategoryFilter, productSearch]);

  // Filtered Events for Live Click Stream Tab
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const q = eventSearch.toLowerCase();
    return events.filter((ev) => {
      return (
        ev.element_text?.toLowerCase().includes(q) ||
        ev.element_target?.toLowerCase().includes(q) ||
        ev.page_path?.toLowerCase().includes(q) ||
        ev.identified_name?.toLowerCase().includes(q) ||
        ev.visitor_id?.toLowerCase().includes(q) ||
        ev.event_type?.toLowerCase().includes(q)
      );
    });
  }, [events, eventSearch]);

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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shadow-xs">
              🚜
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">MM Earthmovers Analytics</h1>
                {/* Active Users Online Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {stats?.kpis?.activeUsersNow || 0} Online Now
                </span>
              </div>
              <p className="text-xs text-slate-500">Visitor intelligence, conversions, clicks, and inventory demand</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs">
              {(['today', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    timeRange === r
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title="Toggle Live Auto-refresh"
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all shadow-xs ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              {autoRefresh ? 'Live (15s)' : 'Paused'}
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                fetchStats();
                fetchEvents();
                fetchProductEnquiries();
              }}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium transition text-slate-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{isLoading ? 'Refreshing...' : '🔄 Refresh'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-medium transition shadow-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* KPI Scorecard Grid (Pure White with Subtle Elevation) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Unique Visitors</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-sans">
              {stats?.kpis?.totalVisitors.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Distinct devices tracked</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Views</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-sans">
              {stats?.kpis?.totalPageviews.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{stats?.kpis?.totalSessions || 0} browsing sessions</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">WhatsApp Clicks</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-sans">
              {stats?.kpis?.whatsappClicks.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-emerald-700/80 mt-1 block">Direct quote requests</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Phone Calls</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1 font-sans">
              {stats?.kpis?.phoneCalls.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-blue-700/80 mt-1 block">Direct dial calls</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Form Leads</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-1 font-sans">
              {stats?.kpis?.formLeads.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-purple-700/80 mt-1 block">Enquiry messages sent</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Avg Dwell Time</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1 font-sans">
              {formatDuration(stats?.kpis?.avgDurationSeconds || 0)}
            </div>
            <span className="text-[11px] text-amber-700/80 mt-1 block">Active browsing duration</span>
          </div>
        </div>

        {/* Navigation Tabs (Light Mode Styled) */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px mb-6">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'stream'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            ⚡ Live Click Stream ("Who Clicked What")
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'products'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            📦 Product Enquiries ({productData?.summary?.withEnquiriesCount || 0} active / {productData?.summary?.zeroEnquiriesCount || 0} cold)
          </button>
          <button
            onClick={() => setActiveTab('audience')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'audience'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            🌍 Geolocation & Traffic Sources
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'demand'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            🔍 Searches, Demand & Dead Zones
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'visitors'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            👤 Unique Visitors & Leads
          </button>
        </div>

        {/* TAB 1: LIVE EVENT STREAM ("WHO CLICKED WHAT") */}
        {activeTab === 'stream' && (
          <div className="space-y-6">
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
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">{formatTimeAgo(ev.created_at)}</td>
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
                              {ev.city ? `${ev.city}, ` : ''}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Catalog</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 font-sans">
                  {productData?.summary?.totalCatalogProducts || 144}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Live products in catalog</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">With Enquiries</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-sans">
                  {productData?.summary?.withEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-emerald-700/80 mt-1 block">Products with active clicks</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Zero Enquiries</span>
                <div className="text-2xl font-extrabold text-rose-600 mt-1 font-sans">
                  {productData?.summary?.zeroEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-rose-700/80 mt-1 block">Cold / un-enquired inventory</span>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Total Enquire Clicks</span>
                <div className="text-2xl font-extrabold text-amber-600 mt-1 font-sans">
                  {productData?.summary?.totalEnquireClicks || 0}
                </div>
                <span className="text-[11px] text-amber-700/80 mt-1 block">WhatsApp quote requests</span>
              </div>
            </div>

            {/* Product Enquiry Table with Filters */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Product Enquiry Demand Report</h2>
                  <p className="text-xs text-slate-500">Measure which spare parts drive conversions vs. cold catalog items</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Category Filter */}
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                  >
                    <option value="all">All Categories</option>
                    <option value="loader">Loader</option>
                    <option value="motor grader">Motor Grader</option>
                    <option value="excavator">Excavator</option>
                  </select>

                  {/* Status Filter Tabs */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs">
                    <button
                      onClick={() => setProductFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({productData?.products?.length || 0})
                    </button>
                    <button
                      onClick={() => setProductFilter('active')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'active'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      With Enquiries ({productData?.summary?.withEnquiriesCount || 0})
                    </button>
                    <button
                      onClick={() => setProductFilter('zero')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'zero'
                          ? 'bg-rose-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Zero Enquiries ({productData?.summary?.zeroEnquiriesCount || 0})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search title, part #..."
                      className="px-3.5 py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition w-52 shadow-xs"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Part Number</th>
                      <th className="py-3 px-4 text-center">Page Views</th>
                      <th className="py-3 px-4 text-center">Enquire Clicks</th>
                      <th className="py-3 px-4 text-center">Conversion</th>
                      <th className="py-3 px-4">Demand Status</th>
                      <th className="py-3 px-4 text-right">Last Enquired</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate" title={p.title}>
                            <Link
                              href={`/products/${p.category === 'Motor Grader' || p.category === 'Grader' ? 'grader' : p.category.toLowerCase()}/${p.slug}`}
                              target="_blank"
                              className="hover:text-amber-600 font-semibold transition"
                            >
                              {p.title}
                            </Link>
                            {p.brand && (
                              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">{p.brand}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700">
                            {p.part_number || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {p.views}
                          </td>
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
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.enquire_clicks > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active Demand
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Zero Inquiries
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono">
                            {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          No matching products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                        {city.city}, <span className="text-xs text-slate-500">{city.country}</span>
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
            {/* Unsatisfied Demand: Zero-Result Searches */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚠️ Unsatisfied Search Demand</span>
                  </h2>
                  <p className="text-xs text-slate-500">Searches that returned 0 product results (stock opportunity)</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.searchQueries && stats.searchQueries.filter((s) => s.zero_results).length > 0 ? (
                  stats.searchQueries
                    .filter((s) => s.zero_results)
                    .map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-sm"
                      >
                        <span className="font-semibold text-rose-800">"{s.query_text}"</span>
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md font-bold text-xs">
                          {s.count} searches
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">No zero-result searches detected.</p>
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
                        <span className="block text-[11px] text-slate-500 uppercase tracking-wider">{item.item_type}</span>
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
                  stats.sectionAttention.map((sec, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 shadow-xs">
                      <div className="text-[11px] uppercase text-amber-700 font-bold mb-1 tracking-wider">
                        #{sec.section_id}
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900">{sec.avg_dwell_seconds}s</div>
                      <div className="text-xs text-slate-500 mt-1">{sec.views} view sessions</div>
                    </div>
                  ))
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
            <p className="text-xs text-slate-500 mb-4">List of distinct visitors with stitched customer identities</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Visitor / Lead Identity</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Device & OS</th>
                    <th className="py-3 px-4">First Seen</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {events
                    .filter((v, i, arr) => arr.findIndex((x) => x.visitor_id === v.visitor_id) === i)
                    .map((vis) => (
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
                        <td className="py-3 px-4 text-slate-700">
                          {vis.city ? `${vis.city}, ` : ''}
                          {vis.country || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 capitalize">
                          {vis.device_type} • {vis.browser}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{formatTimeAgo(vis.created_at)}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{formatTimeAgo(vis.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openVisitorJourney(vis.visitor_id)}
                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            View Journey
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* VISITOR JOURNEY DRAWER MODAL (White Theme with Clean Timeline) */}
      {selectedVisitorId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full p-6 overflow-y-auto flex flex-col shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Visitor Journey Timeline</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedVisitorId}</p>
              </div>
              <button
                onClick={() => setSelectedVisitorId(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition"
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
                        {new Date(step.created_at).toLocaleTimeString()} ({formatTimeAgo(step.created_at)})
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
