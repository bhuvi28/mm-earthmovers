'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getTracker } from '@/lib/analytics/tracker';
import { isRestrictedVisitor } from '@/lib/restrictions';

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadRef = useRef(false);

  useEffect(() => {
    // Client-side safety guard for restricted visitors: prevent viewing product/model routes
    if (typeof window !== 'undefined') {
      const vid = localStorage.getItem('mm_vid');
      if (isRestrictedVisitor(vid)) {
        if (pathname.startsWith('/products') || pathname.startsWith('/models')) {
          window.location.replace('/#contact');
          return;
        }
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

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
