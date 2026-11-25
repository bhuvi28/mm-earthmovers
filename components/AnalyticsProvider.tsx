'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getTracker } from '@/lib/analytics/tracker';
import { isStaticRestrictedVisitor, checkClientRestrictionStatus } from '@/lib/restrictions-static';

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadRef = useRef(false);

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
