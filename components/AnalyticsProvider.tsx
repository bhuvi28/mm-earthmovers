'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getTracker } from '@/lib/analytics/tracker';

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadRef = useRef(false);

  useEffect(() => {
    // Never track admin pages or internal dashboard routes
    if (pathname.startsWith('/admin')) {
      return;
    }

    const tracker = getTracker();

    // Trigger pageview on route or search params change
    const fullUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    tracker.pageview(fullUrl, document.title);
  }, [pathname, searchParams]);

  return null;
}
