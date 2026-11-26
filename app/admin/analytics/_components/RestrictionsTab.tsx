'use client';

import React from 'react';
import type { RestrictionActionFeedback, RestrictionRecord } from '../_types/analytics';
import { formatIST, formatTimeAgo } from '../_utils/formatters';

interface RestrictionsTabProps {
  restrictions: RestrictionRecord[];
  newRestrictionInput: string;
  setNewRestrictionInput: (val: string) => void;
  newRestrictionNote: string;
  setNewRestrictionNote: (val: string) => void;
  newRestrictionType: 'ip' | 'visitor_id';
  setNewRestrictionType: (val: 'ip' | 'visitor_id') => void;
  isSubmittingRestriction: boolean;
  restrictionActionFeedback: RestrictionActionFeedback | null;
  setRestrictionActionFeedback: (val: RestrictionActionFeedback | null) => void;
  isAddIpModalOpen: boolean;
  setIsAddIpModalOpen: (val: boolean) => void;
  handleAddRestriction: (
    customVal?: string,
    customType?: 'ip' | 'visitor_id',
    customNote?: string
  ) => Promise<void>;
  handleRemoveRestriction: (identifier: string | number) => Promise<void>;
  copyToClipboard: (text: string, id: string, e?: React.MouseEvent) => void;
}

export default function RestrictionsTab({
  restrictions,
  newRestrictionInput,
  setNewRestrictionInput,
  newRestrictionNote,
  setNewRestrictionNote,
  newRestrictionType,
  setNewRestrictionType,
  isSubmittingRestriction,
  restrictionActionFeedback,
  setRestrictionActionFeedback,
  isAddIpModalOpen,
  setIsAddIpModalOpen,
  handleAddRestriction,
  handleRemoveRestriction,
  copyToClipboard,
}: RestrictionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Feedback Notification Banner */}
      {restrictionActionFeedback && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border flex items-center justify-between ${
            restrictionActionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{restrictionActionFeedback.text}</span>
          <button
            type="button"
            onClick={() => setRestrictionActionFeedback(null)}
            className="text-xs underline ml-4 hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Trigger Button for Add Restriction Bottom Sheet (< 768px) */}
      <div className="block md:hidden">
        <button
          type="button"
          onClick={() => setIsAddIpModalOpen(true)}
          className="w-full min-h-[44px] py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🛡️</span>
          <span>+ Add Target Restriction (IP / Visitor ID)</span>
        </button>
      </div>

      {/* Card 1: Add Restriction Form (Desktop >= 768px) */}
      <div className="hidden md:block bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🛡️</span>
          <h2 className="text-base font-bold text-slate-900">
            Add IP or Visitor ID to Restriction List
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-6 max-w-2xl leading-relaxed">
          Restricted IPs or Visitor IDs will be automatically blocked from accessing product catalog pages,
          machine models, and catalog search APIs (redirected to{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">/#contact</code>
          ). They will see the targeted parts assistance inquiry form instead, and their scraping activity will be dropped from product analytics.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAddRestriction();
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200/80"
        >
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Restriction Type
            </label>
            <select
              value={newRestrictionType}
              onChange={(e) => setNewRestrictionType(e.target.value as 'ip' | 'visitor_id')}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ip">IP Address (e.g. 49.37.155.22)</option>
              <option value="visitor_id">Visitor ID (UUID)</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              {newRestrictionType === 'ip' ? 'IP Address' : 'Visitor ID (UUID)'}{' '}
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                newRestrictionType === 'ip'
                  ? 'e.g. 103.212.144.50'
                  : 'e.g. b1747b10-0ca4-4db3-9d58-eecc3cfe6479'
              }
              value={newRestrictionInput}
              onChange={(e) => setNewRestrictionInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Nuisance scraper / competitor"
              value={newRestrictionNote}
              onChange={(e) => setNewRestrictionNote(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmittingRestriction}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmittingRestriction ? 'Saving...' : '+ Restrict Target'}
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Current Restrictions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Restricted List</h3>
            <p className="text-xs text-slate-500">
              Currently enforced IP addresses and Visitor IDs
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {restrictions.length} active rule{restrictions.length === 1 ? '' : 's'}
          </span>
        </div>

        {restrictions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <span className="text-3xl block mb-2">🛡️</span>
            <p className="text-sm font-semibold text-slate-700">No active restrictions</p>
            <p className="text-xs text-slate-400 mt-1">
              Add an IP or Visitor ID above to restrict access to products.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Restriction Cards (< 768px) */}
            <div className="block md:hidden space-y-3">
              {restrictions.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.type === 'ip'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {r.type === 'ip' ? 'IP Address' : 'Visitor ID'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatTimeAgo(r.created_at)}
                    </span>
                  </div>

                  <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100 break-all flex items-center justify-between gap-2">
                    <span>{r.value}</span>
                    <button
                      type="button"
                      onClick={(e) => copyToClipboard(r.value, 'Value', e)}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                      title="Copy Value"
                    >
                      📋
                    </button>
                  </div>

                  {r.note && (
                    <div className="text-xs text-slate-600 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100 break-words">
                      Note: {r.note}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => void handleRemoveRestriction(r.id)}
                      className="w-full min-h-[44px] py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      Remove Rule / Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (Desktop >= 768px Preserved) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Identifier Value</th>
                    <th className="py-3 px-4">Note / Reason</th>
                    <th className="py-3 px-4">Added On</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {restrictions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.type === 'ip'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {r.type === 'ip' ? 'IP Address' : 'Visitor ID'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {r.value}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.note || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {formatIST(r.created_at, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}{' '}
                        IST
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleRemoveRestriction(r.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Remove Rule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ADD RESTRICTION / IP MODAL (Slide-up bottom sheet on mobile < 768px, centered dialog on desktop >= 768px) */}
      {isAddIpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end md:items-center md:justify-center p-0 md:p-4 transition-opacity"
          onClick={() => setIsAddIpModalOpen(false)}
        >
          <div
            className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-2xl max-h-[88vh] md:max-h-[85vh] p-5 sm:p-6 overflow-y-auto flex flex-col shadow-2xl animate-slide-up md:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 md:hidden"></div>

            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Add Restriction Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddIpModalOpen(false)}
                className="min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition shadow-xs cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
              Restricted targets will be automatically blocked from accessing product catalog pages and catalog search APIs.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleAddRestriction();
                setIsAddIpModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Restriction Type
                </label>
                <select
                  value={newRestrictionType}
                  onChange={(e) => setNewRestrictionType(e.target.value as 'ip' | 'visitor_id')}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                >
                  <option value="ip">IP Address (e.g. 49.37.155.22)</option>
                  <option value="visitor_id">Visitor ID (UUID)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {newRestrictionType === 'ip' ? 'IP Address' : 'Visitor ID (UUID)'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newRestrictionType === 'ip'
                      ? 'e.g. 103.212.144.50'
                      : 'e.g. b1747b10-0ca4-4db3-9d58-eecc3cfe6479'
                  }
                  value={newRestrictionInput}
                  onChange={(e) => setNewRestrictionInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 break-all min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nuisance scraper / competitor"
                  value={newRestrictionNote}
                  onChange={(e) => setNewRestrictionNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddIpModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestriction}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingRestriction ? 'Saving...' : '🛡️ Add Restriction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
