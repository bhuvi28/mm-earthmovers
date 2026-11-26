'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AdminTabId,
  AnalyticsEvent,
  AuditLogRecord,
  DashboardStats,
  OpsHealthStats,
  ProductEnquiryData,
  RestrictionRecord,
  TimeRange,
  VisitorDeviceFilter,
  VisitorDirectoryItem,
  VisitorSegmentFilter,
  VisitorsListSummaryCounts,
} from '../_types/analytics';

export interface UseAnalyticsPollingOptions {
  activeTab: AdminTabId;
  timeRange: TimeRange;
  autoRefresh: boolean;
  includeHeartbeat: boolean;
  visitorFilters: {
    search: string;
    segment: VisitorSegmentFilter;
    device: VisitorDeviceFilter;
    page: number;
    pageSize: number;
  };
  auditPagination: {
    limit: number;
    offset: number;
  };
}

/**
 * Tab-scoped & visibility-aware polling hook (`PROD-08`).
 * Fetches `summary` + ONLY the active tab's API view on mount, range/tab change, and 15s interval,
 * pausing automatically when `document.visibilityState !== 'visible'`.
 * Decouples tab-local filter/pagination changes from `summary` CTE queries.
 */
export function useAnalyticsPolling(options: UseAnalyticsPollingOptions) {
  const { activeTab, timeRange, autoRefresh, includeHeartbeat, visitorFilters, auditPagination } = options;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [productData, setProductData] = useState<ProductEnquiryData | null>(null);
  const [restrictions, setRestrictions] = useState<RestrictionRecord[]>([]);

  const [visitorsList, setVisitorsList] = useState<VisitorDirectoryItem[]>([]);
  const [visitorTotalCount, setVisitorTotalCount] = useState(0);
  const [visitorSummaryCounts, setVisitorSummaryCounts] = useState<VisitorsListSummaryCounts>({
    total: 0,
    leads: 0,
    rfq: 0,
    repeat: 0,
    flagged: 0,
    restricted: 0,
  });

  const [opsHealth, setOpsHealth] = useState<OpsHealthStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditTotalCount, setAuditTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isVisitorsLoading, setIsVisitorsLoading] = useState(false);
  const [isOpsLoading, setIsOpsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Debounce visitor search input (~250ms) so typing does not hammer /api/analytics
  const [debouncedVisitorSearch, setDebouncedVisitorSearch] = useState(visitorFilters.search);
  useEffect(() => {
    const trimmed = visitorFilters.search;
    if (trimmed === debouncedVisitorSearch) return;
    const timer = setTimeout(() => {
      setDebouncedVisitorSearch(trimmed);
    }, 250);
    return () => clearTimeout(timer);
  }, [visitorFilters.search, debouncedVisitorSearch]);

  const lastFetchAtRef = useRef<number>(0);
  const skipNextSummaryRef = useRef<boolean>(false);
  const restrictionsLoadedRef = useRef<boolean>(false);

  // Refs for tab-local params so refreshActiveTab stays decoupled from filter/pagination changes
  const includeHeartbeatRef = useRef(includeHeartbeat);
  includeHeartbeatRef.current = includeHeartbeat;

  const visitorQueryRef = useRef({
    search: debouncedVisitorSearch,
    segment: visitorFilters.segment,
    device: visitorFilters.device,
    page: visitorFilters.page,
    pageSize: visitorFilters.pageSize,
  });
  visitorQueryRef.current = {
    search: debouncedVisitorSearch,
    segment: visitorFilters.segment,
    device: visitorFilters.device,
    page: visitorFilters.page,
    pageSize: visitorFilters.pageSize,
  };

  const auditPaginationRef = useRef(auditPagination);
  auditPaginationRef.current = auditPagination;

  const handleUnauthorized = useCallback(() => {
    restrictionsLoadedRef.current = false;
    skipNextSummaryRef.current = false;
    setIsAuthenticated(false);
  }, []);

  // Initial authentication check (reuses initial summary payload to avoid duplicate request)
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'summary', range: 'today' }),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setDashboardError(null);
        skipNextSummaryRef.current = true;
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      try {
        const res = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', key: passcode }),
        });
        if (res.ok) {
          skipNextSummaryRef.current = false;
          restrictionsLoadedRef.current = false;
          setIsAuthenticated(true);
        } else if (res.status === 429) {
          setAuthError('Too many failed attempts. Please wait before retrying.');
        } else {
          setAuthError('Invalid passcode. Please try again.');
        }
      } catch {
        setAuthError('Connection failed.');
      }
    },
    [passcode]
  );

  const handleLogout = useCallback(async () => {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {});
    restrictionsLoadedRef.current = false;
    skipNextSummaryRef.current = false;
    setIsAuthenticated(false);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'summary', range: timeRange }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setDashboardError(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setDashboardError(err.error || `Server returned status ${res.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to load stats:', err);
      const message = err instanceof Error ? err.message : 'Network connection failed';
      setDashboardError(message);
    }
  }, [isAuthenticated, timeRange, handleUnauthorized]);

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view: 'events',
          limit: 100,
          range: timeRange,
          includeHeartbeat: includeHeartbeatRef.current,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [isAuthenticated, timeRange, handleUnauthorized]);

  const fetchProductEnquiries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'catalog', range: timeRange }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProductData(data);
      }
    } catch (err) {
      console.error('Failed to load product enquiries:', err);
    }
  }, [isAuthenticated, timeRange, handleUnauthorized]);

  const fetchRestrictions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'restrictions' }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restrictions || []);
        restrictionsLoadedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load restrictions:', err);
    }
  }, [isAuthenticated, handleUnauthorized]);

  // On-demand restriction hydration for VisitorJourneyModal opened from non-restrictions tabs
  const ensureRestrictionsLoaded = useCallback(async () => {
    if (!isAuthenticated || restrictionsLoadedRef.current) return;
    await fetchRestrictions();
  }, [isAuthenticated, fetchRestrictions]);

  const fetchVisitors = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsVisitorsLoading(true);
    try {
      const q = visitorQueryRef.current;
      const offset = Math.max(0, (q.page - 1) * q.pageSize);
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view: 'visitors',
          limit: q.pageSize,
          offset,
          timeRange,
          search: q.search.trim() || undefined,
          segment: q.segment !== 'all' ? q.segment : undefined,
          device: q.device !== 'all' ? q.device : undefined,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setVisitorsList(data.visitors || []);
        setVisitorTotalCount(
          typeof data.totalCount === 'number' ? data.totalCount : (data.visitors || []).length
        );
        if (data.summaryCounts) {
          setVisitorSummaryCounts(data.summaryCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load visitors directory:', err);
    } finally {
      setIsVisitorsLoading(false);
    }
  }, [isAuthenticated, timeRange, handleUnauthorized]);

  const fetchOpsHealth = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsOpsLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'ops_health', range: timeRange }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const opsJson = await res.json();
        setOpsHealth(opsJson);
      }
    } catch (err) {
      console.error('Failed to load ops health:', err);
    } finally {
      setIsOpsLoading(false);
    }
  }, [isAuthenticated, timeRange, handleUnauthorized]);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsOpsLoading(true);
    try {
      const pag = auditPaginationRef.current;
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view: 'audit_logs',
          limit: pag.limit,
          offset: pag.offset,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const auditJson = await res.json();
        setAuditLogs(auditJson.logs || []);
        setAuditTotalCount(
          typeof auditJson.totalCount === 'number'
            ? auditJson.totalCount
            : (auditJson.logs || []).length
        );
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsOpsLoading(false);
    }
  }, [isAuthenticated, handleUnauthorized]);

  const fetchOpsAndAudit = useCallback(async () => {
    await Promise.all([fetchOpsHealth(), fetchAuditLogs()]);
  }, [fetchOpsHealth, fetchAuditLogs]);

  // Fetches ONLY summary + currently active tab payload (`PROD-08`), tracking unified isLoading
  const refreshActiveTab = useCallback(
    async (opts?: { skipSummary?: boolean }) => {
      if (!isAuthenticated) return;
      lastFetchAtRef.current = Date.now();
      setIsLoading(true);
      try {
        const tasks: Array<Promise<void>> = [];
        if (!opts?.skipSummary) {
          tasks.push(fetchStats());
        }
        if (activeTab === 'stream') {
          tasks.push(fetchEvents());
        } else if (activeTab === 'products') {
          tasks.push(fetchProductEnquiries());
        } else if (activeTab === 'visitors') {
          tasks.push(fetchVisitors());
        } else if (activeTab === 'restrictions') {
          tasks.push(fetchRestrictions());
        } else if (activeTab === 'ops') {
          tasks.push(fetchOpsHealth(), fetchAuditLogs());
        }
        await Promise.all(tasks);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isAuthenticated,
      activeTab,
      fetchStats,
      fetchEvents,
      fetchProductEnquiries,
      fetchVisitors,
      fetchRestrictions,
      fetchOpsHealth,
      fetchAuditLogs,
    ]
  );

  // Refresh whenever activeTab or timeRange changes (or on initial authentication)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (skipNextSummaryRef.current && timeRange === 'today') {
      skipNextSummaryRef.current = false;
      void refreshActiveTab({ skipSummary: true });
    } else {
      skipNextSummaryRef.current = false;
      void refreshActiveTab();
    }
  }, [isAuthenticated, timeRange, refreshActiveTab]);

  // Decoupled tab-local trigger: includeHeartbeat only refreshes stream events
  const prevHeartbeatRef = useRef(includeHeartbeat);
  useEffect(() => {
    if (prevHeartbeatRef.current === includeHeartbeat) return;
    prevHeartbeatRef.current = includeHeartbeat;
    if (isAuthenticated && activeTab === 'stream') {
      void fetchEvents();
    }
  }, [includeHeartbeat, isAuthenticated, activeTab, fetchEvents]);

  // Decoupled tab-local trigger: visitorFilters only refreshes visitors list (debounced search)
  const visitorFilterKey = `${debouncedVisitorSearch}|${visitorFilters.segment}|${visitorFilters.device}|${visitorFilters.page}|${visitorFilters.pageSize}`;
  const prevVisitorFilterKeyRef = useRef(visitorFilterKey);
  useEffect(() => {
    if (prevVisitorFilterKeyRef.current === visitorFilterKey) return;
    prevVisitorFilterKeyRef.current = visitorFilterKey;
    if (isAuthenticated && activeTab === 'visitors') {
      void fetchVisitors();
    }
  }, [visitorFilterKey, isAuthenticated, activeTab, fetchVisitors]);

  // Decoupled tab-local trigger: auditPagination only refreshes audit_logs (not summary or ops_health)
  const auditPaginationKey = `${auditPagination.limit}|${auditPagination.offset}`;
  const prevAuditPaginationKeyRef = useRef(auditPaginationKey);
  useEffect(() => {
    if (prevAuditPaginationKeyRef.current === auditPaginationKey) return;
    prevAuditPaginationKeyRef.current = auditPaginationKey;
    if (isAuthenticated && activeTab === 'ops') {
      void fetchAuditLogs();
    }
  }, [auditPaginationKey, isAuthenticated, activeTab, fetchAuditLogs]);

  // 15s polling paused when document is hidden (`document.visibilityState !== 'visible'`)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void refreshActiveTab();
    }, 15000);

    const handleVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        Date.now() - lastFetchAtRef.current >= 15000
      ) {
        void refreshActiveTab();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isAuthenticated, autoRefresh, refreshActiveTab]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    handleUnauthorized,
    passcode,
    setPasscode,
    authError,
    handleLogin,
    handleLogout,
    stats,
    events,
    productData,
    restrictions,
    visitorsList,
    visitorTotalCount,
    visitorSummaryCounts,
    opsHealth,
    auditLogs,
    auditTotalCount,
    isLoading,
    isRefreshing: isLoading,
    isVisitorsLoading,
    isOpsLoading,
    dashboardError,
    setDashboardError,
    fetchStats,
    fetchEvents,
    fetchProductEnquiries,
    fetchRestrictions,
    ensureRestrictionsLoaded,
    fetchVisitors,
    fetchOpsHealth,
    fetchAuditLogs,
    fetchOpsAndAudit,
    refreshActiveTab,
  };
}
