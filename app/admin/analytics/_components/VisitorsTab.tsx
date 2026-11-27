'use client';

import React from 'react';
import { getIndustrialBadge } from '@/lib/analytics/clusters';
import type {
  DashboardStats,
  TimeRange,
  VisitorDeviceFilter,
  VisitorDirectoryItem,
  VisitorSegmentFilter,
  VisitorsListSummaryCounts,
} from '../_types/analytics';
import {
  buildWhatsAppOutreachUrl,
  decodeCityName,
  formatIST,
  formatTimeAgo,
  getCountryFlag,
  triggerCsvDownload,
} from '../_utils/formatters';
import InfoTooltip from './InfoTooltip';
import { VISITORS_TOOLTIPS } from '../_utils/metricTooltips';

export interface VisitorFiltersState {
  search: string;
  segment: VisitorSegmentFilter;
  device: VisitorDeviceFilter;
  page: number;
  pageSize: number;
}

interface VisitorsTabProps {
  stats: DashboardStats | null;
  timeRange: TimeRange;
  visitorsList: VisitorDirectoryItem[];
  visitorTotalCount: number;
  visitorSummaryCounts: VisitorsListSummaryCounts;
  visitorFilters: VisitorFiltersState;
  setVisitorFilters: React.Dispatch<React.SetStateAction<VisitorFiltersState>>;
  isVisitorsLoading: boolean;
  fetchVisitors: () => Promise<void>;
  checkIsRestricted: (
    visitorId?: string | null,
    ipAddress?: string | null,
    isExplicitRestricted?: boolean
  ) => boolean;
  flaggingInProgress: string | null;
  contactCopiedFeedback: string | null;
  copyToClipboard: (text: string, id: string, e?: React.MouseEvent) => void;
  openVisitorJourney: (visitorId: string, ipAddress?: string | null) => void;
  handleToggleFlag: (
    targetType: 'visitor_id' | 'ip',
    targetValue: string,
    flagType: string,
    note?: string
  ) => Promise<void>;
  handleRemoveFlag: (targetValue: string, flagType?: string) => Promise<void>;
  handleAddRestriction: (
    customVal?: string,
    customType?: 'ip' | 'visitor_id',
    customNote?: string
  ) => Promise<void>;
  handleRemoveVisitorRestrictions: (
    visitorId?: string | null,
    ipAddress?: string | null
  ) => Promise<void>;
}

