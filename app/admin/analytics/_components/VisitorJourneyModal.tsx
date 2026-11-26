'use client';

import React, { useMemo } from 'react';
import type {
  AnalyticsEvent,
  JourneyEventFilter,
  RestrictionActionFeedback,
  RestrictionRecord,
} from '../_types/analytics';
import { decodeCityName, formatDuration, formatIST } from '../_utils/formatters';
import { buildVisitorJourneyByDay } from '../_utils/journeyHelpers';

interface VisitorJourneyModalProps {
  selectedVisitorId: string | null;
  selectedVisitorIp: string | null;
  onClose: () => void;
  visitorJourney: AnalyticsEvent[];
  isJourneyLoading: boolean;
  correlateByIp: boolean;
  setCorrelateByIp: (val: boolean) => void;
  journeySortOrder: 'asc' | 'desc';
  setJourneySortOrder: (val: 'asc' | 'desc') => void;
  journeyEventFilter: JourneyEventFilter;
  setJourneyEventFilter: (val: JourneyEventFilter) => void;
  restrictions: RestrictionRecord[];
  restrictionActionFeedback: RestrictionActionFeedback | null;
  setRestrictionActionFeedback: (val: RestrictionActionFeedback | null) => void;
  openVisitorJourney: (
    visitorId: string,
    ipAddress?: string | null,
    forceCorrelate?: boolean
  ) => Promise<void>;
  handleAddRestriction: (
    customVal?: string,
    customType?: 'ip' | 'visitor_id',
    customNote?: string
  ) => Promise<void>;
  handleRemoveRestriction: (identifier: string | number) => Promise<void>;
  handleRemoveVisitorRestrictions: (
    visitorId?: string | null,
    ipAddress?: string | null
  ) => Promise<void>;
}

