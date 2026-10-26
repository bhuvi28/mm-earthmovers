import { NextRequest, NextResponse } from 'next/server';
import { ingestEvents, IngestPayload, GeoLocation } from '@/lib/analytics/db';
import { decodePayload } from '@/lib/analytics/encoder';
import { UAParser } from 'ua-parser-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function POST(req: NextRequest) {
  try {
    // 1. Origin verification
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

    // 2. Parse body
    let bodyText = await req.text();
    if (!bodyText) {
      return new NextResponse(null, { status: 400 });
    }

    let payloadToDecode = bodyText;
    try {
      const parsedJson = JSON.parse(bodyText);
      if (parsedJson && parsedJson.d) {
        payloadToDecode = parsedJson.d;
      }
    } catch {
      // Body is raw encoded text
    }

    const rawEvents: IngestPayload[] = decodePayload(payloadToDecode);
    const events: IngestPayload[] = rawEvents.filter((ev) => !ev.pagePath?.startsWith('/admin'));

    if (!events || events.length === 0 || !events[0]?.visitorId) {
      return new NextResponse(null, { status: 204 });
    }

    // 3. Extract Geolocation
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
    console.error('[Collect Ingest Error]', error);
    return new NextResponse(null, { status: 204 });
  }
}
