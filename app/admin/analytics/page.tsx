'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [productSearch, setProductSearch] = useState('');
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
  const filteredProducts = (productData?.products || []).filter((p) => {
    if (productFilter === 'active' && p.enquire_clicks === 0) return false;
    if (productFilter === 'zero' && p.enquire_clicks > 0) return false;

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

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Protected Analytics Hub</h1>
            <p className="text-gray-400 text-sm mt-1">Enter your admin security passcode to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            {authError && <p className="text-red-400 text-sm">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-amber-600/30"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">
              ← Return to Main Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚜</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">MM Earthmovers Analytics</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {stats?.kpis?.activeUsersNow || 0} Online Now
                </span>
              </div>
              <p className="text-xs text-gray-400">Visitor intelligence, clicks, product performance, and conversions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Filter */}
            <div className="bg-gray-800 p-1 rounded-xl flex items-center border border-gray-700 text-xs">
              {(['today', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    timeRange === r ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                autoRefresh
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400' : 'bg-gray-500'}`}></span>
              {autoRefresh ? 'Live (15s)' : 'Paused'}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchStats();
                fetchEvents();
                fetchProductEnquiries();
              }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-medium transition text-gray-300"
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-xl text-xs font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* KPI Scorecard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unique Visitors</span>
            <div className="text-2xl font-bold text-white mt-1">
              {stats?.kpis?.totalVisitors.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-gray-500">Distinct devices</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Views</span>
            <div className="text-2xl font-bold text-white mt-1">
              {stats?.kpis?.totalPageviews.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-gray-500">{stats?.kpis?.totalSessions || 0} sessions</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">WhatsApp Clicks</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats?.kpis?.whatsappClicks.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-emerald-500/80">Direct Quote Inquiries</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Phone Calls</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {stats?.kpis?.phoneCalls.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-blue-500/80">Direct Dial Clicks</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Form Leads</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {stats?.kpis?.formLeads.toLocaleString() || '0'}
            </div>
            <span className="text-[11px] text-purple-500/80">Enquiry Form Sent</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Avg Dwell Time</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {formatDuration(stats?.kpis?.avgDurationSeconds || 0)}
            </div>
            <span className="text-[11px] text-amber-500/80">Session Duration</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 mb-6 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stream')}
            className={`pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'stream'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            ⚡ Live Click Stream ("Who Clicked What")
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            📦 Product Enquiries ({productData?.summary?.withEnquiriesCount || 0} active / {productData?.summary?.zeroEnquiriesCount || 0} cold)
          </button>
          <button
            onClick={() => setActiveTab('audience')}
            className={`pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'audience'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🌍 Geolocation & Traffic Sources
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'demand'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🔍 Searches, Demand & Dead Zones
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'visitors'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            👤 Unique Visitors & Leads
          </button>
        </div>

        {/* TAB 1: LIVE EVENT STREAM ("WHO CLICKED WHAT") */}
        {activeTab === 'stream' && (
          <div className="space-y-6">
            {/* Top Clicks Bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span>🔥 Most Clicked Buttons & Elements</span>
                <span className="text-xs text-gray-400 font-normal">Ranked by total interactions</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats?.topClicks && stats.topClicks.length > 0 ? (
                  stats.topClicks.map((click, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white text-sm truncate" title={click.element_text}>
                          {click.element_text}
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5" title={click.element_target}>
                          {click.element_target || click.page_path}
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold whitespace-nowrap">
                        {click.click_count} clicks
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 col-span-3">No clicks recorded in this period yet.</p>
                )}
              </div>
            </div>

            {/* Real-time Event Feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Live Activity Stream</h2>
                  <p className="text-xs text-gray-400">Chronological feed of every visitor interaction</p>
                </div>
                <span className="text-xs text-gray-500">{events.length} latest events</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800/80 text-gray-400 border-b border-gray-700">
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
                  <tbody className="divide-y divide-gray-800 font-mono text-xs">
                    {events.length > 0 ? (
                      events.map((ev) => (
                        <tr key={ev.id} className="hover:bg-gray-800/40 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-gray-400">{formatTimeAgo(ev.created_at)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {ev.identified_name ? (
                              <span className="font-bold text-amber-400">
                                👤 {ev.identified_name}
                                {ev.identified_contact && (
                                  <span className="block text-[11px] text-gray-400 font-normal">
                                    {ev.identified_contact}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-sans">{ev.visitor_id.slice(0, 10)}...</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-sans text-gray-300">
                              {ev.city ? `${ev.city}, ` : ''}
                              {ev.country || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold uppercase ${
                                ev.event_type === 'click'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : ev.event_type === 'form_submit'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : ev.event_type === 'rage_click'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'
                                  : ev.event_type === 'copy'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : ev.event_type === 'search'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {ev.event_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-sans" title={ev.element_text || ev.element_target}>
                            <span className="text-white font-medium">{ev.element_text || ev.element_target || '-'}</span>
                            {ev.metadata?.productTitle && (
                              <span className="block text-[11px] text-amber-400">
                                Product: {ev.metadata.productTitle}
                              </span>
                            )}
                            {ev.metadata?.copiedText && (
                              <span className="block text-[11px] text-amber-300">
                                Copied: "{ev.metadata.copiedText}"
                              </span>
                            )}
                            {ev.metadata?.query && (
                              <span className="block text-[11px] text-indigo-300">
                                Searched: "{ev.metadata.query}" ({ev.metadata.resultsCount} results)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-sans truncate max-w-[140px]" title={ev.page_path}>
                            {ev.page_path}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openVisitorJourney(ev.visitor_id)}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 rounded font-sans text-xs transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500 font-sans">
                          No interaction events recorded yet. Visit the website to see clicks appear here in real-time!
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
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Catalog</span>
                <div className="text-2xl font-bold text-white mt-1">
                  {productData?.summary?.totalCatalogProducts || 144}
                </div>
                <span className="text-[11px] text-gray-500">Live products in catalog</span>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">With Enquiries</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {productData?.summary?.withEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-emerald-500/80">Products with $\ge 1$ clicks</span>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Zero Enquiries</span>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {productData?.summary?.zeroEnquiriesCount || 0}
                </div>
                <span className="text-[11px] text-rose-500/80">Cold catalog items</span>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Total Enquire Clicks</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {productData?.summary?.totalEnquireClicks || 0}
                </div>
                <span className="text-[11px] text-amber-500/80">All product quote clicks</span>
              </div>
            </div>

            {/* Product Enquiry Table with Filters */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-white">Product Enquiry & Demand Report</h2>
                  <p className="text-xs text-gray-400">Identifies which products convert into WhatsApp inquiries and which get ignored</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filter */}
                  <div className="bg-gray-800 p-1 rounded-xl flex items-center border border-gray-700 text-xs">
                    <button
                      onClick={() => setProductFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All ({productData?.products?.length || 0})
                    </button>
                    <button
                      onClick={() => setProductFilter('active')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'active' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      With Enquiries ({productData?.summary?.withEnquiriesCount || 0})
                    </button>
                    <button
                      onClick={() => setProductFilter('zero')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        productFilter === 'zero' ? 'bg-rose-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Zero Enquiries ({productData?.summary?.zeroEnquiriesCount || 0})
                    </button>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search title or part #..."
                      className="px-3 py-1.5 pl-8 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-48"
                    />
                    <span className="absolute left-2.5 top-1.5 text-xs text-gray-500">🔍</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800/80 text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Part Number</th>
                      <th className="py-3 px-4 text-center">Page Views</th>
                      <th className="py-3 px-4 text-center">Enquire Clicks</th>
                      <th className="py-3 px-4 text-center">Conversion</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Last Enquired</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-sans text-xs">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40 transition">
                          <td className="py-3 px-4 font-medium text-white max-w-xs truncate" title={p.title}>
                            <Link
                              href={`/products/${p.category === 'Motor Grader' || p.category === 'Grader' ? 'grader' : p.category.toLowerCase()}/${p.slug}`}
                              target="_blank"
                              className="hover:text-amber-400 transition"
                            >
                              {p.title}
                            </Link>
                            {p.brand && (
                              <span className="block text-[11px] text-gray-400 font-normal">{p.brand}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[11px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-300">
                            {p.part_number || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-300">
                            {p.views}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-block ${
                                p.enquire_clicks > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'text-gray-500'
                              }`}
                            >
                              {p.enquire_clicks}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(p.conversion_rate, 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-[11px] text-gray-400">{p.conversion_rate}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.enquire_clicks > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Active Demand
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Zero Inquiries
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400 font-mono">
                            {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">Top Countries</h2>
              <div className="space-y-3">
                {stats?.topCountries && stats.topCountries.length > 0 ? (
                  stats.topCountries.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium">
                        {c.country} ({c.country_code})
                      </span>
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-bold text-xs">
                        {c.visitor_count} visitors
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No geo data yet.</p>
                )}
              </div>
            </div>

            {/* Top Cities */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">Top Cities</h2>
              <div className="space-y-3">
                {stats?.topCities && stats.topCities.length > 0 ? (
                  stats.topCities.map((city, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium">
                        {city.city}, {city.country}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-bold text-xs">
                        {city.visitor_count} visitors
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No city data yet.</p>
                )}
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">Traffic Sources & Referrers</h2>
              <div className="space-y-3">
                {stats?.topReferrers && stats.topReferrers.length > 0 ? (
                  stats.topReferrers.map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 truncate max-w-xs">{ref.referrer}</span>
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-bold text-xs">
                        {ref.count} sessions
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No referrer data yet.</p>
                )}
              </div>
            </div>

            {/* Devices & Browsers */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">Devices & Browsers</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs uppercase text-gray-400 font-bold mb-2">Device Category</h3>
                  <div className="space-y-2">
                    {stats?.devices?.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-300">{d.device_type}</span>
                        <span className="font-bold text-gray-400">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-400 font-bold mb-2">Browser</h3>
                  <div className="space-y-2">
                    {stats?.browsers?.map((b, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate">{b.browser}</span>
                        <span className="font-bold text-gray-400">{b.count}</span>
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">⚠️ Unsatisfied Demand</h2>
                  <p className="text-xs text-gray-400">Search queries that returned 0 product results</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.searchQueries && stats.searchQueries.filter((s) => s.zero_results).length > 0 ? (
                  stats.searchQueries
                    .filter((s) => s.zero_results)
                    .map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-sm"
                      >
                        <span className="font-medium text-red-300">"{s.query_text}"</span>
                        <span className="px-2 py-0.5 bg-red-900/40 text-red-200 rounded font-bold text-xs">
                          {s.count} searches
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">No zero-result searches detected.</p>
                )}
              </div>
            </div>

            {/* High Intent Text Copying */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">📋 High-Intent Text Copied</h2>
                  <p className="text-xs text-gray-400">Part numbers and contact info copied to clipboard</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.topCopiedItems && stats.topCopiedItems.length > 0 ? (
                  stats.topCopiedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-sm"
                    >
                      <div>
                        <span className="font-bold text-amber-300">{item.copied_text}</span>
                        <span className="block text-[11px] text-gray-400 uppercase">{item.item_type}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-900/40 text-amber-200 rounded font-bold text-xs">
                        {item.count} times
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No clipboard copies recorded yet.</p>
                )}
              </div>
            </div>

            {/* Section Attention & Dead Zones */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:col-span-2">
              <h2 className="text-base font-bold text-white mb-1">Section Attention & Dwell Time</h2>
              <p className="text-xs text-gray-400 mb-4">
                Measures how long visitors paused and engaged with each section before scrolling
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats?.sectionAttention && stats.sectionAttention.length > 0 ? (
                  stats.sectionAttention.map((sec, idx) => (
                    <div key={idx} className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4">
                      <div className="text-xs uppercase text-amber-400 font-bold mb-1">
                        #{sec.section_id}
                      </div>
                      <div className="text-xl font-bold text-white">{sec.avg_dwell_seconds}s</div>
                      <div className="text-xs text-gray-400 mt-1">{sec.views} view sessions</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 col-span-4">No section view data collected yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: UNIQUE VISITORS & LEADS */}
        {activeTab === 'visitors' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4">Visitor Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-xs uppercase bg-gray-800/80 text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Visitor ID / Lead</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Device / OS</th>
                    <th className="py-3 px-4">First Seen</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-xs font-mono">
                  {events
                    .filter((v, i, arr) => arr.findIndex((x) => x.visitor_id === v.visitor_id) === i)
                    .map((vis) => (
                      <tr key={vis.visitor_id} className="hover:bg-gray-800/40 transition">
                        <td className="py-3 px-4">
                          {vis.identified_name ? (
                            <div>
                              <span className="font-bold text-amber-400 text-sm font-sans">
                                🌟 {vis.identified_name}
                              </span>
                              <span className="block text-gray-400 text-xs">{vis.identified_contact}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">{vis.visitor_id}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-gray-300">
                          {vis.city ? `${vis.city}, ` : ''}
                          {vis.country || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 font-sans text-gray-300 capitalize">
                          {vis.device_type} • {vis.browser}
                        </td>
                        <td className="py-3 px-4 text-gray-400">{formatTimeAgo(vis.created_at)}</td>
                        <td className="py-3 px-4 text-gray-400">{formatTimeAgo(vis.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openVisitorJourney(vis.visitor_id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-sans text-xs transition"
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

      {/* VISITOR JOURNEY DRAWER MODAL */}
      {selectedVisitorId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-gray-900 border-l border-gray-800 h-full p-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white">Visitor Journey Timeline</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {selectedVisitorId}</p>
              </div>
              <button
                onClick={() => setSelectedVisitorId(null)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 py-6">
              {isJourneyLoading ? (
                <div className="text-center py-12 text-gray-400">Loading visitor timeline...</div>
              ) : visitorJourney.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No events found for this visitor.</div>
              ) : (
                <div className="relative border-l-2 border-gray-800 ml-4 space-y-6">
                  {visitorJourney.map((step, idx) => (
                    <div key={idx} className="relative pl-6">
                      <span
                        className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                          step.event_type === 'click'
                            ? 'bg-blue-400'
                            : step.event_type === 'form_submit'
                            ? 'bg-purple-400'
                            : step.event_type === 'copy'
                            ? 'bg-amber-400'
                            : step.event_type === 'rage_click'
                            ? 'bg-red-400'
                            : 'bg-gray-600'
                        }`}
                      ></span>

                      <div className="text-xs text-gray-500 font-mono">
                        {new Date(step.created_at).toLocaleTimeString()} ({formatTimeAgo(step.created_at)})
                      </div>

                      <div className="font-semibold text-white text-sm mt-0.5">
                        <span className="capitalize">{step.event_type.replace('_', ' ')}</span>: {step.element_text || step.page_path}
                      </div>

                      {step.element_target && (
                        <div className="text-xs text-blue-400 truncate mt-0.5">
                          Target: {step.element_target}
                        </div>
                      )}

                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                        <pre className="mt-2 p-2 bg-gray-950 border border-gray-800 rounded-lg text-[11px] text-gray-300 overflow-x-auto">
                          {JSON.stringify(step.metadata, null, 2)}
                        </pre>
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
