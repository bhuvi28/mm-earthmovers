'use client';

import React from 'react';
import type { AdminTabId, DashboardStats, TimeRange } from '../_types/analytics';
import InfoTooltip from './InfoTooltip';
import { HEADER_TOOLTIPS, TAB_TOOLTIPS } from '../_utils/metricTooltips';

interface DashboardHeaderProps {
  stats: DashboardStats | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  autoRefresh: boolean;
  setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  onManualRefresh: () => void;
  onLogout: () => void;
  activeTab: AdminTabId;
  setActiveTab: (tab: AdminTabId) => void;
}

const TIME_RANGES: readonly TimeRange[] = [
  'today',
  'yesterday',
  '7d',
  '30d',
  '90d',
  '1y',
  'all',
];

const MOBILE_TABS: ReadonlyArray<{ id: AdminTabId; label: string }> = [
  { id: 'stream', label: '⚡ Stream' },
  { id: 'products', label: '📦 Products' },
  { id: 'audience', label: '🌍 Audience' },
  { id: 'demand', label: '🔍 Demand' },
  { id: 'visitors', label: '👤 Visitors' },
  { id: 'restrictions', label: '🛡️ Restrictions' },
  { id: 'ops', label: '🛠️ Ops & Audit' },
];

export default function DashboardHeader({
  stats,
  timeRange,
  setTimeRange,
  autoRefresh,
  setAutoRefresh,
  isLoading,
  onManualRefresh,
  onLogout,
  activeTab,
  setActiveTab,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sm:py-4 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shadow-xs shrink-0">
            🚜
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                MM Earthmovers Analytics
              </h1>
              {/* Active Users Online Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{stats?.kpis?.activeUsersNow || 0} Online Now</span>
                <InfoTooltip
                  title={HEADER_TOOLTIPS.onlineNow.title}
                  text={HEADER_TOOLTIPS.onlineNow.text}
                />
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                🕒 IST (UTC+05:30)
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Visitor intelligence, conversions, clicks, and inventory demand
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Time Range Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs overflow-x-auto max-w-full min-h-[44px]">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 sm:px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap min-h-[38px] flex items-center justify-center ${
                  timeRange === r
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">
                  {r === 'today' ? 'Today' : r === 'yesterday' ? 'Yest' : r === 'all' ? 'All' : r}
                </span>
                <span className="hidden sm:inline">
                  {r === 'today'
                    ? 'Today (IST)'
                    : r === 'yesterday'
                    ? 'Yesterday'
                    : r === '7d'
                    ? 'Last 7 Days'
                    : r === '30d'
                    ? 'Last 30 Days'
                    : r === '90d'
                    ? 'Last 90 Days'
                    : r === '1y'
                    ? 'Last 1 Year'
                    : 'All Time'}
                </span>
              </button>
            ))}
          </div>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            title="Toggle Live Auto-refresh"
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all shadow-xs min-h-[44px] ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`}
            ></span>
            <span className="hidden sm:inline">{autoRefresh ? 'Live (15s)' : 'Paused'}</span>
            <span className="sm:hidden">{autoRefresh ? 'Live' : 'Off'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isLoading}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium transition text-slate-700 shadow-xs flex items-center gap-1 disabled:opacity-50 min-h-[44px]"
          >
            <span>{isLoading ? '...' : '🔄'}</span>
            <span className="hidden sm:inline">{isLoading ? 'Refreshing' : 'Refresh'}</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-medium transition shadow-xs min-h-[44px]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Dedicated Horizontally Scrollable 7-Tab Navigation Strip (Mobile < 768px) */}
      <nav
        aria-label="Mobile Analytics Navigation"
        className="flex md:hidden border-t border-slate-100 overflow-x-auto scrollbar-hide gap-1.5 pt-2.5 pb-1 -mx-4 px-4 touch-pan-x min-h-[44px]"
      >
        {MOBILE_TABS.map((tab) => {
          const tip = TAB_TOOLTIPS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              className={`shrink-0 inline-flex items-center gap-1 pr-2 rounded-xl transition-all min-h-[44px] ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="pl-3 pr-0.5 py-2 text-xs font-semibold whitespace-nowrap min-h-[44px] flex items-center cursor-pointer"
              >
                {tab.label}
              </button>
              <InfoTooltip
                title={tip.title}
                text={tip.text}
                variant={isActive ? 'inverted' : 'default'}
              />
            </div>
          );
        })}
      </nav>
    </header>
  );
}
