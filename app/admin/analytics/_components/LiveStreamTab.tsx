'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsEvent,
  ChartMetricKey,
  DashboardStats,
  TimeRange,
} from '../_types/analytics';
import { buildFormattedTimeSeries, getSmoothPath } from '../_utils/chartHelpers';
import { decodeCityName, formatIST, formatTimeAgo } from '../_utils/formatters';
import InfoTooltip from './InfoTooltip';
import { STREAM_TOOLTIPS } from '../_utils/metricTooltips';

interface LiveStreamTabProps {
  stats: DashboardStats | null;
  events: AnalyticsEvent[];
  timeRange: TimeRange;
  includeHeartbeat: boolean;
  setIncludeHeartbeat: React.Dispatch<React.SetStateAction<boolean>>;
  eventSearch: string;
  setEventSearch: (val: string) => void;
  checkIsRestricted: (
    visitorId?: string | null,
    ipAddress?: string | null,
    isExplicitRestricted?: boolean
  ) => boolean;
  openVisitorJourney: (visitorId: string, ipAddress?: string | null) => void;
}

export default function LiveStreamTab({
  stats,
  events,
  timeRange,
  includeHeartbeat,
  setIncludeHeartbeat,
  eventSearch,
  setEventSearch,
  checkIsRestricted,
  openVisitorJourney,
}: LiveStreamTabProps) {
  const [activeMetrics, setActiveMetrics] = useState<Record<ChartMetricKey, boolean>>({
    clicks: true,
    pageviews: true,
    visitors: true,
    leads: true,
  });
  const [chartType, setChartType] = useState<'spline' | 'bar'>('spline');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedPeriod, setPinnedPeriod] = useState<string | null>(null);

  useEffect(() => {
    setPinnedPeriod(null);
    setHoveredIndex(null);
  }, [timeRange]);

  const toggleMetric = (key: ChartMetricKey) => {
    setActiveMetrics((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const formattedTimeSeries = useMemo(
    () => buildFormattedTimeSeries(stats?.timeSeries, timeRange),
    [stats?.timeSeries, timeRange]
  );

  const chartTotals = useMemo(() => {
    let totalViews = 0;
    let totalClicks = 0;
    let totalLeads = 0;
    let peakPeriod = { label: '-', views: 0, clicks: 0 };

    formattedTimeSeries.forEach((t) => {
      totalViews += t.pageviews;
      totalClicks += t.clicks;
      totalLeads += t.leads;
      if (t.pageviews > peakPeriod.views) {
        peakPeriod = { label: t.label, views: t.pageviews, clicks: t.clicks };
      }
    });

    return { totalViews, totalClicks, totalLeads, peakPeriod };
  }, [formattedTimeSeries]);

  const filteredEvents = useMemo(() => {
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
        (ev.metadata?.productTitle && String(ev.metadata.productTitle).toLowerCase().includes(q)) ||
        (ev.metadata?.query && String(ev.metadata.query).toLowerCase().includes(q)) ||
        (ev.metadata?.searchQuery && String(ev.metadata.searchQuery).toLowerCase().includes(q)) ||
        (ev.metadata?.partNumber && String(ev.metadata.partNumber).toLowerCase().includes(q)) ||
        (ev.metadata?.action && String(ev.metadata.action).toLowerCase().includes(q)) ||
        (ev.metadata?.category && String(ev.metadata.category).toLowerCase().includes(q))
      );
    });
  }, [events, eventSearch]);

  const timeRangeContextLabel =
    timeRange === 'today'
      ? 'Hourly Breakdown (00:00 - 23:00 IST Today)'
      : timeRange === 'yesterday'
      ? 'Hourly Breakdown (00:00 - 23:00 IST Yesterday)'
      : timeRange === '7d'
      ? 'Daily Trend (Last 7 Days in IST)'
      : timeRange === '30d'
      ? 'Daily Trend (Last 30 Days in IST)'
      : timeRange === '90d'
      ? 'Daily Trend (Last 90 Days in IST)'
      : timeRange === '1y'
      ? 'Monthly Trend (Last 1 Year in IST)'
      : 'Historical Trend (All Time)';

  return (
    <div className="space-y-6">
      {/* Google Search Console Style Performance Report (IST) */}
      {stats &&
        formattedTimeSeries.length > 0 &&
        (() => {
          const n = formattedTimeSeries.length;
          const activeIndex = pinnedPeriod
            ? formattedTimeSeries.findIndex((t) => t.period === pinnedPeriod)
            : hoveredIndex;
          const activeItem =
            activeIndex !== null && activeIndex >= 0 && activeIndex < n
              ? formattedTimeSeries[activeIndex]
              : null;

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

          const svgWidth = 1000;
          const svgHeight = 250;
          const marginLeft = 50;
          const marginRight = 30;
          const marginTop = 25;
          const marginBottom = 45;
          const chartW = svgWidth - marginLeft - marginRight;
          const chartH = svgHeight - marginTop - marginBottom;
          const baselineY = marginTop + chartH;

          const getPoints = (key: ChartMetricKey): Array<[number, number]> => {
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

          const activeX =
            activeIndex !== null && activeIndex >= 0 && activeIndex < n
              ? marginLeft + (n > 1 ? (activeIndex / (n - 1)) * chartW : chartW / 2)
              : null;
          const activeXPercent = activeX !== null ? (activeX / svgWidth) * 100 : null;

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
              <div className="flex lg:grid overflow-x-auto scrollbar-hide snap-x touch-pan-x lg:grid-cols-4 divide-x divide-slate-200/90 border-b border-slate-200/90 bg-slate-50/40">
                {/* Card 1: Total Clicks (Blue) */}
                <div className="shrink-0 snap-start min-w-[145px] lg:min-w-0 flex-1 relative flex">
                  <button
                    type="button"
                    onClick={() => toggleMetric('clicks')}
                    className={`w-full min-h-[44px] p-3 sm:p-5 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      activeMetrics.clicks
                        ? 'bg-blue-50/30 border-t-4 border-t-blue-600'
                        : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                    }`}
                    title="Click to toggle Total Clicks series"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pr-9">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeMetrics.clicks}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            activeMetrics.clicks ? 'text-blue-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Total Clicks
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className={`text-xl sm:text-3xl font-extrabold tracking-tight font-sans ${
                          activeMetrics.clicks ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {(chartTotals.totalClicks ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        CTA &amp; Links
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-3.5 right-3 sm:top-5 sm:right-5 z-10 flex items-center gap-1.5">
                    <InfoTooltip {...STREAM_TOOLTIPS.chartClicks} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-2xs pointer-events-none"></span>
                  </div>
                </div>

                {/* Card 2: Total Pageviews (Amber) */}
                <div className="shrink-0 snap-start min-w-[145px] lg:min-w-0 flex-1 relative flex">
                  <button
                    type="button"
                    onClick={() => toggleMetric('pageviews')}
                    className={`w-full min-h-[44px] p-3 sm:p-5 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      activeMetrics.pageviews
                        ? 'bg-amber-50/30 border-t-4 border-t-amber-500'
                        : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                    }`}
                    title="Click to toggle Total Pageviews series"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pr-9">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeMetrics.pageviews}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer pointer-events-none"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            activeMetrics.pageviews ? 'text-amber-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Total Pageviews
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className={`text-xl sm:text-3xl font-extrabold tracking-tight font-sans ${
                          activeMetrics.pageviews ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {(chartTotals.totalViews ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        Impressions
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-3.5 right-3 sm:top-5 sm:right-5 z-10 flex items-center gap-1.5">
                    <InfoTooltip {...STREAM_TOOLTIPS.chartPageviews} />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs pointer-events-none"></span>
                  </div>
                </div>

                {/* Card 3: Unique Visitors (Emerald - Period total from stats.kpis, BUG-08) */}
                <div className="shrink-0 snap-start min-w-[145px] lg:min-w-0 flex-1 relative flex">
                  <button
                    type="button"
                    onClick={() => toggleMetric('visitors')}
                    className={`w-full min-h-[44px] p-3 sm:p-5 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      activeMetrics.visitors
                        ? 'bg-emerald-50/30 border-t-4 border-t-emerald-600'
                        : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                    }`}
                    title="Click to toggle Unique Visitors series"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pr-9">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeMetrics.visitors}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            activeMetrics.visitors ? 'text-emerald-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Unique Visitors
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className={`text-xl sm:text-3xl font-extrabold tracking-tight font-sans ${
                          activeMetrics.visitors ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {(stats?.kpis?.totalVisitors ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        Period total
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-3.5 right-3 sm:top-5 sm:right-5 z-10 flex items-center gap-1.5">
                    <InfoTooltip {...STREAM_TOOLTIPS.chartVisitors} />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-2xs pointer-events-none"></span>
                  </div>
                </div>

                {/* Card 4: Inquiry Leads (Purple) */}
                <div className="shrink-0 snap-start min-w-[145px] lg:min-w-0 flex-1 relative flex">
                  <button
                    type="button"
                    onClick={() => toggleMetric('leads')}
                    className={`w-full min-h-[44px] p-3 sm:p-5 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      activeMetrics.leads
                        ? 'bg-purple-50/30 border-t-4 border-t-purple-600'
                        : 'bg-white/80 hover:bg-slate-50 border-t-4 border-t-transparent opacity-75 hover:opacity-100'
                    }`}
                    title="Click to toggle Inquiry Leads series"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pr-9">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeMetrics.leads}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer pointer-events-none"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            activeMetrics.leads ? 'text-purple-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Inquiry Leads
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className={`text-xl sm:text-3xl font-extrabold tracking-tight font-sans ${
                          activeMetrics.leads ? 'text-purple-600' : 'text-slate-400'
                        }`}
                      >
                        {(chartTotals.totalLeads ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        Quotes &amp; Calls
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-3.5 right-3 sm:top-5 sm:right-5 z-10 flex items-center gap-1.5">
                    <InfoTooltip {...STREAM_TOOLTIPS.chartLeads} />
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-2xs pointer-events-none"></span>
                  </div>
                </div>
              </div>

              {/* SUB-TOOLBAR: Context & Chart Mode Switcher */}
              <div className="px-4 sm:px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                    🇮🇳 IST Timezone
                  </span>
                  <span className="text-slate-500">{timeRangeContextLabel}</span>
                  {chartTotals.peakPeriod.views > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      ⭐ Peak: {chartTotals.peakPeriod.label} ({chartTotals.peakPeriod.views} views)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {pinnedPeriod && (
                    <button
                      type="button"
                      onClick={() => setPinnedPeriod(null)}
                      className="px-2.5 py-1 min-h-[36px] text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
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
                      className={`px-2.5 py-1 min-h-[36px] rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
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
                      className={`px-2.5 py-1 min-h-[36px] rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
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
                        boxShadow:
                          '0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                      }}
                      className="rounded-xl p-3 border text-xs shadow-2xl min-w-[210px] backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-700/80">
                        <span
                          style={{ color: '#fbbf24', fontWeight: 700 }}
                          className="font-mono text-xs flex items-center gap-1.5"
                        >
                          <span>📅</span>
                          <span>
                            {activeItem.period} ({activeItem.label} IST)
                          </span>
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
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: '#2563eb' }}
                              ></span>
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
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: '#d97706' }}
                              ></span>
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
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: '#059669' }}
                              ></span>
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
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: '#7c3aed' }}
                              ></span>
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

                      {activeX !== null && (
                        <g className="transition-all duration-75">
                          <line
                            x1={activeX}
                            y1={marginTop - 8}
                            x2={activeX}
                            y2={baselineY}
                            stroke="#475569"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
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
                  <div className="overflow-x-auto pb-2 pl-2 sm:pl-8">
                    <div className="w-full md:min-w-[500px] flex items-end gap-1 sm:gap-2 h-64 pt-12 px-1">
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
                            <div
                              className={`absolute inset-0 rounded-xl transition-all duration-150 ${
                                isSelected
                                  ? 'bg-amber-100/70 ring-2 ring-amber-400/80'
                                  : 'group-hover:bg-slate-100/70'
                              }`}
                            />

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
              <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🔥 Most Clicked Buttons &amp; CTAs</span>
              <InfoTooltip {...STREAM_TOOLTIPS.topClicks} />
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
            <p className="text-sm text-slate-500 col-span-3 py-4 text-center">
              No clicks recorded in this period yet.
            </p>
          )}
        </div>
      </div>

      {/* Real-time Event Feed */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Live Activity Feed</span>
              <InfoTooltip {...STREAM_TOOLTIPS.liveFeed} />
            </h2>
            <p className="text-xs text-slate-500">Every interaction recorded in real time</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIncludeHeartbeat((prev) => !prev)}
                className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  includeHeartbeat
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${includeHeartbeat ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <span>{includeHeartbeat ? 'Showing 30s pings' : '30s pings hidden'}</span>
              </button>
              <InfoTooltip {...STREAM_TOOLTIPS.heartbeatToggle} />
            </div>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Filter live stream..."
                className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs"
              />
              <span className="absolute left-2.5 top-3 sm:top-2 text-xs text-slate-400">🔍</span>
              {eventSearch && (
                <button
                  type="button"
                  onClick={() => setEventSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Card Layout (< 768px) */}
        <div className="block md:hidden space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-sm font-semibold text-slate-700">No events recorded</p>
              <p className="text-xs text-slate-500 mt-1">
                No recent activity recorded for this period.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const vFlag = stats?.flags?.find(
                (f) => (f.target_value || '').toLowerCase() === (ev.visitor_id || '').toLowerCase()
              );
              return (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
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
                      {ev.is_return_day && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs"
                          title="Buyer visited on a previous day"
                        >
                          🔁 Return Day
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatTimeAgo(ev.created_at)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ev.identified_name ? (
                        <span className="font-bold text-amber-800 text-sm">
                          🌟 {ev.identified_name}
                        </span>
                      ) : (
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded break-all">
                          👤 {ev.visitor_id}
                        </span>
                      )}
                      {vFlag && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          🚩 {vFlag.flag_type}
                        </span>
                      )}
                      {checkIsRestricted(ev.visitor_id, ev.ip_address, ev.is_restricted) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white shadow-2xs">
                          🚫 Restricted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <span>
                        📍 {ev.city ? `${decodeCityName(ev.city)}, ` : ''}
                        {ev.country || 'Unknown'}
                      </span>
                      {ev.ip_address && (
                        <span className="font-mono text-[11px] text-slate-500">
                          ({ev.ip_address})
                        </span>
                      )}
                    </div>
                  </div>

                  {(ev.element_text || ev.element_target || ev.metadata) && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1 break-words">
                      {ev.element_text && (
                        <div className="font-medium text-slate-900 break-words">
                          {ev.element_text}
                        </div>
                      )}
                      {ev.element_target && (
                        <div className="text-slate-500 text-[11px] font-mono break-all">
                          Target: {ev.element_target}
                        </div>
                      )}
                      {ev.metadata?.productTitle && (
                        <div className="text-amber-700 font-semibold text-[11px]">
                          Product: {ev.metadata.productTitle}
                        </div>
                      )}
                      {ev.metadata?.partNumber && (
                        <div className="text-slate-500 font-mono text-[11px] break-all">
                          Part #{ev.metadata.partNumber}
                        </div>
                      )}
                      {ev.metadata?.searchQuery && (
                        <div className="text-slate-600 text-[11px]">
                          Search: &quot;{ev.metadata.searchQuery}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[180px] break-all">
                      {ev.page_path}
                    </span>
                    <button
                      type="button"
                      onClick={() => openVisitorJourney(ev.visitor_id, ev.ip_address)}
                      className="min-h-[44px] px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (>= 768px Preserved) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
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
                    <td
                      className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono"
                      title={`${formatIST(ev.created_at)} IST`}
                    >
                      {formatTimeAgo(ev.created_at)}
                      <span className="block text-[10px] text-slate-400 font-sans">
                        {formatIST(ev.created_at, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
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
                        <span className="text-slate-600 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded break-all">
                          {(ev.visitor_id || '').slice(0, 8)}...
                        </span>
                      )}
                      {(() => {
                        const vFlag = stats?.flags?.find(
                          (f) => (f.target_value || '').toLowerCase() === (ev.visitor_id || '').toLowerCase()
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
                      {checkIsRestricted(ev.visitor_id, ev.ip_address, ev.is_restricted) && (
                        <span className="block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 w-fit bg-slate-900 text-white shadow-2xs">
                          🚫 Restricted
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-700">
                        {ev.city ? `${decodeCityName(ev.city)}, ` : ''}
                        {ev.country || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                        {ev.is_return_day && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
                            title="Returning buyer on a different day"
                          >
                            🔁 Return Day
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 max-w-xs truncate font-sans"
                      title={ev.element_text || ev.element_target}
                    >
                      <span className="text-slate-900 font-medium">
                        {ev.element_text || ev.element_target || '-'}
                      </span>
                      {ev.metadata?.productTitle && (
                        <span className="block text-[11px] text-amber-700 font-semibold">
                          Product: {ev.metadata.productTitle}
                        </span>
                      )}
                      {ev.metadata?.searchQuery && (
                        <span className="block text-[11px] text-slate-500">
                          via Search: &quot;{ev.metadata.searchQuery}&quot;
                          {ev.metadata?.resultRank ? ` (#${ev.metadata.resultRank})` : ''}
                        </span>
                      )}
                      {ev.metadata?.partNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono break-all">
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
                          Closed: {ev.metadata.reason}
                          {ev.metadata?.queryAtClose ? ` • Query: "${ev.metadata.queryAtClose}"` : ''}
                        </span>
                      )}
                      {ev.metadata?.copiedText && (
                        <span className="block text-[11px] text-amber-800">
                          Copied: &quot;{ev.metadata.copiedText}&quot;
                        </span>
                      )}
                      {ev.metadata?.query && (
                        <span className="block text-[11px] text-indigo-700">
                          Searched: &quot;{ev.metadata.query}&quot; ({ev.metadata.resultsCount} results)
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-slate-500 truncate max-w-[140px] font-mono text-[11px]"
                      title={ev.page_path}
                    >
                      {ev.page_path}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openVisitorJourney(ev.visitor_id, ev.ip_address)}
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
  );
}
