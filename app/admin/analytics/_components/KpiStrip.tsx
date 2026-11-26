'use client';

import React from 'react';
import type { DashboardStats } from '../_types/analytics';
import { formatDuration } from '../_utils/formatters';

interface KpiStripProps {
  stats: DashboardStats | null;
}

export default function KpiStrip({ stats }: KpiStripProps) {
  return (
    <>
      {/* Mobile Top Global KPI Strip (< 768px) */}
      <div className="flex md:hidden overflow-x-auto scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 mb-4">
        {/* Card 1: Unique Visitors */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Visitors
          </span>
          <div className="text-lg font-extrabold text-slate-900 mt-1 font-sans">
            {(stats?.kpis?.totalVisitors ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Distinct devices</span>
        </div>

        {/* Card 2: Total Views */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Views
          </span>
          <div className="text-lg font-extrabold text-slate-900 mt-1 font-sans">
            {(stats?.kpis?.totalPageviews ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            {stats?.kpis?.totalSessions ?? 0} sessions
          </span>
        </div>

        {/* Card 3: WhatsApp Clicks */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            WhatsApp
          </span>
          <div className="text-lg font-extrabold text-emerald-600 mt-1 font-sans">
            {(stats?.kpis?.whatsappClicks ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5 truncate">
            Direct quotes
          </span>
        </div>

        {/* Card 4: Phone Calls */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Calls
          </span>
          <div className="text-lg font-extrabold text-blue-600 mt-1 font-sans">
            {(stats?.kpis?.phoneCalls ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-blue-600/80 block mt-0.5 truncate">Direct dials</span>
        </div>

        {/* Card 5: Form Leads */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            Form Leads
          </span>
          <div className="text-lg font-extrabold text-purple-600 mt-1 font-sans">
            {(stats?.kpis?.formLeads ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-purple-600/80 block mt-0.5 truncate">
            {stats?.kpis?.persistedFormSubmissions !== undefined
              ? `Saved: ${stats.kpis.persistedFormSubmissions}`
              : 'Messages'}
          </span>
        </div>

        {/* Card 6: Avg Dwell Time */}
        <div className="shrink-0 w-[140px] snap-start bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Avg Dwell
          </span>
          <div className="text-lg font-extrabold text-amber-600 mt-1 font-sans">
            {formatDuration(stats?.kpis?.avgDurationSeconds || 0)}
          </div>
          <span className="text-[10px] text-amber-600/80 block mt-0.5 truncate">Browsing time</span>
        </div>
      </div>

      {/* Desktop KPI Scorecard Grid (>= 768px Preserved Intact) */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Unique Visitors
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-sans">
            {(stats?.kpis?.totalVisitors ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Distinct devices</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Views
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-sans">
            {(stats?.kpis?.totalPageviews ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats?.kpis?.totalSessions ?? 0} sessions
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            WhatsApp Clicks
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-sans">
            {(stats?.kpis?.whatsappClicks ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">Direct quotes</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
            Phone Calls
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 font-sans">
            {(stats?.kpis?.phoneCalls ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-blue-700/80 mt-1 block">Direct dials</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
            Form Leads
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1 font-sans">
            {(stats?.kpis?.formLeads ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-700/80 mt-1 block">
            {stats?.kpis?.persistedFormSubmissions !== undefined
              ? `${stats.kpis.persistedFormSubmissions} saved backups`
              : 'Form messages'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all hover:-translate-y-0.5">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Avg Dwell Time
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1 font-sans">
            {formatDuration(stats?.kpis?.avgDurationSeconds || 0)}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-1 block">Browsing time</span>
        </div>
      </div>
    </>
  );
}