export default function VisitorsTab({
  stats,
  timeRange,
  visitorsList,
  visitorTotalCount,
  visitorSummaryCounts,
  visitorFilters,
  setVisitorFilters,
  isVisitorsLoading,
  fetchVisitors,
  checkIsRestricted,
  flaggingInProgress,
  contactCopiedFeedback,
  copyToClipboard,
  openVisitorJourney,
  handleToggleFlag,
  handleRemoveFlag,
  handleAddRestriction,
  handleRemoveVisitorRestrictions,
}: VisitorsTabProps) {
  const visitorTotalPages = Math.max(1, Math.ceil(visitorTotalCount / visitorFilters.pageSize));
  const cohort = stats?.cohortRetentionStats;

  const handleExportVisitorsCSV = () => {
    if (visitorsList.length === 0) return;
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
      'Last Viewed Page',
    ];
    const rows = visitorsList.map((v) => {
      const isTargetRestricted = checkIsRestricted(v.visitor_id, v.ip_address, v.is_restricted);
      const targetFlag = stats?.flags?.find(
        (f) =>
          (f.target_value || '').toLowerCase() === (v.visitor_id || '').toLowerCase() ||
          (v.ip_address && f.target_value === v.ip_address)
      );

      return [
        v.visitor_id,
        v.identified_name || '',
        v.identified_contact || '',
        v.ip_address || '',
        decodeCityName(v.city),
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
        v.last_page_viewed || '',
      ];
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    triggerCsvDownload(
      `mm-earthmovers-visitors-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`,
      csvContent
    );
  };

  return (
    <div className="space-y-6">
      {/* EXECUTIVE BUYER & LEAD SCORECARDS */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:mx-0 md:px-0">
        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Distinct Visitors
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...VISITORS_TOOLTIPS.distinctVisitors} />
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xs sm:text-sm font-bold shadow-2xs">
                👥
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {(visitorSummaryCounts?.total ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 hidden sm:block">
            Unique client devices &amp; networks in period
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">
            Unique devices
          </p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wider truncate">
              Identified Leads
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...VISITORS_TOOLTIPS.identifiedLeads} />
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center text-xs sm:text-sm font-bold shadow-2xs">
                🌟
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-amber-900 tracking-tight flex items-baseline gap-1.5 sm:gap-2">
            {(visitorSummaryCounts?.leads ?? 0).toLocaleString('en-IN')}
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
              High Intent
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 hidden sm:block">
            Stitched customer names &amp; contact numbers
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">
            Customer leads
          </p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wider truncate">
              WhatsApp RFQ Inquirers
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...VISITORS_TOOLTIPS.whatsappInquirers} />
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs sm:text-sm font-bold shadow-2xs">
                💬
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight flex items-baseline gap-1.5 sm:gap-2">
            {(visitorSummaryCounts?.rfq ?? 0).toLocaleString('en-IN')}
            {(visitorSummaryCounts?.total ?? 0) > 0 && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                {(((visitorSummaryCounts?.rfq ?? 0) / (visitorSummaryCounts?.total ?? 1)) * 100).toFixed(1)}% Conv
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 hidden sm:block">
            Direct parts quote inquiries initiated
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">Direct RFQs</p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 uppercase tracking-wider truncate">
              Repeat Fleets (2+ / Multi-Day)
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...VISITORS_TOOLTIPS.repeatFleets} />
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs sm:text-sm font-bold shadow-2xs">
                🔁
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight flex items-baseline gap-1.5 sm:gap-2">
            {(visitorSummaryCounts?.repeat ?? 0).toLocaleString('en-IN')}
            <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-indigo-200 whitespace-nowrap">
              Fleet Accounts
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 hidden sm:block">
            Mining contractors &amp; workshop procurement
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">
            Mining &amp; fleets
          </p>
        </div>
      </div>

      {/* SEARCH, SEGMENT FILTERS & ACTIONS TOOLBAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, phone (+91), visitor ID, IP address, city, state, or viewed page..."
              value={visitorFilters.search}
              onChange={(e) =>
                setVisitorFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
              }
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-9 py-2 text-base sm:text-xs rounded-xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition placeholder:text-slate-400"
            />
            {visitorFilters.search && (
              <button
                type="button"
                onClick={() => setVisitorFilters((prev) => ({ ...prev, search: '', page: 1 }))}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-sm"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({ ...prev, device: 'all', page: 1 }))
                }
                className={`min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg transition ${
                  visitorFilters.device === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({ ...prev, device: 'mobile', page: 1 }))
                }
                className={`min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg transition ${
                  visitorFilters.device === 'mobile'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                📱 Mobile
              </button>
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({ ...prev, device: 'desktop', page: 1 }))
                }
                className={`min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg transition ${
                  visitorFilters.device === 'desktop'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                🖥️ Desktop
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-1">
              <span>Show:</span>
              <select
                value={visitorFilters.pageSize}
                onChange={(e) =>
                  setVisitorFilters((prev) => ({
                    ...prev,
                    pageSize: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="min-h-[44px] sm:min-h-[32px] px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportVisitorsCSV}
              disabled={visitorsList.length === 0}
              className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>📥</span>
              <span>Export CSV ({visitorsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchVisitors()}
              disabled={isVisitorsLoading}
              className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 transition shadow-xs disabled:opacity-50 flex items-center justify-center"
              title="Refresh visitors directory"
            >
              <span className={isVisitorsLoading ? 'animate-spin inline-block' : ''}>🔄</span>
            </button>
          </div>
        </div>

        {/* Segment Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setVisitorFilters((prev) => ({ ...prev, segment: 'all', page: 1 }))}
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition ${
              visitorFilters.segment === 'all'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Buyers ({visitorSummaryCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setVisitorFilters((prev) => ({ ...prev, segment: 'leads', page: 1 }))}
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              visitorFilters.segment === 'leads'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span>🌟 Identified Leads</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
              {visitorSummaryCounts.leads}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisitorFilters((prev) => ({ ...prev, segment: 'rfq', page: 1 }))}
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              visitorFilters.segment === 'rfq'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span>💬 WhatsApp RFQs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
              {visitorSummaryCounts.rfq}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisitorFilters((prev) => ({ ...prev, segment: 'repeat', page: 1 }))}
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              visitorFilters.segment === 'repeat'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            <span>🔁 Repeat Fleets (2+ / Multi-Day)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
              {visitorSummaryCounts.repeat}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisitorFilters((prev) => ({ ...prev, segment: 'flagged', page: 1 }))}
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              visitorFilters.segment === 'flagged'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span>🚩 Flagged / Competitors</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
              {visitorSummaryCounts.flagged}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              setVisitorFilters((prev) => ({ ...prev, segment: 'restricted', page: 1 }))
            }
            className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              visitorFilters.segment === 'restricted'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🚫 Restricted</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
              {visitorSummaryCounts.restricted}
            </span>
          </button>
        </div>
      </div>

      {/* MASTER VISITOR & BUYER DIRECTORY TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Visitor Directory &amp; Commercial Leads</span>
              <InfoTooltip {...VISITORS_TOOLTIPS.visitorDirectory} />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {visitorsList.length} of {visitorTotalCount} buyers matching criteria
            </p>
          </div>
          {contactCopiedFeedback && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in">
              ✓ Copied {contactCopiedFeedback} to clipboard!
            </span>
          )}
        </div>

        {visitorsList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
              🔍
            </div>
            <h3 className="text-sm font-bold text-slate-800">No matching buyers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try clearing your search query or switching to &apos;All Buyers&apos; to view all persistent visitor records.
            </p>
            {(visitorFilters.search ||
              visitorFilters.segment !== 'all' ||
              visitorFilters.device !== 'all') && (
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({
                    ...prev,
                    search: '',
                    segment: 'all',
                    device: 'all',
                    page: 1,
                  }))
                }
                className="mt-4 min-h-[44px] sm:min-h-[34px] px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Native Mobile Lead Cards (Mobile < 768px) */}
            <div className="block md:hidden space-y-3 p-3 sm:p-4">
              {visitorsList.map((vis) => {
                const isTargetRestricted = checkIsRestricted(
                  vis.visitor_id,
                  vis.ip_address,
                  vis.is_restricted
                );
                const targetFlag = stats?.flags?.find(
                  (f) =>
                    (f.target_value || '').toLowerCase() === (vis.visitor_id || '').toLowerCase() ||
                    (vis.ip_address && f.target_value === vis.ip_address)
                );
                const isTargetFlagged = vis.is_flagged || Boolean(targetFlag);
                const effectiveFlagType = targetFlag?.flag_type || vis.flag_type;
                const industrialCluster = getIndustrialBadge(vis.region, vis.city);
                const waDirectUrl = buildWhatsAppOutreachUrl(
                  vis.identified_contact,
                  vis.identified_name
                );

                return (
                  <div
                    key={vis.visitor_id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            vis.identified_name
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {vis.identified_name
                            ? vis.identified_name.charAt(0).toUpperCase()
                            : vis.device_type === 'mobile'
                            ? '📱'
                            : '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {vis.identified_name || `${(vis.visitor_id || '').slice(0, 12)}...`}
                            </span>
                            {vis.identified_name && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Lead
                              </span>
                            )}
                          </div>
                          {vis.identified_contact ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600 font-mono mt-0.5">
                              <span>📞 {vis.identified_contact}</span>
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(vis.identified_contact!, 'Phone', e)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 font-mono truncate break-all">
                              {(vis.visitor_id || '').slice(0, 16)}...
                            </p>
                          )}
                        </div>
                      </div>

                      {waDirectUrl && (
                        <a
                          href={waDirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer"
                          title="Open WhatsApp chat with lead"
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        <span>{getCountryFlag(vis.country_code || vis.country || '')}</span>
                        <span>
                          {vis.city ? `${decodeCityName(vis.city)}, ` : ''}
                          {vis.region || vis.country || 'Unknown'}
                        </span>
                      </span>
                      {industrialCluster && (
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${industrialCluster.bg}`}
                        >
                          {industrialCluster.label}
                        </span>
                      )}
                      {Number(vis.whatsapp_clicks) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          💬 {vis.whatsapp_clicks} RFQ{Number(vis.whatsapp_clicks) > 1 ? 's' : ''}
                        </span>
                      )}
                      {Number(vis.distinct_days_count) > 1 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🔁 {vis.distinct_days_count} Days Active
                        </span>
                      ) : vis.total_sessions >= 2 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          🔁 Repeat ({vis.total_sessions}x)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          🌟 1st Day
                        </span>
                      )}
                      {isTargetFlagged && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          🚩 {effectiveFlagType || 'Flagged'}
                        </span>
                      )}
                      {isTargetRestricted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          🚫 Restricted
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Sessions &amp; Clicks
                        </span>
                        <span className="font-semibold text-slate-800">
                          {vis.total_sessions} sessions • {vis.total_clicks} clicks
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Last Activity
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatTimeAgo(vis.last_seen_at)}
                        </span>
                      </div>
                      {vis.last_rfq_part && (
                        <div className="col-span-2 text-[11px] text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded border border-emerald-200/60 truncate break-all">
                          💬 Inquired: &ldquo;{vis.last_rfq_part}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openVisitorJourney(vis.visitor_id, vis.ip_address)}
                        className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <span>🧭</span>
                        <span>Journey</span>
                      </button>

                      {isTargetFlagged ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleRemoveFlag(
                              vis.ip_address || vis.visitor_id,
                              effectiveFlagType || undefined
                            )
                          }
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition min-h-[44px]"
                        >
                          Unflag
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleToggleFlag(
                              vis.ip_address ? 'ip' : 'visitor_id',
                              vis.ip_address || vis.visitor_id,
                              'competitor',
                              'Flagged from mobile directory'
                            )
                          }
                          className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition min-h-[44px]"
                        >
                          🚩 Flag
                        </button>
                      )}

                      {isTargetRestricted ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleRemoveVisitorRestrictions(vis.visitor_id, vis.ip_address)
                          }
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition min-h-[44px]"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleAddRestriction(
                              vis.ip_address || vis.visitor_id,
                              vis.ip_address ? 'ip' : 'visitor_id',
                              'Restricted from mobile directory'
                            )
                          }
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition min-h-[44px]"
                        >
                          🚫 Block
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Master 6-Column Visitors Table (Desktop >= 768px Preserved) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[11px] uppercase bg-slate-50/90 text-slate-500 font-semibold tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-4">Buyer / Lead Profile</th>
                    <th className="py-3.5 px-4">Location &amp; Industrial Cluster</th>
                    <th className="py-3.5 px-4">Network &amp; Client</th>
                    <th className="py-3.5 px-4">Commercial Intent</th>
                    <th className="py-3.5 px-4">Activity Lifecycle</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {visitorsList.map((vis) => {
                    const isTargetRestricted = checkIsRestricted(
                      vis.visitor_id,
                      vis.ip_address,
                      vis.is_restricted
                    );
                    const targetFlag = stats?.flags?.find(
                      (f) =>
                        (f.target_value || '').toLowerCase() === (vis.visitor_id || '').toLowerCase() ||
                        (vis.ip_address && f.target_value === vis.ip_address)
                    );
                    const isTargetFlagged = vis.is_flagged || Boolean(targetFlag);
                    const effectiveFlagType = targetFlag?.flag_type || vis.flag_type;
                    const industrialCluster = getIndustrialBadge(vis.region, vis.city);
                    const waDirectUrl = buildWhatsAppOutreachUrl(
                      vis.identified_contact,
                      vis.identified_name
                    );

                    return (
                      <tr
                        key={vis.visitor_id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
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
                                      type="button"
                                      onClick={(e) =>
                                        copyToClipboard(vis.identified_contact!, 'Phone', e)
                                      }
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
                                  {(vis.visitor_id || '').slice(0, 14)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    copyToClipboard(vis.visitor_id, 'Visitor ID', e)
                                  }
                                  className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                                  title="Copy full Visitor ID"
                                >
                                  📋
                                </button>
                              </div>
                            )}

                            <div className="flex items-center flex-wrap gap-1 pt-0.5">
                              {isTargetFlagged && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                  🚩 {effectiveFlagType || 'Flagged'}
                                </span>
                              )}
                              {Number(vis.whatsapp_clicks) > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  💬 {vis.whatsapp_clicks} RFQ
                                  {Number(vis.whatsapp_clicks) > 1 ? 's' : ''}
                                </span>
                              )}
                              {(vis.total_sessions >= 2 || Number(vis.distinct_days_count) > 1) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  🔁 Repeat Fleet ({vis.total_sessions}x)
                                </span>
                              )}
                              {vis.last_rfq_part && (
                                <span
                                  className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 max-w-[200px] truncate"
                                  title={vis.last_rfq_part}
                                >
                                  💬 &ldquo;{vis.last_rfq_part}&rdquo;
                                </span>
                              )}
                              {vis.last_page_viewed && vis.last_page_viewed.startsWith('/products/') && (
                                <span
                                  className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[180px] truncate"
                                  title={vis.last_page_viewed}
                                >
                                  📦 {vis.last_page_viewed.replace('/products/', '')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-base">
                                {getCountryFlag(vis.country_code || vis.country || '')}
                              </span>
                              <span>
                                {vis.city ? `${decodeCityName(vis.city)}, ` : ''}
                                {vis.region ? `${vis.region}, ` : ''}
                                {vis.country || 'Unknown'}
                              </span>
                            </div>
                            {industrialCluster && (
                              <div>
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${industrialCluster.bg}`}
                                >
                                  {industrialCluster.label}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {vis.ip_address ? (
                                <>
                                  <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800 border border-slate-200/60">
                                    {vis.ip_address}
                                  </span>
                                  <button
                                    type="button"
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
                              <span>
                                {vis.device_type === 'mobile'
                                  ? '📱'
                                  : vis.device_type === 'tablet'
                                  ? '📟'
                                  : '🖥️'}
                              </span>
                              <span>{vis.device_type || 'Desktop'}</span>
                              <span>•</span>
                              <span
                                className="truncate max-w-[140px]"
                                title={`${vis.browser || ''} on ${vis.os || ''}`}
                              >
                                {vis.browser || 'Browser'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="font-bold text-slate-900">
                                {vis.total_sessions}
                              </span>
                              <span className="text-slate-500 text-[11px]">sessions</span>
                              <span className="text-slate-300">•</span>
                              {Number(vis.distinct_days_count) > 1 ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  🔁 {vis.distinct_days_count} Days
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                  🌟 Day 1
                                </span>
                              )}
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

                        <td
                          className="py-3.5 px-4 text-slate-500 font-mono"
                          title={`${formatIST(vis.last_seen_at)} IST`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-slate-800">
                              {formatTimeAgo(vis.last_seen_at)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {formatIST(vis.last_seen_at, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                            {vis.first_seen_at && vis.first_seen_at !== vis.last_seen_at && (
                              <div className="text-[10px] text-slate-400 font-sans">
                                First seen:{' '}
                                {formatIST(vis.first_seen_at, { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVisitorJourney(vis.visitor_id, vis.ip_address)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                              title="View full clickstream audit"
                            >
                              <span>🧭</span>
                              <span>Journey</span>
                            </button>

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

                            {isTargetFlagged ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveFlag(
                                    vis.ip_address || vis.visitor_id,
                                    effectiveFlagType || undefined
                                  )
                                }
                                disabled={
                                  flaggingInProgress === (vis.ip_address || vis.visitor_id)
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                                title="Remove competitor/scraper sentinel flag"
                              >
                                Unflag
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleFlag(
                                    vis.ip_address ? 'ip' : 'visitor_id',
                                    vis.ip_address || vis.visitor_id,
                                    'competitor',
                                    `Flagged from Visitors directory (${
                                      vis.city || vis.country || 'Unknown'
                                    })`
                                  )
                                }
                                disabled={
                                  flaggingInProgress === (vis.ip_address || vis.visitor_id)
                                }
                                className="px-2 py-1 bg-amber-50/70 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-lg text-xs font-medium transition"
                                title="Flag as Competitor Lurker (Sentinel passive monitoring)"
                              >
                                🚩 Flag
                              </button>
                            )}

                            {isTargetRestricted ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveVisitorRestrictions(
                                    vis.visitor_id,
                                    vis.ip_address
                                  )
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
                                title="Remove restriction and allow access"
                              >
                                Unrestrict
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAddRestriction(
                                    vis.ip_address || vis.visitor_id,
                                    vis.ip_address ? 'ip' : 'visitor_id',
                                    `Restricted from Visitors directory (${
                                      vis.city || vis.country || 'Unknown'
                                    })`
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
          </>
        )}

        {/* SERVER-SIDE PAGINATION BAR */}
        {visitorTotalCount > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing{' '}
              <strong className="text-slate-900 font-semibold">
                {(visitorFilters.page - 1) * visitorFilters.pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900 font-semibold">
                {Math.min(visitorFilters.page * visitorFilters.pageSize, visitorTotalCount)}
              </strong>{' '}
              of <strong className="text-slate-900 font-semibold">{visitorTotalCount}</strong> buyers
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                disabled={visitorFilters.page <= 1}
                className="min-h-[44px] sm:min-h-[32px] px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="px-2.5 py-1 font-semibold text-slate-800">
                Page {visitorFilters.page} of {visitorTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisitorFilters((prev) => ({
                    ...prev,
                    page: Math.min(visitorTotalPages, prev.page + 1),
                  }))
                }
                disabled={visitorFilters.page >= visitorTotalPages}
                className="min-h-[44px] sm:min-h-[32px] px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COHORT RETENTION & RETURN-DAY LIFT (`BI-09`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🔁 Cohort Retention &amp; Return-Day Conversion Lift</span>
              <InfoTooltip {...VISITORS_TOOLTIPS.cohortRetention} />
            </h3>
            <p className="text-xs text-slate-500">
              Session depth distribution (1 / 2 / 3+), Day 1 vs Return-Day RFQ conversion lift, and first-touch sources
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono self-start sm:self-auto">
            {cohort?.repeat7dRate ?? 0}% 7d Repeat
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                New Visitors
              </span>
              <InfoTooltip {...VISITORS_TOOLTIPS.newVisitors} />
            </div>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {cohort?.newVisitors ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Returning Visitors
              </span>
              <InfoTooltip {...VISITORS_TOOLTIPS.returningVisitors} />
            </div>
            <span className="text-xl font-extrabold text-indigo-700 font-mono">
              {cohort?.returningVisitors ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Avg Sessions / Visitor
              </span>
              <InfoTooltip {...VISITORS_TOOLTIPS.avgSessionsPerVisitor} />
            </div>
            <span className="text-xl font-extrabold text-amber-700 font-mono">
              {cohort?.avgSessionsPerVisitor ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Return-Day Lift
              </span>
              <InfoTooltip {...VISITORS_TOOLTIPS.returnDayLift} />
            </div>
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              {cohort?.returnDayLift?.returnDayRate ?? 0}%
            </span>
            <span className="block text-[10px] text-slate-500 font-mono">
              vs {cohort?.returnDayLift?.day1Rate ?? 0}% Day 1
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Session Cohorts (1 / 2 / 3+) */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>Session Frequency Cohorts (1 / 2 / 3+)</span>
              <InfoTooltip {...VISITORS_TOOLTIPS.cohortRetention} />
            </h4>
            {cohort?.cohorts && cohort.cohorts.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {cohort.cohorts.map((c) => (
                    <div
                      key={c.bucket}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{c.label}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {c.rfqRate}% RFQ
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                        <span>
                          {c.visitors} visitors ({c.sharePct}%)
                        </span>
                        <span>{c.rfqVisitors} converters</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Cohort</th>
                        <th className="py-2 px-3 text-center">Visitors</th>
                        <th className="py-2 px-3 text-center">Share</th>
                        <th className="py-2 px-3 text-center">RFQ Visitors</th>
                        <th className="py-2 px-3 text-right">RFQ Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cohort.cohorts.map((c) => (
                        <tr key={c.bucket}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{c.label}</td>
                          <td className="py-2 px-3 text-center font-mono">{c.visitors}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-500">
                            {c.sharePct}%
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-700">
                            {c.rfqVisitors}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                            {c.rfqRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No cohort data recorded yet.
              </p>
            )}
          </div>

          {/* First-Touch Attribution */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>First-Touch Attribution</span>
              <InfoTooltip {...VISITORS_TOOLTIPS.firstTouch} />
            </h4>
            {cohort?.firstTouchAttribution && cohort.firstTouchAttribution.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {cohort.firstTouchAttribution.map((f) => (
                    <div
                      key={f.source}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-slate-900 truncate">
                          {f.source}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {f.visitors} visitors · {f.converters} conv
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700 shrink-0">
                        {f.conversionRate}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Source</th>
                        <th className="py-2 px-3 text-center">Visitors</th>
                        <th className="py-2 px-3 text-center">Converters</th>
                        <th className="py-2 px-3 text-right">Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cohort.firstTouchAttribution.map((f) => (
                        <tr key={f.source}>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900 max-w-[180px] truncate">
                            {f.source}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{f.visitors}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-700 font-semibold">
                            {f.converters}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                            {f.conversionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No first-touch attribution rows yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
