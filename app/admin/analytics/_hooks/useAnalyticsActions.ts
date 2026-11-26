'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  AnalyticsEvent,
  JourneyEventFilter,
  RestrictionActionFeedback,
  RestrictionRecord,
} from '../_types/analytics';

interface UseAnalyticsActionsOptions {
  passcode: string;
  restrictions: RestrictionRecord[];
  correlateByIp: boolean;
  setCorrelateByIp: (val: boolean) => void;
  ensureRestrictionsLoaded: () => Promise<void>;
  fetchRestrictions: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchVisitors: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setIsAuthenticated: (val: boolean) => void;
}

export function useAnalyticsActions({
  passcode,
  restrictions,
  correlateByIp,
  ensureRestrictionsLoaded,
  fetchRestrictions,
  fetchEvents,
  fetchVisitors,
  fetchStats,
  setIsAuthenticated,
}: UseAnalyticsActionsOptions) {
  // Restriction modal & form states
  const [newRestrictionInput, setNewRestrictionInput] = useState('');
  const [newRestrictionNote, setNewRestrictionNote] = useState('');
  const [newRestrictionType, setNewRestrictionType] = useState<'ip' | 'visitor_id'>('ip');
  const [isSubmittingRestriction, setIsSubmittingRestriction] = useState(false);
  const [restrictionActionFeedback, setRestrictionActionFeedback] =
    useState<RestrictionActionFeedback | null>(null);

  // Flagging & clipboard feedback states
  const [flaggingInProgress, setFlaggingInProgress] = useState<string | null>(null);
  const [activeFlagFeedback, setActiveFlagFeedback] = useState<string | null>(null);
  const [copiedPart, setCopiedPart] = useState<string | null>(null);
  const [contactCopiedFeedback, setContactCopiedFeedback] = useState<string | null>(null);

  // Visitor Journey modal states
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [selectedVisitorIp, setSelectedVisitorIp] = useState<string | null>(null);
  const [visitorJourney, setVisitorJourney] = useState<AnalyticsEvent[]>([]);
  const [isJourneyLoading, setIsJourneyLoading] = useState(false);
  const [journeySortOrder, setJourneySortOrder] = useState<'asc' | 'desc'>('desc');
  const [journeyEventFilter, setJourneyEventFilter] = useState<JourneyEventFilter>('all');

  const buildAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (passcode && passcode.trim()) {
      headers.Authorization = `Bearer ${passcode.trim()}`;
    }
    return headers;
  }, [passcode]);

  const checkIsRestricted = useCallback(
    (visitorId?: string | null, ipAddress?: string | null, isExplicitRestricted?: boolean) => {
      if (isExplicitRestricted) return true;
      if (!restrictions || restrictions.length === 0) return false;
      const vId = visitorId?.toLowerCase().trim();
      const ip = ipAddress?.toLowerCase().trim();
      return restrictions.some((r) => {
        const val = (r.value || '').toLowerCase().trim();
        return Boolean((vId && val === vId) || (ip && val === ip));
      });
    },
    [restrictions]
  );

  const handleAddRestriction = useCallback(
    async (customVal?: string, customType?: 'ip' | 'visitor_id', customNote?: string) => {
      const val = (customVal || newRestrictionInput).trim();
      if (!val) return;
      const type = customType || newRestrictionType;
      const note = customNote !== undefined ? customNote : newRestrictionNote;

      setIsSubmittingRestriction(true);
      setRestrictionActionFeedback(null);
      try {
        const res = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_restriction',
            type,
            value: val,
            note,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setNewRestrictionInput('');
          setNewRestrictionNote('');
          setRestrictionActionFeedback({
            type: 'success',
            text: `Restricted ${type === 'ip' ? 'IP' : 'Visitor ID'}: ${val}`,
          });
          await Promise.all([fetchRestrictions(), fetchEvents(), fetchVisitors()]);
        } else {
          setRestrictionActionFeedback({
            type: 'error',
            text: data.error || 'Failed to add restriction',
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error';
        setRestrictionActionFeedback({ type: 'error', text: message });
      } finally {
        setIsSubmittingRestriction(false);
        setTimeout(() => setRestrictionActionFeedback(null), 4000);
      }
    },
    [
      newRestrictionInput,
      newRestrictionType,
      newRestrictionNote,
      fetchRestrictions,
      fetchEvents,
      fetchVisitors,
      setIsAuthenticated,
    ]
  );

  const handleRemoveRestriction = useCallback(
    async (identifier: string | number) => {
      setRestrictionActionFeedback(null);
      try {
        const res = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove_restriction',
            id: typeof identifier === 'number' ? identifier : undefined,
            value: typeof identifier === 'string' ? identifier : undefined,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setRestrictionActionFeedback({
            type: 'success',
            text: 'Restriction removed successfully.',
          });
          await Promise.all([fetchRestrictions(), fetchEvents(), fetchVisitors()]);
        }
      } catch (err) {
        console.error('Failed to remove restriction:', err);
      } finally {
        setTimeout(() => setRestrictionActionFeedback(null), 4000);
      }
    },
    [fetchRestrictions, fetchEvents, fetchVisitors, setIsAuthenticated]
  );

  const handleRemoveVisitorRestrictions = useCallback(
    async (visitorId?: string | null, ipAddress?: string | null) => {
      const vId = visitorId?.toLowerCase().trim();
      const ip = ipAddress?.toLowerCase().trim();
      const matching = restrictions.filter((r) => {
        const val = (r.value || '').toLowerCase().trim();
        return Boolean((vId && val === vId) || (ip && val === ip));
      });

      if (matching.length > 0) {
        for (const m of matching) {
          await handleRemoveRestriction(m.id);
        }
      } else {
        if (visitorId) await handleRemoveRestriction(visitorId);
        if (ipAddress) await handleRemoveRestriction(ipAddress);
      }
    },
    [restrictions, handleRemoveRestriction]
  );

  const openVisitorJourney = useCallback(
    async (visitorId: string, ipAddress?: string | null, forceCorrelate?: boolean) => {
      setSelectedVisitorId(visitorId);
      setJourneyEventFilter('all');
      if (ipAddress !== undefined) {
        setSelectedVisitorIp(ipAddress || null);
      }
      setIsJourneyLoading(true);
      const activeCorrelate = forceCorrelate !== undefined ? forceCorrelate : correlateByIp;
      try {
        // Hydrate restrictions on demand so VisitorJourneyModal always shows accurate restriction state & Unrestrict IDs
        const [res] = await Promise.all([
          fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              view: 'events',
              visitorId,
              ipAddress:
                ipAddress || (ipAddress === undefined ? selectedVisitorIp || undefined : undefined),
              correlateByIp: activeCorrelate,
              limit: 200,
            }),
          }),
          ensureRestrictionsLoaded(),
        ]);
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const sorted = (data.events || []).sort(
            (a: AnalyticsEvent, b: AnalyticsEvent) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setVisitorJourney(sorted);
          if (!ipAddress && sorted.length > 0 && sorted[0].ip_address) {
            setSelectedVisitorIp(sorted[0].ip_address);
          }
        }
      } catch (err) {
        console.error('Failed to load journey:', err);
      } finally {
        setIsJourneyLoading(false);
      }
    },
    [correlateByIp, selectedVisitorIp, ensureRestrictionsLoaded, setIsAuthenticated]
  );

  const handleToggleFlag = useCallback(
    async (
      targetType: 'visitor_id' | 'ip',
      targetValue: string,
      flagType: string,
      note?: string
    ) => {
      setFlaggingInProgress(targetValue);
      try {
        const res = await fetch('/api/flags', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            action: 'add',
            targetType,
            targetValue,
            flagType,
            note: note || `Flagged from Dwell Sentinel as ${flagType}`,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        if (res.ok) {
          setActiveFlagFeedback(
            `Flagged ${targetValue.slice(0, 8)}... as ${flagType.toUpperCase()}`
          );
          setTimeout(() => setActiveFlagFeedback(null), 3500);
          await Promise.all([fetchStats(), fetchVisitors()]);
        }
      } catch (e) {
        console.error('Failed to toggle flag:', e);
      } finally {
        setFlaggingInProgress(null);
      }
    },
    [buildAuthHeaders, fetchStats, fetchVisitors, setIsAuthenticated]
  );

  const handleRemoveFlag = useCallback(
    async (targetValue: string, flagType?: string) => {
      setFlaggingInProgress(targetValue);
      try {
        const res = await fetch('/api/flags', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            action: 'remove',
            targetValue,
            flagType,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        if (res.ok) {
          setActiveFlagFeedback(`Removed flag from ${targetValue.slice(0, 8)}...`);
          setTimeout(() => setActiveFlagFeedback(null), 3000);
          await Promise.all([fetchStats(), fetchVisitors()]);
        }
      } catch (e) {
        console.error('Failed to remove flag:', e);
      } finally {
        setFlaggingInProgress(null);
      }
    },
    [buildAuthHeaders, fetchStats, fetchVisitors, setIsAuthenticated]
  );

  const handleEscalateRestriction = useCallback(
    async (type: 'ip' | 'visitor_id', value: string, note: string) => {
      try {
        const res = await fetch('/api/restrictions', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            action: 'add',
            type,
            value,
            note: `Escalated from Dwell Sentinel: ${note}`,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        if (res.ok) {
          setActiveFlagFeedback(`Restricted ${value.slice(0, 8)}... successfully`);
          setTimeout(() => setActiveFlagFeedback(null), 3500);
          await Promise.all([fetchRestrictions(), fetchStats(), fetchVisitors()]);
        }
      } catch (e) {
        console.error('Failed to escalate restriction:', e);
      }
    },
    [buildAuthHeaders, fetchRestrictions, fetchStats, fetchVisitors, setIsAuthenticated]
  );

  const copyToClipboard = useCallback(
    (text: string, id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!text) return;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setContactCopiedFeedback(id);
        setTimeout(() => {
          setContactCopiedFeedback((cur) => (cur === id ? null : cur));
        }, 2000);
      }
    },
    []
  );

  const handleCopyPart = useCallback((partNumber: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!partNumber || partNumber === '-') return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(partNumber);
      setCopiedPart(partNumber);
      setTimeout(() => {
        setCopiedPart((cur) => (cur === partNumber ? null : cur));
      }, 2000);
    }
  }, []);

  return useMemo(
    () => ({
      newRestrictionInput,
      setNewRestrictionInput,
      newRestrictionNote,
      setNewRestrictionNote,
      newRestrictionType,
      setNewRestrictionType,
      isSubmittingRestriction,
      restrictionActionFeedback,
      setRestrictionActionFeedback,
      flaggingInProgress,
      activeFlagFeedback,
      setActiveFlagFeedback,
      copiedPart,
      contactCopiedFeedback,
      selectedVisitorId,
      setSelectedVisitorId,
      selectedVisitorIp,
      visitorJourney,
      isJourneyLoading,
      journeySortOrder,
      setJourneySortOrder,
      journeyEventFilter,
      setJourneyEventFilter,
      checkIsRestricted,
      handleAddRestriction,
      handleRemoveRestriction,
      handleRemoveVisitorRestrictions,
      openVisitorJourney,
      handleToggleFlag,
      handleRemoveFlag,
      handleEscalateRestriction,
      copyToClipboard,
      handleCopyPart,
    }),
    [
      newRestrictionInput,
      newRestrictionNote,
      newRestrictionType,
      isSubmittingRestriction,
      restrictionActionFeedback,
      flaggingInProgress,
      activeFlagFeedback,
      copiedPart,
      contactCopiedFeedback,
      selectedVisitorId,
      selectedVisitorIp,
      visitorJourney,
      isJourneyLoading,
      journeySortOrder,
      journeyEventFilter,
      checkIsRestricted,
      handleAddRestriction,
      handleRemoveRestriction,
      handleRemoveVisitorRestrictions,
      openVisitorJourney,
      handleToggleFlag,
      handleRemoveFlag,
      handleEscalateRestriction,
      copyToClipboard,
      handleCopyPart,
    ]
  );
}
