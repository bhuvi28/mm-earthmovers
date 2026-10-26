import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats, getProductEnquiryPerformance, getRecentEvents, getVisitorsList, TimeRange } from '@/lib/analytics/stats';
import { isAuthorized, ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';
import { ingestEvents, IngestPayload, GeoLocation, getDbPool } from '@/lib/analytics/db';
import { decodePayload } from '@/lib/analytics/encoder';
import { UAParser } from 'ua-parser-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handle incoming telemetry events from client tracker
 */
async function handleTelemetryIngest(req: NextRequest, rawPayload: any) {
  try {
    // 1. Origin verification (allow mmearthmovers.com, vercel previews, localhost)
    const origin = req.headers.get('origin');
    if (origin) {
      try {
        const originHost = new URL(origin).host.toLowerCase();
        const isAllowed =
          originHost.endsWith('mmearthmovers.com') ||
          originHost.endsWith('vercel.app') ||
          originHost.includes('localhost') ||
          originHost.includes('127.0.0.1');
        if (!isAllowed) {
          return new NextResponse(null, { status: 204 });
        }
      } catch {}
    }

    // 2. Decode payload
    const payloadToDecode = typeof rawPayload === 'string' ? rawPayload : rawPayload.d || JSON.stringify(rawPayload);
    const events: IngestPayload[] = decodePayload(payloadToDecode);

    if (!events || events.length === 0 || !events[0]?.visitorId) {
      return new NextResponse(null, { status: 400 });
    }

    // 3. Extract Geolocation from Vercel / Cloudflare headers
    const headers = req.headers;
    const country =
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      events[0]?.metadata?.clientGeoCountry ||
      undefined;

    const countryCode =
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      events[0]?.metadata?.clientGeoCountryCode ||
      undefined;

    const region =
      headers.get('x-vercel-ip-country-region') ||
      events[0]?.metadata?.clientGeoRegion ||
      undefined;

    const city =
      headers.get('x-vercel-ip-city') ||
      events[0]?.metadata?.clientGeoCity ||
      undefined;

    const geo: GeoLocation = { country, countryCode, region, city };

    // 4. Parse User-Agent
    const userAgent = headers.get('user-agent') || '';
    const parser = new UAParser(userAgent);
    const parsedDevice = parser.getDevice();
    const parsedBrowser = parser.getBrowser();
    const parsedOS = parser.getOS();

    let deviceType = 'desktop';
    if (parsedDevice.type === 'mobile') deviceType = 'mobile';
    else if (parsedDevice.type === 'tablet') deviceType = 'tablet';

    const serverParsedMeta = {
      deviceType,
      browser: parsedBrowser.name ? `${parsedBrowser.name} ${parsedBrowser.major || ''}`.trim() : 'Unknown Browser',
      os: parsedOS.name ? `${parsedOS.name} ${parsedOS.version || ''}`.trim() : 'Unknown OS',
    };

    // 5. Ingest into database
    await ingestEvents(events, geo, serverParsedMeta);

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    console.error('[Telemetry Ingest Error]', error);
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * CORS Preflight Handler
 */
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Single Unified & Abstract Analytics Hub API
 * Handles telemetry ingestion (when { d: "..." } is sent)
 * AND admin queries (when view/action is sent)
 */
export async function POST(req: NextRequest) {
  try {
    let bodyText = await req.text();
    if (!bodyText) {
      return new NextResponse(null, { status: 400 });
    }

    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      // If raw encoded string was sent directly
      body = { d: bodyText };
    }

    // 1. If payload is an obfuscated telemetry batch, ingest it!
    if (body.d || (body.v && body.t)) {
      return await handleTelemetryIngest(req, body.d || body);
    }

    const { action, view, range, key, limit, offset, visitorId, eventType } = body;
    const rawAdminKey = process.env.ADMIN_ANALYTICS_KEY || 'mmearth@2026';
    const cleanAdminKey = rawAdminKey.replace(/^["']|["']$/g, '').trim();

    // 2. Handle Authentication (Login)
    if (action === 'login') {
      const inputKey = (key || '').replace(/^["']|["']$/g, '').trim();
      if (!inputKey || (inputKey !== cleanAdminKey && inputKey !== rawAdminKey)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: cleanAdminKey,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
      return response;
    }

    // 3. Handle Logout
    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }

    // 4. All data views require authorization
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeRange = (range || '7d') as TimeRange;

    // 5. Internal View Routing
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
    return NextResponse.json(
      {
        error: 'Internal error',
        details: error?.message || String(error),
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Status diagnostics endpoint to verify database connectivity on deployment
  if (searchParams.get('check') === 'status') {
    let dbOk = false;
    let dbError = null;
    try {
      const p = getDbPool();
      await p.query('SELECT 1');
      dbOk = true;
    } catch (e: any) {
      dbError = e?.message || String(e);
    }

    return NextResponse.json({
      status: 'ok',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseConnected: dbOk,
      databaseError: dbError,
      hasAdminKey: !!process.env.ADMIN_ANALYTICS_KEY,
    });
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
