'use client';

import React from 'react';
import type { AuditLogRecord, OpsHealthStats, TimeRange } from '../_types/analytics';
import { formatIST, formatTimeAgo } from '../_utils/formatters';
import InfoTooltip from './InfoTooltip';
import { OPS_TOOLTIPS } from '../_utils/metricTooltips';

interface OpsHealthTabProps {
  opsHealth: OpsHealthStats | null;
  auditLogs: AuditLogRecord[];
  auditTotalCount: number;
  auditPagination: { limit: number; offset: number };
  setAuditPagination: React.Dispatch<React.SetStateAction<{ limit: number; offset: number }>>;
  isOpsLoading: boolean;
  timeRange: TimeRange;
  onRefreshOps: () => void;
}

export default function OpsHealthTab({
  opsHealth,
  auditLogs,
  auditTotalCount,
  auditPagination,
  setAuditPagination,
  isOpsLoading,
  timeRange,
  onRefreshOps,
}: OpsHealthTabProps) {
  const ingest = opsHealth?.ingestStats;
  const apiSla = opsHealth?.apiSla || [];
  const dbPool = opsHealth?.dbPoolAndCache;
  const externalSlas = opsHealth?.externalSlas || [];
  const alerts = opsHealth?.alertDeliveries;
  const notFoundPaths = opsHealth?.notFoundPaths || [];
  const loadingScreen = opsHealth?.loadingScreen;
  const clientErrors = opsHealth?.clientErrors;
  const middlewareBlocks = opsHealth?.middlewareBlocks;

  const totalApiRequests = apiSla.reduce((acc, r) => acc + (r.requests || 0), 0);
  const totalApiErrors = apiSla.reduce((acc, r) => acc + (r.errorCount || 0), 0);
  const apiErrorRate =
    totalApiRequests > 0 ? Math.round((totalApiErrors / totalApiRequests) * 1000) / 10 : 0;

  const currentAuditPage = Math.floor(auditPagination.offset / auditPagination.limit) + 1;
  const totalAuditPages = Math.max(1, Math.ceil(auditTotalCount / auditPagination.limit));

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🛠️ Operational Telemetry &amp; Admin Audit Trail</span>
              <InfoTooltip {...OPS_TOOLTIPS.overview} />
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              {timeRange}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pipeline health, API/DB SLAs, external providers, alert deduplication, 404s, splash gate timing, and Edge blocks
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshOps}
          disabled={isOpsLoading}
          className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
        >
          <span className={isOpsLoading ? 'animate-spin inline-block' : ''}>🔄</span>
          <span>{isOpsLoading ? 'Refreshing Ops...' : 'Refresh Ops & Audit'}</span>
        </button>
      </div>

      {/* Top 4 Ops KPI Strip */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:mx-0 md:px-0">
        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Ingest Health
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...OPS_TOOLTIPS.ingestHealth} />
              <span className="text-xs">📡</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
            {ingest?.successRate ?? 100}%
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-mono truncate">
            {ingest?.totalEventsIngested ?? 0} events · p95 {ingest?.p95DurationMs ?? 0}ms
          </p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              API Requests
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...OPS_TOOLTIPS.apiRequests} />
              <span className="text-xs">⚡</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            {totalApiRequests.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-mono truncate">
            {totalApiErrors} 5xx ({apiErrorRate}%)
          </p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Splash p95
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...OPS_TOOLTIPS.splashP95} />
              <span className="text-xs">⏱️</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 font-mono">
            {loadingScreen ? `${(loadingScreen.p95WaitMs / 1000).toFixed(1)}s` : '0.0s'}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-mono truncate">
            {loadingScreen?.bounceRate ?? 0}% bounce · {loadingScreen?.fallback12sRate ?? 0}% 12s
          </p>
        </div>

        <div className="shrink-0 snap-start w-[155px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Edge Blocks
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <InfoTooltip {...OPS_TOOLTIPS.edgeBlocks} />
              <span className="text-xs">🛡️</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 font-mono">
            {middlewareBlocks?.totalBlocks ?? 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-mono truncate">
            {middlewareBlocks?.redirect307Count ?? 0} 307 · {auditTotalCount} audit logs
          </p>
        </div>
      </div>

      {/* 1. Ingest Pipeline & 2. API SLAs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingest Pipeline Health (OBS-01) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>📥 Ingest Pipeline</span>
              <InfoTooltip {...OPS_TOOLTIPS.ingestPipeline} />
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
              {ingest?.errorRate ?? 0}% err
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Batches</span>
              <span className="font-mono font-bold text-slate-900">{ingest?.totalBatches ?? 0}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">OK / Saved</span>
              <span className="font-mono font-bold text-emerald-700">{ingest?.okBatches ?? 0}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rejected</span>
              <span className="font-mono font-bold text-amber-700">
                {ingest?.rejectedBatches ?? 0}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">500 Errors</span>
              <span className="font-mono font-bold text-rose-700">{ingest?.errorBatches ?? 0}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Ingest Error Codes
            </span>
            {ingest?.byErrorCode && ingest.byErrorCode.length > 0 ? (
              <div className="space-y-1.5">
                {ingest.byErrorCode.map((e) => (
                  <div
                    key={e.errorCode}
                    className="flex items-center justify-between text-xs p-2 bg-rose-50/70 border border-rose-200/70 rounded-lg"
                  >
                    <span className="font-mono text-rose-800 break-all">{e.errorCode}</span>
                    <span className="font-mono font-bold text-rose-900 shrink-0">{e.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                Zero ingest drops or errors in this period.
              </p>
            )}
          </div>
        </div>

        {/* API Route SLAs (OBS-02) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>⚡ API Route Latency &amp; SLAs</span>
                <InfoTooltip {...OPS_TOOLTIPS.apiSla} />
              </h3>
              <p className="text-xs text-slate-500">p50 / p95 / max latency and 5xx rates by route</p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{apiSla.length} routes</span>
          </div>

          {apiSla.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2.5">
                {apiSla.map((r) => (
                  <div
                    key={r.route}
                    className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 break-all">
                        {r.route}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          r.errorCount > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {r.error5xxRate}% 5xx
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono pt-1 border-t border-slate-200/70">
                      <div>
                        <span className="text-slate-400 block">Reqs</span>
                        <span className="font-bold text-slate-800">{r.requests}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">p50</span>
                        <span className="font-bold text-slate-800">{r.p50Ms}ms</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">p95</span>
                        <span className="font-bold text-amber-700">{r.p95Ms}ms</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Max</span>
                        <span className="font-bold text-slate-700">{r.maxMs}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-2 text-center">Requests</th>
                      <th className="py-2.5 px-2 text-center">OK</th>
                      <th className="py-2.5 px-2 text-center">Rejected</th>
                      <th className="py-2.5 px-2 text-center">5xx</th>
                      <th className="py-2.5 px-2 text-center">p50</th>
                      <th className="py-2.5 px-2 text-center">p95</th>
                      <th className="py-2.5 px-3 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apiSla.map((r) => (
                      <tr key={r.route} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {r.route}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">{r.requests}</td>
                        <td className="py-2.5 px-2 text-center font-mono text-emerald-700">
                          {r.okCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-700">
                          {r.rejectedCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-rose-700 font-bold">
                          {r.errorCount} ({r.error5xxRate}%)
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">{r.p50Ms}ms</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-800">
                          {r.p95Ms}ms
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {r.maxMs}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              No API route telemetry recorded in this window yet.
            </div>
          )}
        </div>
      </div>

      {/* 3. DB Pool, Query Latency & Catalog Cache (OBS-03) + 4. External SLAs (OBS-04) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🗄️ DB Pool, Query Latency &amp; Catalog Cache</span>
              <InfoTooltip {...OPS_TOOLTIPS.dbPool} />
            </h3>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold">
              {dbPool?.catalogCache?.hitRate ?? 0}% cache hit
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pool Max</span>
              <span className="font-mono font-bold text-slate-900">{dbPool?.pool?.max ?? 4}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total / Idle</span>
              <span className="font-mono font-bold text-slate-900">
                {dbPool?.pool?.totalCount ?? 0} / {dbPool?.pool?.idleCount ?? 0}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Waiting</span>
              <span className="font-mono font-bold text-amber-700">
                {dbPool?.pool?.waitingCount ?? 0}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Catalog SKUs</span>
              <span className="font-mono font-bold text-emerald-700">
                {dbPool?.memoryCatalogCache?.cachedCount ?? 0} ({dbPool?.catalogCache?.hits ?? 0}h /{' '}
                {dbPool?.catalogCache?.misses ?? 0}m)
              </span>
            </div>
          </div>

          {dbPool?.dbQueries && dbPool.dbQueries.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2">
                {dbPool.dbQueries.map((q) => (
                  <div
                    key={q.targetName}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 truncate">{q.targetName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {q.count} calls · {q.errorCount} err
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-800 shrink-0">
                      p95 {q.p95Ms}ms
                    </span>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Query Target</th>
                      <th className="py-2 px-2 text-center">Count</th>
                      <th className="py-2 px-2 text-center">Err</th>
                      <th className="py-2 px-2 text-center">p50</th>
                      <th className="py-2 px-3 text-right">p95</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dbPool.dbQueries.map((q) => (
                      <tr key={q.targetName}>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                          {q.targetName}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{q.count}</td>
                        <td className="py-2 px-2 text-center font-mono text-rose-700">
                          {q.errorCount}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{q.p50Ms}ms</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                          {q.p95Ms}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
              No db_query timing samples recorded in this period yet.
            </p>
          )}
        </div>

        {/* External Integration SLAs (OBS-04) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>🌐 External Integration SLAs</span>
                <InfoTooltip {...OPS_TOOLTIPS.externalSlas} />
              </h3>
              <p className="text-xs text-slate-500">
                ipapi.co, ip-api.com, StaticForms, Resend, ntfy, IndexNow
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {externalSlas.length} providers
            </span>
          </div>

          {externalSlas.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2.5">
                {externalSlas.map((ext) => (
                  <div
                    key={ext.targetName}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {ext.targetName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                        {ext.successRate}% ok
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                      <span>
                        {ext.calls} calls · {ext.timeoutCount} to · {ext.errorCount} err
                      </span>
                      <span>p95 {ext.p95Ms}ms</span>
                    </div>
                    {ext.lastErrorCode && (
                      <div className="text-[10px] font-mono text-rose-700 break-all">
                        Last err: {ext.lastErrorCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Provider</th>
                      <th className="py-2 px-2 text-center">Calls</th>
                      <th className="py-2 px-2 text-center">Success %</th>
                      <th className="py-2 px-2 text-center">Timeout / Err</th>
                      <th className="py-2 px-2 text-center">p95</th>
                      <th className="py-2 px-3 text-right">Last Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {externalSlas.map((ext) => (
                      <tr key={ext.targetName}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {ext.targetName}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{ext.calls}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700">
                          {ext.successRate}%
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-rose-700">
                          {ext.timeoutCount} / {ext.errorCount}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{ext.p95Ms}ms</td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-rose-600">
                          {ext.lastErrorCode || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-xl">
              No external provider calls recorded in this window yet.
            </p>
          )}
        </div>
      </div>

      {/* 5. Alert Deliveries (OBS-05) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🔔 Persistent Alert Deliveries &amp; Deduplication</span>
              <InfoTooltip {...OPS_TOOLTIPS.alertDeliveries} />
            </h3>
            <p className="text-xs text-slate-500">
              Cross-instance Sentinel alert tracking backed by analytics_alert_deliveries
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              {alerts?.sent ?? 0} sent
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              {alerts?.deduplicated ?? 0} deduped
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
              {alerts?.failed ?? 0} failed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* By Channel */}
          <div className="border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              By Channel
            </h4>
            {alerts?.byChannel && alerts.byChannel.length > 0 ? (
              <div className="space-y-2">
                {alerts.byChannel.map((ch) => (
                  <div
                    key={ch.channel}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900">{ch.channel}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ch.sent} sent · {ch.deduplicated} dedup · {ch.failed} fail
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 shrink-0">
                      {ch.avgLatencyMs}ms
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No alert channels triggered.</p>
            )}
          </div>

          {/* Recent Deliveries */}
          <div className="lg:col-span-2 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Recent Deliveries
            </h4>
            {alerts?.recent && alerts.recent.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {alerts.recent.slice(0, 10).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {a.channel} · {a.outcome}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatTimeAgo(a.created_at)}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 break-all">
                        {a.heuristic_name || a.dedupe_key}
                      </div>
                      {a.error_message && (
                        <div className="text-[10px] text-rose-700 break-words">
                          {a.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Channel</th>
                        <th className="py-2 px-2">Outcome</th>
                        <th className="py-2 px-2">Heuristic / Key</th>
                        <th className="py-2 px-2 text-center">Status / ms</th>
                        <th className="py-2 px-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alerts.recent.slice(0, 12).map((a) => (
                        <tr key={a.id}>
                          <td className="py-2 px-3 font-mono font-semibold">{a.channel}</td>
                          <td className="py-2 px-2 font-mono font-bold">
                            <span
                              className={
                                a.outcome === 'sent'
                                  ? 'text-emerald-700'
                                  : a.outcome === 'failed'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }
                            >
                              {a.outcome}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px] max-w-[200px] truncate">
                            {a.heuristic_name || a.dedupe_key}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {a.http_status ?? '-'} / {a.latency_ms ?? 0}ms
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {formatTimeAgo(a.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No recent alert deliveries recorded.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 6. 404 Paths + 7. LoadingScreen Timing + 8. Client Errors + 9. Middleware Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 404 Broken Links (OBS-06) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🔗 404 Broken-Link Paths</span>
              <InfoTooltip {...OPS_TOOLTIPS.notFoundPaths} />
            </h3>
            <span className="text-[11px] font-mono text-slate-500">{notFoundPaths.length} paths</span>
          </div>

          {notFoundPaths.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2">
                {notFoundPaths.map((nf, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-rose-800 break-all">{nf.path}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {nf.hits} hits
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between gap-2">
                      <span>{nf.uniqueVisitors} visitors</span>
                      {nf.inferredPartNumber && (
                        <span className="text-amber-800">Part: {nf.inferredPartNumber}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Requested Path</th>
                      <th className="py-2 px-2 text-center">Hits</th>
                      <th className="py-2 px-2 text-center">Visitors</th>
                      <th className="py-2 px-3 text-right">Inferred Part</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notFoundPaths.map((nf, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-semibold text-rose-800 max-w-[220px] truncate">
                          {nf.path}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{nf.hits}</td>
                        <td className="py-2 px-2 text-center font-mono">{nf.uniqueVisitors}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-800">
                          {nf.inferredPartNumber || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
              Zero 404 events recorded in this period.
            </p>
          )}
        </div>

        {/* Client Runtime Errors (OBS-06) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>💥 Client Runtime Errors</span>
              <InfoTooltip {...OPS_TOOLTIPS.clientErrors} />
            </h3>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono font-bold">
              {clientErrors?.totalErrors ?? 0} total · {clientErrors?.uniqueVisitors ?? 0} users
            </span>
          </div>

          {clientErrors?.topErrors && clientErrors.topErrors.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2">
                {clientErrors.topErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                        {err.kind}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{err.count}×</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-800 break-words">
                      {err.message}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 break-all">
                      {err.source}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Kind</th>
                      <th className="py-2 px-2">Message</th>
                      <th className="py-2 px-2 text-center">Count</th>
                      <th className="py-2 px-3 text-right">Visitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientErrors.topErrors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-bold text-rose-700">{err.kind}</td>
                        <td className="py-2 px-2 font-mono text-[11px] max-w-[220px] truncate">
                          {err.message}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{err.count}</td>
                        <td className="py-2 px-3 text-right font-mono">{err.uniqueVisitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
              Zero client runtime errors reported.
            </p>
          )}
        </div>
      </div>

      {/* LoadingScreen Timing (OBS-07) & Edge Middleware Blocks (OBS-08) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🎬 LoadingScreen Splash Gate Timing</span>
              <InfoTooltip {...OPS_TOOLTIPS.loadingScreenTiming} />
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {loadingScreen?.samples ?? 0} samples
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">p50 Wait</span>
              <span className="text-base font-extrabold font-mono text-slate-900">
                {loadingScreen?.p50WaitMs ?? 0}ms
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">p95 Wait</span>
              <span className="text-base font-extrabold font-mono text-amber-700">
                {loadingScreen?.p95WaitMs ?? 0}ms
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Wait</span>
              <span className="text-base font-extrabold font-mono text-slate-800">
                {loadingScreen?.avgWaitMs ?? 0}ms
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                12s Fallback
              </span>
              <span className="text-base font-extrabold font-mono text-amber-800">
                {loadingScreen?.fallback12sCount ?? 0} ({loadingScreen?.fallback12sRate ?? 0}%)
              </span>
            </div>
            <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Bounced Before Dismiss
              </span>
              <span className="text-base font-extrabold font-mono text-rose-700">
                {loadingScreen?.bouncedBeforeDismissCount ?? 0} ({loadingScreen?.bounceRate ?? 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🚧 Edge Middleware Blocks</span>
              <InfoTooltip {...OPS_TOOLTIPS.edgeBlocksCard} />
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              307: {middlewareBlocks?.redirect307Count ?? 0} · 200 []:{' '}
              {middlewareBlocks?.json200Count ?? 0}
            </span>
          </div>

          {middlewareBlocks?.byTarget && middlewareBlocks.byTarget.length > 0 ? (
            <>
              <div className="block md:hidden space-y-2">
                {middlewareBlocks.byTarget.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 truncate">
                        {b.targetName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        HTTP {b.statusCode ?? '-'} · {formatTimeAgo(b.lastBlockedAt)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-rose-700 shrink-0">
                      {b.blocks} blocks
                    </span>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-2 text-center">HTTP Status</th>
                      <th className="py-2 px-2 text-center">Blocks</th>
                      <th className="py-2 px-3 text-right">Last Blocked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {middlewareBlocks.byTarget.map((b, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                          {b.targetName}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{b.statusCode ?? '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-rose-700">
                          {b.blocks}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {formatTimeAgo(b.lastBlockedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
              No Edge middleware restriction blocks recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* 10. Paginated Admin Security & Audit Trail (OBS-09) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📜 Admin Security &amp; Audit Log</span>
              <InfoTooltip {...OPS_TOOLTIPS.auditLog} />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable trail of admin logins, restriction edits, and sentinel flag changes ({auditTotalCount} total)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Per page:</span>
            <select
              value={auditPagination.limit}
              onChange={(e) =>
                setAuditPagination({ limit: Number(e.target.value), offset: 0 })
              }
              className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 bg-slate-50/50">
            No admin audit log entries recorded yet.
          </div>
        ) : (
          <>
            <div className="block md:hidden space-y-2.5 p-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900">{log.action}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.success
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 break-all">
                    {log.actor_label} {log.actor_ip ? `(${log.actor_ip})` : ''}
                  </div>
                  {log.target_value && (
                    <div className="text-[11px] font-mono text-amber-800 break-all">
                      {log.target_type}: {log.target_value}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-slate-400">
                    {formatIST(log.created_at)} IST
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Time (IST)</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Actor / IP</th>
                    <th className="py-3 px-3">Target</th>
                    <th className="py-3 px-3 text-center">Outcome</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatIST(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {log.actor_label} {log.actor_ip ? `(${log.actor_ip})` : ''}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-800 max-w-[200px] truncate">
                        {log.target_value ? `${log.target_type || ''}: ${log.target_value}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.success
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.success ? 'OK' : 'Denied'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500 max-w-[200px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {auditTotalCount > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing{' '}
              <strong className="text-slate-900">{auditPagination.offset + 1}</strong> to{' '}
              <strong className="text-slate-900">
                {Math.min(auditPagination.offset + auditPagination.limit, auditTotalCount)}
              </strong>{' '}
              of <strong className="text-slate-900">{auditTotalCount}</strong> entries
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={auditPagination.offset <= 0}
                onClick={() =>
                  setAuditPagination((prev) => ({
                    ...prev,
                    offset: Math.max(0, prev.offset - prev.limit),
                  }))
                }
                className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                ← Previous
              </button>
              <span className="px-2.5 font-semibold text-slate-800">
                Page {currentAuditPage} of {totalAuditPages}
              </span>
              <button
                type="button"
                disabled={auditPagination.offset + auditPagination.limit >= auditTotalCount}
                onClick={() =>
                  setAuditPagination((prev) => ({
                    ...prev,
                    offset: prev.offset + prev.limit,
                  }))
                }
                className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