export default function VisitorJourneyModal({
  selectedVisitorId,
  selectedVisitorIp,
  onClose,
  visitorJourney,
  isJourneyLoading,
  correlateByIp,
  setCorrelateByIp,
  journeySortOrder,
  setJourneySortOrder,
  journeyEventFilter,
  setJourneyEventFilter,
  restrictions,
  restrictionActionFeedback,
  setRestrictionActionFeedback,
  openVisitorJourney,
  handleAddRestriction,
  handleRemoveRestriction,
  handleRemoveVisitorRestrictions,
}: VisitorJourneyModalProps) {
  const visitorJourneyByDay = useMemo(
    () =>
      buildVisitorJourneyByDay(
        visitorJourney,
        selectedVisitorIp,
        journeySortOrder,
        journeyEventFilter
      ),
    [visitorJourney, selectedVisitorIp, journeySortOrder, journeyEventFilter]
  );

  if (!selectedVisitorId) return null;

  const activeJourneyIp = selectedVisitorIp || visitorJourney[0]?.ip_address;
  const allJourneyIps = new Set(
    visitorJourney.map((e) => e.ip_address).filter(Boolean) as string[]
  );
  if (selectedVisitorIp) allJourneyIps.add(selectedVisitorIp);

  const allJourneyVisitorIds = new Set(
    visitorJourney.map((e) => e.visitor_id).filter(Boolean) as string[]
  );
  if (selectedVisitorId) allJourneyVisitorIds.add(selectedVisitorId);

  const matchingJourneyRestrictions = restrictions.filter((r) => {
    const rVal = (r.value || '').toLowerCase().trim();
    if (r.type === 'visitor_id') {
      return Array.from(allJourneyVisitorIds).some((v) => (v || '').toLowerCase().trim() === rVal);
    }
    if (r.type === 'ip') {
      return Array.from(allJourneyIps).some((ip) => (ip || '').toLowerCase().trim() === rVal);
    }
    return false;
  });

  const isVisitorIdRestricted = Boolean(
    selectedVisitorId &&
      restrictions.some(
        (r) =>
          r.type === 'visitor_id' &&
          (r.value || '').toLowerCase().trim() === (selectedVisitorId || '').toLowerCase().trim()
      )
  );

  const isIpRestricted = Boolean(
    activeJourneyIp &&
      restrictions.some(
        (r) =>
          r.type === 'ip' &&
          (r.value || '').toLowerCase().trim() === (activeJourneyIp || '').toLowerCase().trim()
      )
  );

  const isJourneyTargetRestricted =
    isVisitorIdRestricted || isIpRestricted || matchingJourneyRestrictions.length > 0;

  const totalEvents = visitorJourney.length;
  const totalSessions = visitorJourneyByDay.reduce((acc, d) => acc + d.sessions.length, 0);
  const totalDwellSeconds = visitorJourneyByDay.reduce((acc, d) => {
    return acc + d.sessions.reduce((sAcc, s) => sAcc + (s.durationSeconds || 0), 0);
  }, 0);
  const totalRfqs = visitorJourney.filter(
    (e) =>
      e.event_type === 'click' &&
      (e.element_target?.includes('wa.me') ||
        e.element_text?.toLowerCase().includes('whatsapp') ||
        e.element_target?.startsWith('tel:'))
  ).length;
  const totalCopies = visitorJourney.filter((e) => e.event_type === 'copy').length;
  const totalProductViews = visitorJourney.filter(
    (e) => e.page_path?.startsWith('/products') || e.metadata?.productTitle
  ).length;
  const totalClicks = visitorJourney.filter(
    (e) =>
      e.event_type === 'click' &&
      !e.element_target?.includes('wa.me') &&
      !e.element_text?.toLowerCase().includes('whatsapp') &&
      !e.element_target?.startsWith('tel:')
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end md:items-center md:justify-center p-0 md:p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-3xl lg:max-w-4xl bg-white rounded-t-3xl md:rounded-2xl max-h-[92vh] md:max-h-[88vh] p-4 sm:p-6 overflow-y-auto flex flex-col shadow-2xl animate-slide-up md:animate-none space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 md:hidden"></div>

        {/* MODAL HEADER */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🧭</span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Visitor Journey Timeline &amp; Multi-Day Audit
              </h3>

              {/* Prominent Restricted / Active Badge */}
              {isJourneyTargetRestricted ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-rose-300 border border-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span>🚫</span>
                  <span>
                    {isVisitorIdRestricted && isIpRestricted
                      ? 'Restricted (Visitor ID & IP Blocked)'
                      : isIpRestricted
                      ? 'Restricted (IP Blocked)'
                      : 'Restricted (Visitor ID Blocked)'}
                  </span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <span>✅</span>
                  <span>Active / Unrestricted</span>
                </span>
              )}

              {visitorJourneyByDay.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  🔁 {visitorJourneyByDay.length} Distinct Days
                </span>
              )}
            </div>

            {/* Visitor & IP Details */}
            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap font-sans">
              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] truncate max-w-[200px] sm:max-w-[260px]">
                ID: {selectedVisitorId}
              </span>
              {activeJourneyIp && (
                <span
                  className={`font-mono px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border ${
                    isIpRestricted
                      ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  <span>{isIpRestricted ? '🚫' : '🌐'}</span>
                  <span>{activeJourneyIp}</span>
                  {isIpRestricted && (
                    <span className="text-[10px] uppercase font-bold text-rose-600">(Blocked)</span>
                  )}
                </span>
              )}
              {visitorJourney[0]?.city && (
                <span className="text-slate-500">
                  📍 {decodeCityName(visitorJourney[0].city)}, {visitorJourney[0].country || 'IN'}
                </span>
              )}
              {visitorJourney[0]?.device_type && (
                <span className="text-slate-500">
                  • {visitorJourney[0].device_type === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} (
                  {visitorJourney[0].browser || 'Browser'})
                </span>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition shadow-xs flex-shrink-0 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* AUDIT & CORRELATION TOOLBAR */}
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 text-xs space-y-2.5 shadow-2xs">
          {/* ROW 1: Target Actions + Lifetime Audit KPI Chips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextCorrelate = !correlateByIp;
                  setCorrelateByIp(nextCorrelate);
                  if (selectedVisitorId) {
                    void openVisitorJourney(selectedVisitorId, selectedVisitorIp, nextCorrelate);
                  }
                }}
                className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-xs whitespace-nowrap ${
                  correlateByIp
                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
                title={
                  correlateByIp
                    ? 'Stitching activity from same IP network across sessions/cookies'
                    : 'Filtered strictly to single cookie visitor_id'
                }
              >
                <span>{correlateByIp ? '🔗' : '👤'}</span>
                <span>{correlateByIp ? 'IP Stitched' : 'Single ID'}</span>
              </button>

              {isJourneyTargetRestricted ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="px-2 py-1 rounded-lg font-bold bg-slate-900 text-rose-300 border border-slate-700 flex items-center gap-1 text-[11px] shadow-xs whitespace-nowrap">
                    <span>🚫</span>
                    <span>Restricted</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (matchingJourneyRestrictions.length > 0) {
                        for (const r of matchingJourneyRestrictions) {
                          await handleRemoveRestriction(r.id);
                        }
                      } else {
                        await handleRemoveVisitorRestrictions(selectedVisitorId, activeJourneyIp);
                      }
                    }}
                    className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer flex items-center gap-1 text-[11px] whitespace-nowrap"
                    title="Lift restriction and restore catalog access"
                  >
                    <span>🔓</span>
                    <span>Unrestrict</span>
                  </button>
                  {!isIpRestricted && activeJourneyIp && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleAddRestriction(
                          activeJourneyIp,
                          'ip',
                          'Blocked from journey audit'
                        )
                      }
                      className="min-h-[44px] sm:min-h-[30px] px-2 py-1 rounded-lg font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1 text-[11px] whitespace-nowrap"
                      title={`Also block IP address ${activeJourneyIp}`}
                    >
                      <span>🛡️</span>
                      <span>Also Block IP</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {activeJourneyIp && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleAddRestriction(
                          activeJourneyIp,
                          'ip',
                          'Blocked from journey audit'
                        )
                      }
                      className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1.5 rounded-lg font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1 text-xs whitespace-nowrap"
                      title="Restrict this buyer's IP"
                    >
                      <span>🛡️</span>
                      <span>Restrict IP</span>
                    </button>
                  )}
                  {selectedVisitorId && !activeJourneyIp && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleAddRestriction(
                          selectedVisitorId,
                          'visitor_id',
                          'Blocked from journey audit'
                        )
                      }
                      className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1.5 rounded-lg font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1 text-xs whitespace-nowrap"
                      title="Restrict this Visitor ID"
                    >
                      <span>🛡️</span>
                      <span>Restrict Visitor</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Lifetime Summary Metric Chips */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              <span
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
                title="Total correlated sessions for this visitor"
              >
                <span>⚡</span>
                <span>
                  {totalSessions} Session{totalSessions !== 1 ? 's' : ''}
                </span>
              </span>
              <span
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
                title="Total actions and events recorded"
              >
                <span>🎯</span>
                <span>{totalEvents} Actions</span>
              </span>
              {totalDwellSeconds > 0 && (
                <span
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
                  title="Total active dwell time across sessions"
                >
                  <span>⏱️</span>
                  <span>{formatDuration(totalDwellSeconds)} Dwell</span>
                </span>
              )}
              {totalRfqs > 0 && (
                <span
                  className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
                  title="Direct WhatsApp & phone lead inquiries"
                >
                  <span>💬</span>
                  <span>
                    {totalRfqs} RFQ{totalRfqs !== 1 ? 's' : ''}
                  </span>
                </span>
              )}
              {totalCopies > 0 && (
                <span
                  className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 shadow-2xs whitespace-nowrap"
                  title="Part numbers copied to clipboard"
                >
                  <span>📋</span>
                  <span>
                    {totalCopies} Copie{totalCopies !== 1 ? 's' : ''}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* ROW 2: Chronological Sort + Event Type Filter */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-200/70 py-0.5">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Order:
              </span>
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setJourneySortOrder('desc')}
                  className={`min-h-[44px] sm:min-h-[28px] px-2 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    journeySortOrder === 'desc'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title="Sort newest sessions & events at the top (Now → Day 1)"
                >
                  <span>⬇️</span>
                  <span>Latest First</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJourneySortOrder('asc')}
                  className={`min-h-[44px] sm:min-h-[28px] px-2 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    journeySortOrder === 'asc'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title="Sort chronologically from discovery (Day 1 → Now)"
                >
                  <span>⬆️</span>
                  <span>Oldest First</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Filter:
              </span>
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setJourneyEventFilter('all')}
                  className={`min-h-[44px] sm:min-h-[28px] px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer whitespace-nowrap ${
                    journeyEventFilter === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show all recorded actions"
                >
                  All ({totalEvents})
                </button>
                {totalRfqs > 0 && (
                  <button
                    type="button"
                    onClick={() => setJourneyEventFilter('rfq')}
                    className={`min-h-[44px] sm:min-h-[28px] px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      journeyEventFilter === 'rfq'
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                    title="Filter strictly to WhatsApp and phone lead inquiries"
                  >
                    💬 RFQs ({totalRfqs})
                  </button>
                )}
                {totalCopies > 0 && (
                  <button
                    type="button"
                    onClick={() => setJourneyEventFilter('copy')}
                    className={`min-h-[44px] sm:min-h-[28px] px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      journeyEventFilter === 'copy'
                        ? 'bg-amber-600 text-white font-bold shadow-2xs'
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                    title="Filter strictly to copied part numbers"
                  >
                    📋 Copies ({totalCopies})
                  </button>
                )}
                {totalProductViews > 0 && (
                  <button
                    type="button"
                    onClick={() => setJourneyEventFilter('product')}
                    className={`min-h-[44px] sm:min-h-[28px] px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      journeyEventFilter === 'product'
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'text-indigo-700 hover:bg-indigo-50'
                    }`}
                    title="Filter strictly to product catalog views"
                  >
                    📦 Products ({totalProductViews})
                  </button>
                )}
                {totalClicks > 0 && (
                  <button
                    type="button"
                    onClick={() => setJourneyEventFilter('click')}
                    className={`min-h-[44px] sm:min-h-[28px] px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      journeyEventFilter === 'click'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Filter to interactive clicks"
                  >
                    🖱️ Clicks ({totalClicks})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* IN-MODAL FEEDBACK NOTIFICATION BANNER */}
        {restrictionActionFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border flex items-center justify-between shadow-2xs ${
              restrictionActionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{restrictionActionFeedback.text}</span>
            <button
              type="button"
              onClick={() => setRestrictionActionFeedback(null)}
              className="text-[11px] underline ml-4 hover:opacity-80 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TIMELINE CONTENT */}
        <div className="flex-1 space-y-4">
          {isJourneyLoading ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <div className="inline-block animate-spin text-2xl">⏳</div>
              <p className="text-xs font-semibold">Correlating multi-day buyer activity stream...</p>
            </div>
          ) : visitorJourney.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p className="font-semibold text-sm">No events found for this visitor.</p>
              <p className="text-xs text-slate-400">
                Interaction records may have expired or were blocked by filters.
              </p>
            </div>
          ) : visitorJourneyByDay.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-3xl">🔍</span>
              <p className="font-semibold text-xs text-slate-700">
                No interactions match the active filter ({journeyEventFilter.toUpperCase()}).
              </p>
              <button
                type="button"
                onClick={() => setJourneyEventFilter('all')}
                className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1"
              >
                <span>Show All {totalEvents} Events</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {visitorJourneyByDay.map((dayGroup) => (
                <div
                  key={dayGroup.dateKey}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-2xs"
                >
                  {/* DAY HEADER */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {dayGroup.isInitialDay ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <span>🌟</span>
                          <span>Day 1 • First Discovery</span>
                        </span>
                      ) : (
                        <>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                            <span>🔁</span>
                            <span>Day {dayGroup.dayNumber} • Return Visit</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            ⏱️{' '}
                            {dayGroup.daysSinceLastVisit === 1
                              ? 'Returned next day'
                              : `Returned after ${dayGroup.daysSinceLastVisit} days`}
                          </span>
                          {dayGroup.daysSinceInitialVisit > 0 && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({dayGroup.daysSinceInitialVisit}d since initial visit)
                            </span>
                          )}
                        </>
                      )}
                      <span className="text-sm font-bold text-slate-900">
                        {dayGroup.dateLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                      {dayGroup.rfqCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
                          💬 {dayGroup.rfqCount} WhatsApp RFQ{dayGroup.rfqCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {dayGroup.copyCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          📋 {dayGroup.copyCount} Copy
                        </span>
                      )}
                      <span className="bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-600 font-semibold text-[11px]">
                        {dayGroup.sessions.length} session{dayGroup.sessions.length > 1 ? 's' : ''} •{' '}
                        {dayGroup.eventsCount} actions
                      </span>
                    </div>
                  </div>

                  {/* SESSIONS IN THIS DAY */}
                  <div className="space-y-4">
                    {dayGroup.sessions.map((sess, sIdx) => (
                      <div
                        key={sess.sessionId + sIdx}
                        className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 space-y-3"
                      >
                        {/* Session Subheader */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 flex-wrap gap-2">
                          <div className="flex items-center gap-2 font-mono flex-wrap">
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              ⚡ Session #{sess.sessionNumber || sIdx + 1}
                            </span>
                            <span>
                              {formatIST(sess.startTime, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                              {sess.durationSeconds > 60 &&
                                ` – ${formatIST(sess.endTime, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}`}
                              {' IST'}
                            </span>
                            {sess.durationSeconds > 0 && (
                              <span className="text-slate-400 font-sans">
                                ({formatDuration(sess.durationSeconds)})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span>
                              {sess.distinctPages.length} page
                              {sess.distinctPages.length > 1 ? 's' : ''} viewed
                            </span>
                          </div>
                        </div>

                        {/* Events Timeline in Session */}
                        <div className="relative border-l-2 border-slate-200 ml-2.5 pl-4 sm:pl-5 space-y-3 py-1">
                          {sess.events.map((step, stepIdx) => {
                            const isDifferentVisitorId =
                              selectedVisitorId &&
                              step.visitor_id &&
                              step.visitor_id !== selectedVisitorId;
                            const isWaRfq =
                              step.event_type === 'click' &&
                              (step.element_target?.includes('wa.me') ||
                                step.element_text?.toLowerCase().includes('whatsapp') ||
                                step.element_target?.startsWith('tel:'));

                            return (
                              <div key={step.id || stepIdx} className="relative">
                                <span
                                  className={`absolute -left-[23px] sm:-left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                                    isWaRfq
                                      ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                      : step.event_type === 'click'
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

                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    {formatIST(step.created_at, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: true,
                                    })}{' '}
                                    IST
                                  </span>

                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      isWaRfq
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : step.event_type === 'click'
                                        ? 'bg-blue-100 text-blue-800'
                                        : step.event_type === 'copy'
                                        ? 'bg-amber-100 text-amber-800'
                                        : step.event_type === 'form_submit'
                                        ? 'bg-purple-100 text-purple-800'
                                        : step.event_type === 'rage_click'
                                        ? 'bg-rose-100 text-rose-800 font-bold'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {isWaRfq ? '💬 WhatsApp RFQ' : (step.event_type || '').replace('_', ' ')}
                                  </span>

                                  {isDifferentVisitorId && (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200"
                                      title={`Shared IP address: ${step.ip_address}`}
                                    >
                                      🔗 Same IP (Cookie reset / new ID)
                                    </span>
                                  )}
                                </div>

                                <div className="font-semibold text-slate-900 text-sm mt-1 break-words">
                                  {step.element_text || step.page_path}
                                </div>

                                {step.element_target && (
                                  <div className="text-xs text-blue-600 truncate mt-0.5 font-mono break-all">
                                    Target: {step.element_target}
                                  </div>
                                )}

                                {step.metadata && Object.keys(step.metadata).length > 0 && (
                                  <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono break-all space-y-0.5">
                                    {step.metadata.productTitle && (
                                      <div className="text-amber-800 font-sans font-semibold">
                                        Part: {step.metadata.productTitle}{' '}
                                        {step.metadata.partNumber ? `(#${step.metadata.partNumber})` : ''}
                                      </div>
                                    )}
                                    {step.metadata.searchQuery && (
                                      <div className="text-slate-600 font-sans">
                                        Search query: &quot;{step.metadata.searchQuery}&quot;
                                      </div>
                                    )}
                                    {!step.metadata.productTitle && !step.metadata.searchQuery && (
                                      <div>{JSON.stringify(step.metadata)}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
