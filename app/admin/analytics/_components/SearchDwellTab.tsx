'use client';

import React, { useState } from 'react';
import type {
  AdminTabId,
  DashboardStats,
  DwellView,
  SearchTab,
  SentinelFilter,
} from '../_types/analytics';
import { formatDuration, triggerCsvDownload } from '../_utils/formatters';

interface SearchDwellTabProps {
  stats: DashboardStats | null;
  setActiveTab: (tab: AdminTabId) => void;
  setProductSearch: (val: string) => void;
  flaggingInProgress: string | null;
  activeFlagFeedback: string | null;
  setActiveFlagFeedback: (val: string | null) => void;
  handleToggleFlag: (
    targetType: 'visitor_id' | 'ip',
    targetValue: string,
    flagType: string,
    note?: string
  ) => Promise<void>;
  handleRemoveFlag: (targetValue: string, flagType?: string) => Promise<void>;
  handleEscalateRestriction: (
    type: 'ip' | 'visitor_id',
    value: string,
    note: string
  ) => Promise<void>;
  handleCopyPart: (partNumber: string, e?: React.MouseEvent) => void;
  copyToClipboard: (text: string, id: string, e?: React.MouseEvent) => void;
  openVisitorJourney: (visitorId: string, ipAddress?: string | null) => void;
}

