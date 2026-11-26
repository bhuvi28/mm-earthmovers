'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getTracker } from '@/lib/analytics/tracker';
import { isStaticRestrictedVisitor, checkClientRestrictionStatus } from '@/lib/restrictions-static';

const SESSION_ERROR_COUNT_KEY = 'mm_client_error_count';
const MAX_ERRORS_PER_SESSION = 5;

function readSessionErrorCount(): number {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SESSION_ERROR_COUNT_KEY);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  } catch {}
  return 0;
}

function writeSessionErrorCount(count: number): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_ERROR_COUNT_KEY, String(count));
    }
  } catch {}
}

function formatRejectionReason(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return {
      message: String(reason.message || reason.name || 'Unhandled rejection').slice(0, 300),
      stack: reason.stack ? String(reason.stack).slice(0, 400) : undefined,
    };
  }
  if (typeof reason === 'string') {
    return { message: reason.slice(0, 300) || 'Unhandled rejection' };
  }
  if (reason !== null && reason !== undefined) {
    try {
      return { message: JSON.stringify(reason).slice(0, 300) || 'Unhandled rejection' };
    } catch {
      return { message: String(reason).slice(0, 300) || 'Unhandled rejection' };
    }
  }
  return { message: 'Unhandled promise rejection' };
}

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const errorCountRef = useRef(0);
  const isReportingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const emitClientError = (payload: {
      kind: 'error' | 'unhandledrejection';
      message: string;
      source: string;
      lineno?: number;
      colno?: number;
      stack?: string;
    }) => {
      if (isReportingRef.current) return;
      const currentPath = window.location.pathname || '/';
      if (currentPath.startsWith('/admin')) return;

      const currentCount = Math.max(errorCountRef.current, readSessionErrorCount());
      if (currentCount >= MAX_ERRORS_PER_SESSION) {
        errorCountRef.current = currentCount;
        return;
      }

      const nextCount = currentCount + 1;
      errorCountRef.current = nextCount;
      writeSessionErrorCount(nextCount);

      isReportingRef.current = true;
      try {
        getTracker().track('client_error', {
          pagePath: currentPath,
          metadata: payload,
        });
      } catch {
        // Never allow telemetry reporting to throw
      } finally {
        isReportingRef.current = false;
      }
    };

    const onError = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || 'Script error').slice(0, 300);
      const source = String(event.filename || window.location.pathname || '').slice(0, 200);
      const stack = event.error?.stack ? String(event.error.stack).slice(0, 400) : undefined;
      emitClientError({
        kind: 'error',
        message: msg,
        source,
        lineno: typeof event.lineno === 'number' ? event.lineno : undefined,
        colno: typeof event.colno === 'number' ? event.colno : undefined,
        stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const formatted = formatRejectionReason(event.reason);
      emitClientError({
        kind: 'unhandledrejection',
        message: formatted.message,
        source: String(window.location.pathname || '').slice(0, 200),
        stack: formatted.stack,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Client-side safety guard for restricted visitors: prevent viewing product/model routes
    if (typeof window !== 'undefined') {
      const vid = localStorage.getItem('mm_vid');
      if (pathname.startsWith('/products') || pathname.startsWith('/models')) {
        if (isStaticRestrictedVisitor(vid)) {
          window.location.replace('/#contact');
          return;
        }
        checkClientRestrictionStatus(vid).then((restricted) => {
          if (!cancelled && restricted) {
            window.location.replace('/#contact');
          }
        });
      }
    }

    // Never track admin pages or internal dashboard routes
    if (pathname.startsWith('/admin')) {
      return;
    }

    const tracker = getTracker();

    // Flush any pending section dwell from previous page before moving to new page
    tracker.flushSectionDwell();

    // Trigger pageview on route or search params change
    const fullUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    tracker.pageview(fullUrl, document.title);

    // Re-observe sections on the new page
    const timer = setTimeout(() => {
      tracker.observeSections();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  return null;
}
