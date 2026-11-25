import { NextRequest, NextResponse } from 'next/server';
import { ingestEvents, IngestPayload, GeoLocation } from '@/lib/analytics/db';
import { evaluateAndRecordFlag } from '@/lib/analytics/flags';
import { tryDecodePayload } from '@/lib/analytics/encoder';
import { extractGeolocation } from '@/lib/analytics/geo';
import { extractClientIp, isVisitorOrIpRestricted } from '@/lib/restrictions-server';
import { UAParser } from 'ua-parser-js';

export const MAX_TELEMETRY_BODY_BYTES = 65536;
export const MAX_TELEMETRY_BATCH_EVENTS = 50;

const BOT_UA_RE =
  /bot|crawler|spider|headless|vercel-screenshot|lighthouse|mediapartners|googlebot|bingbot|yandex|baidu|slurp|duckduckbot|petalbot|semrushbot|ahrefsbot|mj12bot|bytespider|gptbot|claudebot|ccbot/i;

function isAllowedOriginUrl(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    return (
      hostname === 'mmearthmovers.com' ||
      hostname.endsWith('.mmearthmovers.com') ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

function isValidEventShape(ev: any): ev is IngestPayload {
  return (
    Boolean(ev) &&
    typeof ev === 'object' &&
    typeof ev.visitorId === 'string' &&
    ev.visitorId.trim().length > 0 &&
    ev.visitorId.length <= 64 &&
    typeof ev.eventType === 'string' &&
    ev.eventType.trim().length > 0 &&
    ev.eventType.length <= 32
  );
}

/**
 * Shared hardened telemetry ingest handler used by both `/api/collect` and `/api/analytics`.
 */
export async function ingestTelemetryRequest(
  req: NextRequest,
  bodyText: string
): Promise<NextResponse> {
  try {
    if (!bodyText || !bodyText.trim()) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    if (Buffer.byteLength(bodyText, 'utf8') > MAX_TELEMETRY_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Telemetry payload exceeds 64 KB limit' },
        { status: 413 }
      );
    }

    // 1. Filter automated crawlers and headless scanners early
    const userAgent = req.headers.get('user-agent') || '';
    if (BOT_UA_RE.test(userAgent)) {
      return new NextResponse(null, { status: 204 });
    }

    // 2. Origin / Referer verification
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');

    if (origin && !isAllowedOriginUrl(origin)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    if (!origin && referer && !isAllowedOriginUrl(referer)) {
      return NextResponse.json({ error: 'Forbidden referer' }, { status: 403 });
    }
    if (process.env.NODE_ENV === 'production' && !origin && !referer) {
      return NextResponse.json({ error: 'Missing request origin' }, { status: 403 });
    }

    // 3. Parse JSON wrapper or strict raw obfuscated fallback
    let payloadToDecode = bodyText.trim();
    let parsedJson: any = null;
    if (payloadToDecode.startsWith('{') || payloadToDecode.startsWith('[')) {
      try {
        parsedJson = JSON.parse(payloadToDecode);
      } catch {
        return NextResponse.json({ error: 'Malformed JSON telemetry body' }, { status: 400 });
      }
    }

    if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson) && 'd' in parsedJson) {
      if (typeof parsedJson.d !== 'string' || !parsedJson.d.trim()) {
        return NextResponse.json({ error: 'Invalid telemetry envelope' }, { status: 400 });
      }
      payloadToDecode = parsedJson.d.trim();
    }

    const decoded = tryDecodePayload(payloadToDecode);
    if (!decoded.ok) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }

    if (decoded.events.length === 0) {
      return NextResponse.json({ error: 'No telemetry events provided' }, { status: 400 });
    }

    if (decoded.events.length > MAX_TELEMETRY_BATCH_EVENTS) {
      return NextResponse.json(
        { error: `Batch exceeds limit of ${MAX_TELEMETRY_BATCH_EVENTS} events` },
        { status: 400 }
      );
    }

    const validEvents = decoded.events.filter(isValidEventShape);
    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'Invalid telemetry event schema' }, { status: 400 });
    }

    // Never track admin sessions into public analytics
    let events = validEvents.filter((ev) => !ev.pagePath?.startsWith('/admin'));
    if (events.length === 0) {
      return new NextResponse(null, { status: 204 });
    }

    const clientIp = extractClientIp(req.headers);
    const firstVisitorId = events[0].visitorId;
    if (await isVisitorOrIpRestricted(firstVisitorId, clientIp)) {
      console.warn(
        `[Restricted Visitor Ingest] Visitor ID: ${firstVisitorId} | Real IP: ${clientIp || 'unknown'}`
      );
      events = events.filter(
        (ev) => !ev.pagePath?.startsWith('/products') && !ev.pagePath?.startsWith('/models')
      );
      if (events.length === 0) {
        return new NextResponse(null, { status: 204 });
      }
    }

    // 4. Geolocation & User-Agent enrichment
    const geo: GeoLocation = await extractGeolocation(req.headers);
    const parser = new UAParser(userAgent);
    const parsedDevice = parser.getDevice();
    const parsedBrowser = parser.getBrowser();
    const parsedOS = parser.getOS();

    let deviceType = 'desktop';
    if (parsedDevice.type === 'mobile') deviceType = 'mobile';
    else if (parsedDevice.type === 'tablet') deviceType = 'tablet';

    const serverParsedMeta = {
      deviceType,
      browser: parsedBrowser.name
        ? `${parsedBrowser.name} ${parsedBrowser.major || ''}`.trim()
        : 'Unknown Browser',
      os: parsedOS.name
        ? `${parsedOS.name} ${parsedOS.version || ''}`.trim()
        : 'Unknown OS',
    };

    // 5. Persist events
    await ingestEvents(events, geo, serverParsedMeta, clientIp);

    // 6. Skip nuisance/VIP evaluation on heartbeat-only batches (BUG-14)
    const hasNonHeartbeatEvents = events.some((ev) => ev.eventType !== 'heartbeat');
    if (hasNonHeartbeatEvents) {
      evaluateAndRecordFlag({
        visitorId: events[0].visitorId,
        sessionId: events[0].sessionId,
        events,
        clientIp,
        geo,
        clientMeta: serverParsedMeta,
      }).catch((flagErr) => {
        console.error('[Behavioral Flagging Ingestion Error]', flagErr);
      });
    }

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
