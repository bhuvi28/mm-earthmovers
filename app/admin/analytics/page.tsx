'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AdminTabId, ProductEnquiryStat, TimeRange } from './_types/analytics';
import { useAnalyticsPolling } from './_hooks/useAnalyticsPolling';
import { useAnalyticsActions } from './_hooks/useAnalyticsActions';
import DashboardHeader from './_components/DashboardHeader';
import KpiStrip from './_components/KpiStrip';
import LiveStreamTab from './_components/LiveStreamTab';
import ProductDemandTab from './_components/ProductDemandTab';
import ProductInspectorDrawer from './_components/ProductInspectorDrawer';
import AudienceGeoTab from './_components/AudienceGeoTab';
import SearchDwellTab from './_components/SearchDwellTab';
import VisitorsTab, { type VisitorFiltersState } from './_components/VisitorsTab';
import OpsHealthTab from './_components/OpsHealthTab';
import RestrictionsTab from './_components/RestrictionsTab';
import VisitorJourneyModal from './_components/VisitorJourneyModal';
import InfoTooltip from './_components/InfoTooltip';
import { TAB_TOOLTIPS } from './_utils/metricTooltips';

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('stream');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [includeHeartbeat, setIncludeHeartbeat] = useState(false);

  const [eventSearch, setEventSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [inspectedProduct, setInspectedProduct] = useState<ProductEnquiryStat | null>(null);
  const [isAddIpModalOpen, setIsAddIpModalOpen] = useState(false);
  const [correlateByIp, setCorrelateByIp] = useState(true);

  const [visitorFilters, setVisitorFilters] = useState<VisitorFiltersState>({
    search: '',
    segment: 'all',
    device: 'all',
    page: 1,
    pageSize: 25,
  });

  const [auditPagination, setAuditPagination] = useState<{ limit: number; offset: number }>({
    limit: 50,
    offset: 0,
  });

  const polling = useAnalyticsPolling({
    activeTab,
    timeRange,
    autoRefresh,
    includeHeartbeat,
    visitorFilters,
    auditPagination,
  });

  const actions = useAnalyticsActions({
    passcode: polling.passcode,
    restrictions: polling.restrictions,
    correlateByIp,
    setCorrelateByIp,
    ensureRestrictionsLoaded: polling.ensureRestrictionsLoaded,
    fetchRestrictions: polling.fetchRestrictions,
    fetchEvents: polling.fetchEvents,
    fetchVisitors: polling.fetchVisitors,
    fetchStats: polling.fetchStats,
    setIsAuthenticated: polling.setIsAuthenticated,
  });

  const { selectedVisitorId, setSelectedVisitorId } = actions;

  // Body scroll lock & Escape key handler for all active modals/drawers
  useEffect(() => {
    const isModalOpen = Boolean(selectedVisitorId || inspectedProduct || isAddIpModalOpen);
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVisitorId) setSelectedVisitorId(null);
        else if (inspectedProduct) setInspectedProduct(null);
        else if (isAddIpModalOpen) setIsAddIpModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedVisitorId, setSelectedVisitorId, inspectedProduct, isAddIpModalOpen]);

  if (polling.isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading Analytics Hub...</span>
        </div>
      </div>
    );
  }

  if (!polling.isAuthenticated) {
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
          <form onSubmit={polling.handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Passcode</label>
              <input
                type="password"
                value={polling.passcode}
                onChange={(e) => polling.setPasscode(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs text-sm"
                autoFocus
              />
            </div>
            {polling.authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {polling.authError}
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

  const desktopTabs: ReadonlyArray<{ id: AdminTabId; label: string; title?: string }> = [
    { id: 'stream', label: '⚡ Live Activity Feed' },
    {
      id: 'products',
      label: `📦 Product Demand (${polling.productData?.summary?.withEnquiriesCount || 0}/${polling.productData?.summary?.totalCatalogProducts || 144})`,
    },
    { id: 'audience', label: '🌍 Geo & Sources' },
    { id: 'demand', label: '🔍 Search Demand & Dwell', title: 'Search Demand, Avg. Section Dwell & Sentinel' },
    {
      id: 'visitors',
      label: `👤 Visitors & Leads${polling.visitorTotalCount > 0 ? ` (${polling.visitorTotalCount})` : ''}`,
    },
    { id: 'restrictions', label: `🛡️ Access & Restrictions (${polling.restrictions.length})` },
    { id: 'ops', label: '🛠️ Ops & Audit' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 w-full max-w-full overflow-x-hidden">
      <DashboardHeader
        stats={polling.stats}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        isLoading={polling.isLoading}
        onManualRefresh={() => void polling.refreshActiveTab()}
        onLogout={() => void polling.handleLogout()}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {polling.dashboardError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3 shadow-xs">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-rose-900">Database Connection Error</h3>
              <p className="text-xs text-rose-700 mt-0.5">{polling.dashboardError}</p>
              <p className="text-xs text-rose-600 mt-1 font-mono">
                Verify that DATABASE_URL is set in Vercel settings (Project Settings &rarr; Environment Variables) and redeployed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                polling.setDashboardError(null);
                void polling.refreshActiveTab();
              }}
              className="px-3 py-1 bg-white border border-rose-300 text-xs font-semibold rounded-lg hover:bg-rose-100 transition shadow-xs text-rose-800"
            >
              Retry
            </button>
          </div>
        )}

        <KpiStrip stats={polling.stats} />

        {/* Navigation Tabs (Light Mode Styled - Desktop >= 768px Preserved) */}
        <div className="hidden md:flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto pb-px mb-5 sm:mb-6">
          {desktopTabs.map((tab) => {
            const tip = TAB_TOOLTIPS[tab.id];
            return (
              <div
                key={tab.id}
                className={`inline-flex items-center gap-1 pr-2 rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-amber-600 text-amber-800 bg-white shadow-xs font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <button
                  type="button"
                  title={tab.title}
                  onClick={() => setActiveTab(tab.id)}
                  className="pl-3.5 sm:pl-4 pr-0.5 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  {tab.label}
                </button>
                <InfoTooltip title={tip.title} text={tip.text} />
              </div>
            );
          })}
        </div>

        {activeTab === 'stream' && (
          <LiveStreamTab
            stats={polling.stats}
            events={polling.events}
            timeRange={timeRange}
            includeHeartbeat={includeHeartbeat}
            setIncludeHeartbeat={setIncludeHeartbeat}
            eventSearch={eventSearch}
            setEventSearch={setEventSearch}
            checkIsRestricted={actions.checkIsRestricted}
            openVisitorJourney={actions.openVisitorJourney}
          />
        )}
        {activeTab === 'products' && (
          <ProductDemandTab
            stats={polling.stats}
            productData={polling.productData}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            copiedPart={actions.copiedPart}
            handleCopyPart={actions.handleCopyPart}
            setInspectedProduct={setInspectedProduct}
          />
        )}
        {activeTab === 'audience' && (
          <AudienceGeoTab
            stats={polling.stats}
            setActiveTab={setActiveTab}
            setEventSearch={setEventSearch}
            setProductSearch={setProductSearch}
          />
        )}
        {/* Search Demand, Avg. Section Dwell, Model Hubs & Sentinel */}
        {activeTab === 'demand' && (
          <SearchDwellTab
            stats={polling.stats}
            setActiveTab={setActiveTab}
            setProductSearch={setProductSearch}
            flaggingInProgress={actions.flaggingInProgress}
            activeFlagFeedback={actions.activeFlagFeedback}
            setActiveFlagFeedback={actions.setActiveFlagFeedback}
            handleToggleFlag={actions.handleToggleFlag}
            handleRemoveFlag={actions.handleRemoveFlag}
            handleEscalateRestriction={actions.handleEscalateRestriction}
            handleCopyPart={actions.handleCopyPart}
            copyToClipboard={actions.copyToClipboard}
            openVisitorJourney={actions.openVisitorJourney}
          />
        )}
        {activeTab === 'visitors' && (
          <VisitorsTab
            stats={polling.stats}
            timeRange={timeRange}
            visitorsList={polling.visitorsList}
            visitorTotalCount={polling.visitorTotalCount}
            visitorSummaryCounts={polling.visitorSummaryCounts}
            visitorFilters={visitorFilters}
            setVisitorFilters={setVisitorFilters}
            isVisitorsLoading={polling.isVisitorsLoading}
            fetchVisitors={polling.fetchVisitors}
            checkIsRestricted={actions.checkIsRestricted}
            flaggingInProgress={actions.flaggingInProgress}
            contactCopiedFeedback={actions.contactCopiedFeedback}
            copyToClipboard={actions.copyToClipboard}
            openVisitorJourney={actions.openVisitorJourney}
            handleToggleFlag={actions.handleToggleFlag}
            handleRemoveFlag={actions.handleRemoveFlag}
            handleAddRestriction={actions.handleAddRestriction}
            handleRemoveVisitorRestrictions={actions.handleRemoveVisitorRestrictions}
          />
        )}
        {activeTab === 'restrictions' && (
          <RestrictionsTab
            restrictions={polling.restrictions}
            newRestrictionInput={actions.newRestrictionInput}
            setNewRestrictionInput={actions.setNewRestrictionInput}
            newRestrictionNote={actions.newRestrictionNote}
            setNewRestrictionNote={actions.setNewRestrictionNote}
            newRestrictionType={actions.newRestrictionType}
            setNewRestrictionType={actions.setNewRestrictionType}
            isSubmittingRestriction={actions.isSubmittingRestriction}
            restrictionActionFeedback={actions.restrictionActionFeedback}
            setRestrictionActionFeedback={actions.setRestrictionActionFeedback}
            isAddIpModalOpen={isAddIpModalOpen}
            setIsAddIpModalOpen={setIsAddIpModalOpen}
            handleAddRestriction={actions.handleAddRestriction}
            handleRemoveRestriction={actions.handleRemoveRestriction}
            copyToClipboard={actions.copyToClipboard}
          />
        )}
        {activeTab === 'ops' && (
          <OpsHealthTab
            opsHealth={polling.opsHealth}
            auditLogs={polling.auditLogs}
            auditTotalCount={polling.auditTotalCount}
            auditPagination={auditPagination}
            setAuditPagination={setAuditPagination}
            isOpsLoading={polling.isOpsLoading}
            timeRange={timeRange}
            onRefreshOps={() => void polling.fetchOpsAndAudit()}
          />
        )}
      </main>

      <ProductInspectorDrawer
        inspectedProduct={inspectedProduct}
        onClose={() => setInspectedProduct(null)}
        timeRange={timeRange}
        isAuthenticated={polling.isAuthenticated}
        onUnauthorized={polling.handleUnauthorized}
        copiedPart={actions.copiedPart}
        handleCopyPart={actions.handleCopyPart}
        openVisitorJourney={actions.openVisitorJourney}
        productEngagementStats={polling.stats?.productEngagementStats}
      />

      <VisitorJourneyModal
        selectedVisitorId={selectedVisitorId}
        selectedVisitorIp={actions.selectedVisitorIp}
        onClose={() => setSelectedVisitorId(null)}
        visitorJourney={actions.visitorJourney}
        isJourneyLoading={actions.isJourneyLoading}
        correlateByIp={correlateByIp}
        setCorrelateByIp={setCorrelateByIp}
        journeySortOrder={actions.journeySortOrder}
        setJourneySortOrder={actions.setJourneySortOrder}
        journeyEventFilter={actions.journeyEventFilter}
        setJourneyEventFilter={actions.setJourneyEventFilter}
        restrictions={polling.restrictions}
        restrictionActionFeedback={actions.restrictionActionFeedback}
        setRestrictionActionFeedback={actions.setRestrictionActionFeedback}
        openVisitorJourney={actions.openVisitorJourney}
        handleAddRestriction={actions.handleAddRestriction}
        handleRemoveRestriction={actions.handleRemoveRestriction}
        handleRemoveVisitorRestrictions={actions.handleRemoveVisitorRestrictions}
      />
    </div>
  );
}
