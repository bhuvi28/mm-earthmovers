import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats, getProductEnquiryPerformance, getRecentEvents, getVisitorsList, TimeRange } from '@/lib/analytics/stats';
import { isAuthorized, ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Single Unified & Abstract Analytics Hub API
 * All internal views (summary, catalog performance, event stream, visitor journeys, auth)
 * are handled internally under this single endpoint so network inspection reveals no verbose routing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, view, range, key, limit, offset, visitorId, eventType } = body;
    const adminKey = process.env.ADMIN_ANALYTICS_KEY || 'mmearth@2026';

    // 1. Handle Authentication (Login)
    if (action === 'login') {
      if (!key || key !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: adminKey,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
      return response;
    }

    // 2. Handle Logout
    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }

    // 3. All data views require authorization
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeRange = (range || '7d') as TimeRange;

    // 4. Internal View Routing
    switch (view) {
      case 'catalog': {
        const catalogStats = await getProductEnquiryPerformance(timeRange);
        return NextResponse.json(catalogStats);
      }

      case 'events': {
        const eventsData = await getRecentEvents({
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
          visitorId,
          eventType,
        });
        return NextResponse.json({ events: eventsData });
      }

      case 'visitors': {
        const visitorsData = await getVisitorsList(
          limit ? parseInt(limit, 10) : 50,
          offset ? parseInt(offset, 10) : 0
        );
        return NextResponse.json({ visitors: visitorsData });
      }

      case 'summary':
      default: {
        const summaryStats = await getDashboardStats(timeRange);
        return NextResponse.json(summaryStats);
      }
    }
  } catch (error: any) {
    console.error('Analytics unified endpoint error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('v') || 'summary';
  const range = (searchParams.get('r') || '7d') as TimeRange;

  try {
    if (view === 'catalog') {
      const data = await getProductEnquiryPerformance(range);
      return NextResponse.json(data);
    }
    const data = await getDashboardStats(range);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