export default function SearchDwellTab({
  stats,
  setActiveTab,
  setProductSearch,
  flaggingInProgress,
  activeFlagFeedback,
  setActiveFlagFeedback,
  handleToggleFlag,
  handleRemoveFlag,
  handleEscalateRestriction,
  handleCopyPart,
  copyToClipboard,
  openVisitorJourney,
}: SearchDwellTabProps) {
  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [searchQueryFilter, setSearchQueryFilter] = useState('');
  const [dwellView, setDwellView] = useState<DwellView>('pages');
  const [sentinelFilter, setSentinelFilter] = useState<SentinelFilter>('all');

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
  const totalDwellSessions =
    bounceUnder10 + skim1060 + engaged15 + deep515 + zombie15 || 1;

  const deepReadPct = Math.round(((engaged15 + deep515) / totalDwellSessions) * 100);
  const bouncePct = Math.round((bounceUnder10 / totalDwellSessions) * 100);
  const skimPct = Math.round((skim1060 / totalDwellSessions) * 100);
  const engagedPct = Math.round((engaged15 / totalDwellSessions) * 100);
  const deepPct = Math.round((deep515 / totalDwellSessions) * 100);
  const zombiePct = Math.round((zombie15 / totalDwellSessions) * 100);

  const filteredSearches = (stats?.searchQueries || []).filter((q) => {
    const queryText = q.query_text || '';
    const matchesQuery =
      !searchQueryFilter.trim() ||
      queryText.toLowerCase().includes(searchQueryFilter.toLowerCase());
    if (!matchesQuery) return false;
    if (searchTab === 'zero') return q.zero_results;
    if (searchTab === 'stock') return !q.zero_results;
    if (searchTab === 'parts')
      return (
        /^[0-9A-Za-z]+([-\s/._][0-9A-Za-z]+)*$/.test(queryText) && queryText.length >= 3
      );
    return true;
  });

  const suspiciousSessions = (stats?.suspiciousDwellSessions || []).filter((s) => {
    if (sentinelFilter === 'flagged') return !!s.flag;
    if (sentinelFilter === 'scrapers') return s.heuristic === 'rapid_scraper';
    if (sentinelFilter === 'lurkers')
      return s.heuristic === 'lurker_zombie' || s.heuristic === 'competitor_recon';
    return true;
  });

  const flaggedCount = (stats?.flags || []).length;
  const detectedAlertsCount = stats?.suspiciousDwellSessions?.length || 0;

  const handleExportSearchCSV = () => {
    if (!stats || !stats.searchQueries) return;
    const headers = ['Query', 'Status', 'Search Count'];
    const rows = stats.searchQueries.map((s) => [
      `"${(s.query_text || '').replace(/"/g, '""')}"`,
      s.zero_results ? 'Zero Results (Catalog Gap)' : 'In Stock',
      s.count,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    triggerCsvDownload(
      `mm-earthmovers-search-demand-${new Date().toISOString().split('T')[0]}.csv`,
      csvContent
    );
  };

  const modelHubs = stats?.modelHubStats;

  return (
    <div className="space-y-6">
      {activeFlagFeedback && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg border border-amber-500/40">
          <span className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">🛡️ Surveillance Action:</span>
            <span>{activeFlagFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveFlagFeedback(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. TOP EXECUTIVE KPI SUMMARY CARDS */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:mx-0 md:px-0">
        <div className="shrink-0 snap-start w-[145px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Buyer Searches
            </span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs sm:text-sm">
              🔍
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalSearches}</div>
          <div className="hidden sm:flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">
              {totalSearches - zeroResultsCount} in-stock
            </span>
            <span>•</span>
            <span className="font-semibold text-rose-600">{zeroResultsCount} unmet</span>
          </div>
          <div className="flex sm:hidden items-center gap-1 mt-0.5 text-[10px] text-slate-400">
            <span className="font-semibold text-emerald-600">
              {totalSearches - zeroResultsCount} stk
            </span>
            <span>•</span>
            <span className="font-semibold text-rose-600">{zeroResultsCount} gap</span>
          </div>
        </div>

        <div className="shrink-0 snap-start w-[145px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Catalog Gap Rate
            </span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs sm:text-sm">
              💡
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600">{catalogGapRate}%</div>
          <div className="mt-1 sm:mt-1.5 text-xs text-slate-500 hidden sm:block truncate">
            {zeroResultsCount > 0
              ? `${zeroResultsCount} parts sought by buyers`
              : '100% catalog coverage'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400 block sm:hidden truncate">
            {zeroResultsCount > 0 ? `${zeroResultsCount} parts sought` : '100% coverage'}
          </div>
        </div>

        <div className="shrink-0 snap-start w-[145px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Deep Specs Dwell
            </span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs sm:text-sm">
              ⏱️
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{deepReadPct}%</div>
          <div className="mt-1 sm:mt-1.5 text-xs text-slate-500 hidden sm:block truncate">
            {engaged15 + deep515} sessions &gt; 1m evaluating
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400 block sm:hidden truncate">
            {engaged15 + deep515} sessions &gt; 1m
          </div>
        </div>

        <div className="shrink-0 snap-start w-[145px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Sentinel Alerts
            </span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs sm:text-sm">
              🛡️
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700">
            {detectedAlertsCount}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <span className="font-semibold text-amber-800">{flaggedCount} watchlisted</span>
            <span>•</span>
            <span>Passive surveillance</span>
          </div>
          <div className="flex sm:hidden items-center gap-1 mt-0.5 text-[10px] text-slate-400">
            <span className="font-semibold text-amber-800">{flaggedCount} watch</span>
          </div>
        </div>
      </div>

      {/* 2. SECTION A: BUYER SEARCH DEMAND & CATALOG GAP FINDER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>🔍 Buyer Search Demand &amp; Catalog Gap Finder</span>
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
              type="button"
              onClick={handleExportSearchCSV}
              className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
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
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-8 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQueryFilter && (
              <button
                type="button"
                onClick={() => setSearchQueryFilter('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSearchTab('all')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                searchTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats?.searchQueries?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSearchTab('zero')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                searchTab === 'zero'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              🔥 0 Results / Gaps ({zeroResultsCount})
            </button>
            <button
              type="button"
              onClick={() => setSearchTab('stock')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                searchTab === 'stock'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              ✅ In Stock ({Math.max(totalSearches - zeroResultsCount, 0)})
            </button>
            <button
              type="button"
              onClick={() => setSearchTab('parts')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                searchTab === 'parts'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              🔢 Part Numbers
            </button>
          </div>
        </div>

        {/* 2-Column Split: Search Demand Table + High-Intent Clipboard Copies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mobile Cards for Search Demand (< 768px) */}
          <div className="lg:col-span-2 block md:hidden space-y-3">
            {filteredSearches.length > 0 ? (
              filteredSearches.map((s, idx) => {
                const count = parseInt(s.count, 10) || 0;
                const sharePct = totalSearches > 0 ? Math.round((count / totalSearches) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 font-mono text-xs break-all flex items-center gap-1.5 flex-wrap">
                        <span>&quot;{s.query_text}&quot;</span>
                        <button
                          type="button"
                          onClick={(e) => copyToClipboard(s.query_text, 'Search Query', e)}
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          title="Copy Query"
                        >
                          📋
                        </button>
                      </div>
                      {!s.zero_results ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          <span>✓</span>
                          <span>In Stock Match</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          <span>⚠️</span>
                          <span>0 Results (Catalog Gap)</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{count} searches</span>
                        <span>{sharePct}% share</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            !s.zero_results ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(sharePct, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch(s.query_text);
                          setActiveTab('products');
                        }}
                        className="w-full min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>View Demand</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No search queries match the active filters.
              </div>
            )}
          </div>

          {/* Left Column (2/3): Search Demand Table (Desktop >= 768px Preserved) */}
          <div className="hidden md:block lg:col-span-2 overflow-x-auto rounded-xl border border-slate-200/80">
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
                    const sharePct =
                      totalSearches > 0 ? Math.round((count / totalSearches) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono text-xs">
                            &quot;{s.query_text}&quot;
                          </div>
                          <div className="w-32 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${
                                s.zero_results ? 'bg-rose-500' : 'bg-blue-600'
                              }`}
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
                                  setActiveFlagFeedback(
                                    `Copied query "${s.query_text}" to clipboard`
                                  );
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
                        <div
                          className="font-bold text-amber-900 font-mono truncate"
                          title={item.copied_text}
                        >
                          {item.copied_text}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {(item.item_type || '').replace('_', ' ')}
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
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No clipboard actions recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
              💡 Tip: Copied part numbers often precede direct WhatsApp RFQs or dealer phone inquiries.
            </div>
          </div>
        </div>
      </div>

      {/* 2B. SEARCH RANK CTR, SURFACE & FORM FUNNEL DIAGNOSTICS (`BI-03` & `BI-06`) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🎯 Search Surfaces, Rank CTR &amp; Recovery</span>
              </h3>
              <p className="text-xs text-slate-500">
                Result rank clicks, mouse vs keyboard navigation, and zero-result recovery
              </p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0">
              {stats?.searchFunnelStats?.recoveryRate ?? 0}% recovered
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Result Clicks
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {stats?.searchFunnelStats?.totalSelects ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                {stats?.searchFunnelStats?.mouseSelects ?? 0} mouse ·{' '}
                {stats?.searchFunnelStats?.keyboardSelects ?? 0} keys
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                0-Res Recovery
              </span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {stats?.searchFunnelStats?.recoveredSessions ?? 0}/
                {stats?.searchFunnelStats?.zeroResultSessions ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                {stats?.searchFunnelStats?.zeroResultWhatsappClicks ?? 0} WA fallbacks
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Surfaces Used
              </span>
              <div className="space-y-0.5 mt-1">
                {(stats?.searchFunnelStats?.bySurface || []).slice(0, 3).map((sf) => (
                  <div key={sf.surface} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-700 truncate">{sf.surface}</span>
                    <span className="font-bold text-slate-900 font-mono">{sf.searches}</span>
                  </div>
                ))}
                {(!stats?.searchFunnelStats?.bySurface ||
                  stats.searchFunnelStats.bySurface.length === 0) && (
                  <span className="text-[11px] text-slate-400">No surface data yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Click Share by Result Rank
            </span>
            {stats?.searchFunnelStats?.rankBuckets &&
            stats.searchFunnelStats.rankBuckets.length > 0 ? (
              stats.searchFunnelStats.rankBuckets.map((b) => (
                <div key={b.rank_bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{b.rank_bucket}</span>
                    <span className="font-mono text-slate-600">
                      {b.selects} ({b.sharePct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-amber-500 rounded-full"
                      style={{ width: `${Math.max(b.sharePct, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                No ranked result clicks tracked in this period yet.
              </p>
            )}
          </div>
        </div>

        {/* Form Start -> Abandon -> Error -> Submit Funnel (`BI-06`) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📝 Form Drop-Off &amp; Completion Funnel</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tracks form_start, validation errors, abandonments, and completed enquiries
              </p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold shrink-0">
              {stats?.formFunnelStats?.totals?.completion_rate ?? 0}% complete
            </span>
          </div>

          {stats?.formFunnelStats?.forms && stats.formFunnelStats.forms.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2.5">
                {stats.formFunnelStats.forms.map((f) => (
                  <div
                    key={f.form_name}
                    className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {f.form_name}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-bold shrink-0">
                        {f.completion_rate}% conv
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center text-[10px] pt-1 border-t border-slate-200/70">
                      <div>
                        <span className="text-slate-400 block">Starts</span>
                        <span className="font-bold text-slate-800 font-mono">{f.starts}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">ValErr</span>
                        <span className="font-bold text-amber-700 font-mono">
                          {f.validation_errors}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Abnd</span>
                        <span className="font-bold text-rose-700 font-mono">{f.abandons}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SysErr</span>
                        <span className="font-bold text-rose-800 font-mono">{f.submit_errors}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sent</span>
                        <span className="font-bold text-emerald-700 font-mono">{f.submits}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Form</th>
                      <th className="py-2.5 px-2 text-center">Starts</th>
                      <th className="py-2.5 px-2 text-center">Val Err</th>
                      <th className="py-2.5 px-2 text-center">Abandon</th>
                      <th className="py-2.5 px-2 text-center">Submits</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.formFunnelStats.forms.map((f) => (
                      <tr key={f.form_name} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{f.form_name}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{f.starts}</td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-700">
                          {f.validation_errors}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-rose-700">
                          {f.abandons}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                          {f.submits}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                          {f.completion_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              No form funnel interactions recorded in this time window yet.
            </div>
          )}
        </div>
      </div>

      {/* 2C. MACHINE MODEL HUBS, FAQ ACCORDIONS & SIBLING SWITCHER (`BI-08`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🚜 Machine Model Hubs, FAQs &amp; Sibling Navigation (BI-08)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Performance across all 10 canonical machine hubs, FAQ accordion opens, and sibling model hops
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              {modelHubs?.totalModelViews ?? 0} hub views
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              {modelHubs?.faqToggles ?? 0} FAQs
            </span>
            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              {modelHubs?.siblingClicks ?? 0} siblings
            </span>
          </div>
        </div>

        {/* 10 Machine Hubs */}
        {modelHubs?.hubs && modelHubs.hubs.length > 0 ? (
          <>
            <div className="block md:hidden space-y-2.5">
              {modelHubs.hubs.map((h) => (
                <div
                  key={h.machineSlug}
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate">
                      /models/{h.machineSlug}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0 font-mono">
                      {h.partConversionRate}% conv
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-1 border-t border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block">Views</span>
                      <span className="font-bold text-slate-800 font-mono">{h.views}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sessions</span>
                      <span className="font-bold text-slate-800 font-mono">{h.uniqueSessions}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Part Views</span>
                      <span className="font-bold text-blue-700 font-mono">
                        {h.downstreamPartViews}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Enquiries</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {h.downstreamEnquiries}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Machine Hub</th>
                    <th className="py-2.5 px-3 text-center">Hub Views</th>
                    <th className="py-2.5 px-3 text-center">Sessions</th>
                    <th className="py-2.5 px-3 text-center">Downstream Part Views</th>
                    <th className="py-2.5 px-3 text-center">Downstream Enquiries</th>
                    <th className="py-2.5 px-4 text-right">Part Conv. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modelHubs.hubs.map((h) => (
                    <tr key={h.machineSlug} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {h.machineSlug}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{h.views}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{h.uniqueSessions}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-700 font-semibold">
                        {h.downstreamPartViews}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                        {h.downstreamEnquiries}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-800">
                        {h.partConversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            No machine hub views recorded in this time window yet.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top FAQ Accordion Opens */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Top Model FAQ Questions Opened
            </h4>
            {modelHubs?.topFaqQuestions && modelHubs.topFaqQuestions.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {modelHubs.topFaqQuestions.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-800">
                          {f.machineSlug}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {f.opens}×
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 break-words">{f.question}</div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Hub</th>
                        <th className="py-2 px-3">Question</th>
                        <th className="py-2 px-3 text-right">Opens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modelHubs.topFaqQuestions.map((f, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                            {f.machineSlug}
                          </td>
                          <td className="py-2 px-3 text-slate-800 max-w-xs truncate">
                            {f.question}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{f.opens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No FAQ accordion interactions recorded yet.
              </p>
            )}
          </div>

          {/* Top Sibling Switcher Transitions */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Sibling Machine Switcher Flows
            </h4>
            {modelHubs?.topSiblingTransitions && modelHubs.topSiblingTransitions.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {modelHubs.topSiblingTransitions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold text-slate-900 break-all">
                          {s.sourceMachineSlug} → {s.targetMachineSlug}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {s.targetMachineName}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-700 shrink-0">
                        {s.clicks}×
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Transition</th>
                        <th className="py-2 px-3">Target Machine</th>
                        <th className="py-2 px-3 text-right">Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modelHubs.topSiblingTransitions.map((s, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-800">
                            {s.sourceMachineSlug} → {s.targetMachineSlug}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{s.targetMachineName}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {s.clicks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No sibling machine switches recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. SECTION B: DWELL TIME & DEEP READING DISTRIBUTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>⏱️ Dwell Time &amp; Deep Reading Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distinguish genuine buyers carefully examining machine specifications from rapid skimmers and idle tabs
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDwellView('pages')}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition ${
                dwellView === 'pages'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 Page-Level Dwell
            </button>
            <button
              type="button"
              onClick={() => setDwellView('sections')}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition ${
                dwellView === 'sections'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📑 Section Attention
            </button>
          </div>
        </div>

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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 pt-3 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-600 font-medium">&lt;10s Bounce:</span>
              <span className="font-bold text-slate-900 font-mono">
                {bounceUnder10} ({bouncePct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-600 font-medium">10-60s Skim:</span>
              <span className="font-bold text-slate-900 font-mono">
                {skim1060} ({skimPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span className="text-slate-600 font-medium">1-5m Engaged:</span>
              <span className="font-bold text-slate-900 font-mono">
                {engaged15} ({engagedPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span className="text-slate-600 font-medium">5-15m Deep:</span>
              <span className="font-bold text-slate-900 font-mono">
                {deep515} ({deepPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
              <span className="text-slate-600 font-medium">&gt;15m Stale:</span>
              <span className="font-bold text-slate-900 font-mono">
                {zombie15} ({zombiePct}%)
              </span>
            </div>
          </div>
        </div>

        {dwellView === 'pages' ? (
          <>
            <div className="block md:hidden space-y-3">
              {stats?.pageDwellStats && stats.pageDwellStats.length > 0 ? (
                stats.pageDwellStats.map((p, idx) => {
                  const dwellSec = parseFloat(p.avg_dwell_seconds) || 0;
                  const isDeep = dwellSec >= 60;
                  const isHealthy = dwellSec >= 20 && dwellSec < 60;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-900 block break-all">
                            {p.page_path}
                          </span>
                          {p.page_title && (
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                              {p.page_title}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            isDeep
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isHealthy
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isDeep ? '🌟 Deep Review' : isHealthy ? '📖 Healthy' : '⚡ Quick Skim'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Avg. Section Dwell
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            ⏱️ {Number(p.avg_dwell_seconds ?? 0).toFixed(1)}s
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Sessions
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            👥 {p.sessions}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Pageviews
                          </span>
                          <span className="font-bold text-slate-800 font-mono">📄 {p.views}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                  No page dwell metrics available.
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Page Path &amp; Catalog View</th>
                    <th className="py-3 px-4 text-center">Sessions</th>
                    <th className="py-3 px-4 text-center">Pageviews</th>
                    <th className="py-3 px-4 text-center">Avg. Section Dwell</th>
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
                            <div
                              className="font-mono text-xs font-bold text-slate-900 truncate max-w-sm"
                              title={p.page_path}
                            >
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
                              {Number(p.avg_dwell_seconds ?? 0).toFixed(1)}s
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
                              {isDeep
                                ? '🌟 Deep Specification Review'
                                : isHealthy
                                ? '📖 Healthy Reading'
                                : '⚡ Quick Skim'}
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
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats?.sectionAttention && stats.sectionAttention.length > 0 ? (
              stats.sectionAttention.map((sec, idx) => {
                const cleanName = (sec.section_id || '')
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                const dwellNum = parseFloat(sec.avg_dwell_seconds) || 0;
                return (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 shadow-xs"
                  >
                    <div
                      className="text-[11px] uppercase text-amber-700 font-bold mb-1 tracking-wider truncate"
                      title={sec.section_id}
                    >
                      #{cleanName}
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900">
                      {sec.avg_dwell_seconds}s
                    </div>
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
              <p className="text-sm text-slate-500 col-span-4 py-6 text-center">
                No section view data collected yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. SECTION C: COMPETITOR & NUISANCE SENTINEL */}
      <div className="bg-white border-2 border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-bold">
                🛡️
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Competitor &amp; Nuisance Surveillance Sentinel
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

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSentinelFilter('all')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                sentinelFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Candidates ({stats?.suspiciousDwellSessions?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSentinelFilter('flagged')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                sentinelFilter === 'flagged'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              🚩 Flagged ({flaggedCount})
            </button>
            <button
              type="button"
              onClick={() => setSentinelFilter('scrapers')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                sentinelFilter === 'scrapers'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              🤖 Scrapers
            </button>
            <button
              type="button"
              onClick={() => setSentinelFilter('lurkers')}
              className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                sentinelFilter === 'lurkers'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              🕵️ Lurkers &amp; Zombies
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-[11px] bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/70">
          <div className="flex items-start gap-2">
            <span className="text-base">🤖</span>
            <div>
              <strong className="text-purple-900 block">Rapid Catalog Scraper</strong>
              <span className="text-slate-600">
                Visited 3+ distinct part pages in under 25s (pricing/inventory scraping script).
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🕵️</span>
            <div>
              <strong className="text-amber-900 block">Competitor Recon / Lurker</strong>
              <span className="text-slate-600">
                Over 10-20 minutes open on product technical specs with 0 click interactions.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🚩</span>
            <div>
              <strong className="text-rose-900 block">Instant Tagging (No Block)</strong>
              <span className="text-slate-600">
                Clicking &quot;Flag&quot; tags them across Live Stream &amp; Visitors without breaking their page access.
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Cards for Sentinel Surveillance (< 768px) */}
        <div className="block md:hidden space-y-3">
          {suspiciousSessions.length > 0 ? (
            suspiciousSessions.map((s, idx) => {
              const isFlagged = !!s.flag;
              const isBusy = flaggingInProgress === s.visitor_id;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 break-all">
                          👤 {(s.visitor_id || '').slice(0, 12)}...
                        </span>
                        <button
                          type="button"
                          onClick={(e) => copyToClipboard(s.visitor_id, 'Visitor ID', e)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title="Copy Visitor ID"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>{s.device_type === 'mobile' ? '📱 Mobile' : '💻 Desktop'}</span>
                        {s.ip_address && (
                          <span className="font-mono text-[11px] text-slate-400">
                            • {s.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                    {isFlagged ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs uppercase shrink-0">
                        <span>🚩</span>
                        <span>{s.flag?.flag_type}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic shrink-0">Unflagged</span>
                    )}
                  </div>

                  <div>
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
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Origin Hub
                      </span>
                      <span className="font-semibold text-slate-800">
                        {s.city !== 'Unknown' ? `${s.city}, ` : ''}
                        {s.country}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Dwell &amp; Velocity
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatDuration(s.duration_seconds)} • {s.distinct_pages}p
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    {isFlagged ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemoveFlag(s.visitor_id, s.flag?.flag_type)}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        {isBusy ? '...' : '✕ Unflag'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleFlag('visitor_id', s.visitor_id, 'competitor')}
                          className="flex-1 min-h-[44px] py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center cursor-pointer"
                        >
                          {isBusy ? '...' : '🚩 Competitor'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleFlag('visitor_id', s.visitor_id, 'scraper')}
                          className="min-h-[44px] px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                        >
                          🤖
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => openVisitorJourney(s.visitor_id, s.ip_address)}
                      className="min-h-[44px] px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      🧭 Journey
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Restrict access for visitor ${(s.visitor_id || '').slice(0, 8)}...?`)) {
                          void handleEscalateRestriction(
                            'visitor_id',
                            s.visitor_id,
                            `Escalated from Sentinel: ${s.heuristic}`
                          );
                        }
                      }}
                      className="min-h-[44px] px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      title="Restrict"
                    >
                      🚫 Block
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              No suspicious dwell or scraper sessions detected.
            </div>
          )}
        </div>

        {/* Candidate Sessions Table (Desktop >= 768px Preserved) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
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
                        isFlagged
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {(s.visitor_id || '').slice(0, 10)}...
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

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-700 font-medium">
                          {s.city !== 'Unknown' ? `${s.city}, ` : ''}
                          {s.country}
                        </span>
                        <span
                          className="block text-[10px] text-slate-400 truncate max-w-[150px]"
                          title={s.entry_page}
                        >
                          Entry: {s.entry_page}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900 block">
                          {formatDuration(s.duration_seconds)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {s.distinct_pages} pages • {s.clicks_count} clicks
                        </span>
                      </td>

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

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isFlagged ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <span>🚩</span>
                            <span className="uppercase">{s.flag?.flag_type}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Unflagged
                          </span>
                        )}
                      </td>

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
                                onClick={() =>
                                  handleToggleFlag('visitor_id', s.visitor_id, 'competitor')
                                }
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded text-xs font-bold transition shadow-2xs"
                                title="Flag as Competitor (Passive Tag)"
                              >
                                {isBusy ? '...' : '🚩 Competitor'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleToggleFlag('visitor_id', s.visitor_id, 'scraper')
                                }
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-bold transition"
                                title="Flag as Automated Scraper"
                              >
                                🤖
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => openVisitorJourney(s.visitor_id, s.ip_address)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition"
                            title="Inspect visitor click and navigation journey"
                          >
                            Journey
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                                if (
                                  confirm(
                                    `Restrict access for visitor ${(s.visitor_id || '').slice(
                                      0,
                                      8
                                    )}...? This will block them from browsing parts catalog.`
                                  )
                                ) {
                                void handleEscalateRestriction(
                                  'visitor_id',
                                  s.visitor_id,
                                  `Escalated from Sentinel: ${s.heuristic}`
                                );
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
}
