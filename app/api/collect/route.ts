import { NextRequest, NextResponse } from 'next/server';
import { ingestEvents, IngestPayload, GeoLocation } from '@/lib/analytics/db';
import { decodePayload } from '@/lib/analytics/encoder';
import { UAParser } from 'ua-parser-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Origin / Host verification for security
    const host = req.headers.get('host') || '';
    const origin = req.headers.get('origin');
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host && !originHost.includes('localhost') && !originHost.includes('127.0.0.1')) {
        return new NextResponse(null, { status: 403 });
      }
    }

    // 2. Parse body (supports obfuscated string in { d: "..." } or raw string)
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

    // Return 204 No Content for minimum overhead and standard stealth telemetry
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Collect error:', error);
    return new NextResponse(null, { status: 204 }); // Still return 204 to client
  }
}
