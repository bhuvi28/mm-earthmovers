'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  AnalyticsEvent,
  ProductEngagementStats,
  ProductEnquiryStat,
  TimeRange,
} from '../_types/analytics';
import {
  decodeCityName,
  formatTimeAgo,
  getProductUrl,
  getWhatsAppTestUrl,
} from '../_utils/formatters';
import InfoTooltip from './InfoTooltip';
import { DRAWER_TOOLTIPS, PRODUCT_TOOLTIPS } from '../_utils/metricTooltips';

interface ProductInspectorDrawerProps {
  inspectedProduct: ProductEnquiryStat | null;
  onClose: () => void;
  timeRange: TimeRange;
  isAuthenticated: boolean | null;
  onUnauthorized: () => void;
  copiedPart: string | null;
  handleCopyPart: (partNumber: string, e?: React.MouseEvent) => void;
  openVisitorJourney: (visitorId: string, ipAddress?: string | null) => void;
  productEngagementStats?: ProductEngagementStats;
}

export default function ProductInspectorDrawer({
  inspectedProduct,
  onClose,
  timeRange,
  isAuthenticated,
  onUnauthorized,
  copiedPart,
  handleCopyPart,
  openVisitorJourney,
  productEngagementStats,
}: ProductInspectorDrawerProps) {
  const [inspectedProductEvents, setInspectedProductEvents] = useState<AnalyticsEvent[]>([]);
  const [isProductEventsLoading, setIsProductEventsLoading] = useState(false);

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const hasInspectedProduct = Boolean(inspectedProduct);
  const inspectedSlug = inspectedProduct?.slug;
  const inspectedTitle = inspectedProduct?.title;
  const inspectedPartNumber = inspectedProduct?.part_number;

  // Query PostgreSQL directly for inspected product events (`BUG-11`, never limited to 100-event cache)
  useEffect(() => {
    if (!isAuthenticated || !hasInspectedProduct) {
      setInspectedProductEvents([]);
      return;
    }

    let cancelled = false;
    setIsProductEventsLoading(true);
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        view: 'product_events',
        productSlug: inspectedSlug,
        productTitle: inspectedTitle,
        partNumber: inspectedPartNumber,
        range: timeRange,
        limit: 100,
      }),
    })
      .then((res) => {
        if (res.status === 401) {
          onUnauthorizedRef.current();
          return { events: [] };
        }
        return res.ok ? res.json() : { events: [] };
      })
      .then((data) => {
        if (!cancelled) {
          setInspectedProductEvents(data.events || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load inspected product events:', err);
        if (!cancelled) setInspectedProductEvents([]);
      })
      .finally(() => {
        if (!cancelled) setIsProductEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, hasInspectedProduct, inspectedSlug, inspectedTitle, inspectedPartNumber, timeRange]);

  // Item-level BI-05 engagement counts derived from direct product_events + site-wide BI-05 stats
  const itemEngagement = useMemo(() => {
    const zoomEvents = inspectedProductEvents.filter(
      (ev) => ev.event_type === 'image_zoom' && ev.metadata?.action !== 'close'
    );
    const zoomCloses = inspectedProductEvents.filter(
      (ev) => ev.event_type === 'image_zoom' && ev.metadata?.action === 'close'
    );
    const specToggles = inspectedProductEvents.filter((ev) => ev.event_type === 'spec_toggle');
    const relatedClicks = inspectedProductEvents.filter(
      (ev) => ev.event_type === 'related_product_click'
    );
    const placeholderImpressions = inspectedProductEvents.filter(
      (ev) => ev.event_type === 'placeholder_impression'
    );
    const durations = zoomCloses
      .map((ev) => Number(ev.metadata?.durationMs))
      .filter((ms) => Number.isFinite(ms) && ms > 0);
    const avgZoomMs =
      durations.length > 0
        ? Math.round(durations.reduce((acc, v) => acc + v, 0) / durations.length)
        : 0;

    return {
      zoomOpens: zoomEvents.length,
      avgZoomMs,
      specToggles: specToggles.length,
      relatedClicks: relatedClicks.length,
      placeholderImpressions: placeholderImpressions.length,
    };
  }, [inspectedProductEvents]);

  if (!inspectedProduct) return null;

  const matchedZoomStat = productEngagementStats?.topZoomedProducts?.find(
    (z) => z.productSlug === inspectedProduct.slug
  );
  const relatedTransitions = (productEngagementStats?.topRelatedTransitions || []).filter(
    (t) =>
      t.sourceProductSlug === inspectedProduct.slug ||
      t.targetProductSlug === inspectedProduct.slug
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-end md:items-stretch md:justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-none max-h-[88vh] md:max-h-none md:h-full shadow-2xl flex flex-col justify-between overflow-y-auto md:border-l border-slate-200 animate-slide-up md:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Mobile Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 md:hidden"></div>

          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  {inspectedProduct.category}
                </span>
                {inspectedProduct.enquire_clicks >= 2 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                    🔥 High Demand
                  </span>
                ) : inspectedProduct.enquire_clicks > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ⚡ Active Demand
                  </span>
                ) : inspectedProduct.views > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    👀 Opportunity
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    ❄️ Cold Inventory
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                title="Close Drawer"
                aria-label="Close Product Inspector"
              >
                ✕
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mt-2.5 leading-snug break-words">
              {inspectedProduct.title}
            </h3>
            {inspectedProduct.brand && (
              <p className="text-xs text-slate-500 mt-1">
                Compatible with: <strong className="text-slate-700">{inspectedProduct.brand}</strong>
              </p>
            )}
          </div>

          {/* Drawer Content */}
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            {/* Part Number & Live Page Link Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Part Number
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 break-all">
                  {inspectedProduct.part_number || 'None'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {inspectedProduct.part_number && inspectedProduct.part_number !== '-' && (
                  <button
                    type="button"
                    onClick={() => handleCopyPart(inspectedProduct.part_number)}
                    className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {copiedPart === inspectedProduct.part_number ? '✓ Copied!' : '📋 Copy Part #'}
                  </button>
                )}
                <Link
                  href={getProductUrl(inspectedProduct)}
                  target="_blank"
                  style={{ color: '#ffffff' }}
                  className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Live Page</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>

            {/* 4 Performance Metric Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Views
                  </span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.partViews} />
                </div>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block font-mono">
                  {inspectedProduct.views}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Enquiries
                  </span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.partEnquiries} />
                </div>
                <span className="text-xl font-extrabold text-emerald-600 mt-1 block font-mono">
                  {inspectedProduct.enquire_clicks}
                </span>
                {(inspectedProduct.detail_enquiries !== undefined ||
                  inspectedProduct.listing_enquiries !== undefined) && (
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                    {inspectedProduct.detail_enquiries ?? 0} detail ·{' '}
                    {inspectedProduct.listing_enquiries ?? 0} grid
                  </span>
                )}
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Conversion
                  </span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.partConversion} />
                </div>
                <span className="text-xl font-extrabold text-slate-800 mt-1 block font-mono">
                  {inspectedProduct.conversion_rate}%
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Last Inquiry
                  </span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.lastInquiry} />
                </div>
                <span className="text-xs font-semibold text-slate-700 mt-2 block font-mono">
                  {inspectedProduct.last_enquired_at
                    ? formatTimeAgo(inspectedProduct.last_enquired_at)
                    : 'Never'}
                </span>
              </div>
            </div>

            {/* BI-05 Product Engagement & Recommendation Lift */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🔬 Merchandising &amp; Cross-Sell Signals</span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.merchandising} />
                </h4>
                <span className="text-[10px] font-mono text-slate-500">
                  Site assist: {productEngagementStats?.relatedAssistRate ?? 0}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Image Zooms
                    </span>
                    <InfoTooltip {...PRODUCT_TOOLTIPS.zoomOpens} />
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {matchedZoomStat?.opens ?? itemEngagement.zoomOpens}
                  </span>
                  {(matchedZoomStat?.avgDurationMs || itemEngagement.avgZoomMs) > 0 && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {Math.round((matchedZoomStat?.avgDurationMs || itemEngagement.avgZoomMs) / 1000)}s avg
                    </span>
                  )}
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Spec Toggles
                    </span>
                    <InfoTooltip {...PRODUCT_TOOLTIPS.specToggles} />
                  </div>
                  <span className="text-sm font-extrabold text-blue-700 font-mono">
                    {itemEngagement.specToggles}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Site: {productEngagementStats?.specToggles ?? 0}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Related Clicks
                    </span>
                    <InfoTooltip {...PRODUCT_TOOLTIPS.relatedClicks} />
                  </div>
                  <span className="text-sm font-extrabold text-indigo-700 font-mono">
                    {itemEngagement.relatedClicks}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Site: {productEngagementStats?.relatedClicks ?? 0}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Placeholder Views
                    </span>
                    <InfoTooltip {...PRODUCT_TOOLTIPS.photoImpressions} />
                  </div>
                  <span className="text-sm font-extrabold text-amber-700 font-mono">
                    {itemEngagement.placeholderImpressions}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Hub Nav: {productEngagementStats?.modelHubNavClicks ?? 0}
                  </span>
                </div>
              </div>

              {relatedTransitions.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Related Product Transitions Involving This SKU
                  </span>
                  {relatedTransitions.slice(0, 4).map((tr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                    >
                      <span className="font-mono text-slate-700 truncate">
                        {tr.sourceProductSlug} → {tr.targetProductSlug}
                      </span>
                      <span className="font-mono font-bold text-indigo-700 shrink-0">
                        {tr.clicks} clicks · {tr.assistedEnquiries} RFQ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test WhatsApp Inquiry Button */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span>💬 Test Buyer WhatsApp Link</span>
                </h4>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">
                  Open WhatsApp with the exact pre-filled message buyers see
                </p>
              </div>
              <a
                href={getWhatsAppTestUrl(inspectedProduct)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffffff' }}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <span>Test WhatsApp ↗</span>
              </a>
            </div>

            {/* Live Interaction Events Log for this Specific Part (`BUG-11` DB Query) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>⚡ Product Interaction History</span>
                  <InfoTooltip {...DRAWER_TOOLTIPS.interactionHistory} />
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold font-mono">
                    {isProductEventsLoading ? '...' : `${inspectedProductEvents.length} events`}
                  </span>
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isProductEventsLoading ? 'Querying database...' : 'Direct DB Query'}
                </span>
              </div>

              {isProductEventsLoading ? (
                <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  Loading historical product interactions...
                </div>
              ) : inspectedProductEvents.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {inspectedProductEvents.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              ev.event_type === 'click'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : ev.event_type === 'form_submit'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ev.event_type}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {ev.element_text || ev.page_title || 'Product View'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono flex-wrap">
                          <span>
                            {ev.city ? `${decodeCityName(ev.city)}, ${ev.country}` : 'India'}
                          </span>
                          <span>•</span>
                          <span>{ev.device_type || 'Mobile'}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(ev.created_at)}</span>
                        </div>
                      </div>
                      {ev.visitor_id && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            openVisitorJourney(ev.visitor_id, ev.ip_address);
                          }}
                          className="min-h-[44px] sm:min-h-[32px] px-2 text-[11px] font-semibold text-amber-600 hover:text-amber-800 underline whitespace-nowrap cursor-pointer"
                          title="Inspect Full Visitor Journey"
                        >
                          Journey ↗
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  No recorded interaction events found for this specific item in the selected time range.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">MM Earthmovers Inventory Intelligence</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
