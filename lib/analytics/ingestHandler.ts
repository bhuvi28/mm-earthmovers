import { NextRequest, NextResponse } from 'next/server';
import { ingestEvents, IngestPayload, GeoLocation } from '@/lib/analytics/db';
import { evaluateAndRecordFlag } from '@/lib/analytics/flags';
import { tryDecodePayload } from '@/lib/analytics/encoder';
import { extractGeolocation } from '@/lib/analytics/geo';
import { extractClientIp, isVisitorOrIpRestricted } from '@/lib/restrictions-server';
import { runWithOpsContext, runDetachedOpsContext, recordOpsMetric, flushOpsMetrics, OpsOutcome } from './ops';
import { UAParser } from 'ua-parser-js';

export const MAX_TELEMETRY_BODY_BYTES = 65536;
export const MAX_TELEMETRY_BATCH_EVENTS = 50;

const VALID_CLIENT_OPS_OUTCOMES = new Set<OpsOutcome>([
  'ok',
  'rejected',
  'timeout',
  'error',
  'blocked',
  'cache_hit',
  'cache_miss',
]);

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
  return await runWithOpsContext(async () => {
    const startMs = Date.now();
    let batchSize = 0;
    let batchId: string | undefined;
    const origin = req.headers.get('origin');

    const recordReject = (statusCode: number, errorCode: string) => {
      recordOpsMetric({
        metricKind: 'ingest_batch',
        targetName: '/api/analytics',
        statusCode,
        outcome: 'rejected',
        durationMs: Date.now() - startMs,
        batchSize,
        errorCode,
        metadata: batchId ? { batchId } : null,
      });
    };

    try {
      if (!bodyText || !bodyText.trim()) {
        recordReject(400, 'empty_payload');
        return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
      }

      if (Buffer.byteLength(bodyText, 'utf8') > MAX_TELEMETRY_BODY_BYTES) {
        recordReject(413, 'payload_too_large');
        return NextResponse.json(
          { error: 'Telemetry payload exceeds 64 KB limit' },
          { status: 413 }
        );
      }

      // 1. Filter automated crawlers and headless scanners early (zero DB writes)
      const userAgent = req.headers.get('user-agent') || '';
      if (BOT_UA_RE.test(userAgent)) {
        return new NextResponse(null, { status: 204 });
      }

      // 2. Origin / Referer verification
      const referer = req.headers.get('referer');

      if (origin && !isAllowedOriginUrl(origin)) {
        recordReject(403, 'forbidden_origin');
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
      }
      if (!origin && referer && !isAllowedOriginUrl(referer)) {
        recordReject(403, 'forbidden_referer');
        return NextResponse.json({ error: 'Forbidden referer' }, { status: 403 });
      }
      if (process.env.NODE_ENV === 'production' && !origin && !referer) {
        recordReject(403, 'missing_origin');
        return NextResponse.json({ error: 'Missing request origin' }, { status: 403 });
      }

      // 3. Parse JSON wrapper or strict raw obfuscated fallback
      let payloadToDecode = bodyText.trim();
      let parsedJson: any = null;
      if (payloadToDecode.startsWith('{') || payloadToDecode.startsWith('[')) {
        try {
          parsedJson = JSON.parse(payloadToDecode);
        } catch {
          recordReject(400, 'malformed_json');
          return NextResponse.json({ error: 'Malformed JSON telemetry body' }, { status: 400 });
        }
      }

      if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
        if (typeof parsedJson.batchId === 'string' && parsedJson.batchId.trim()) {
          batchId = parsedJson.batchId.trim().slice(0, 64);
        }
        if ('d' in parsedJson) {
          if (typeof parsedJson.d !== 'string' || !parsedJson.d.trim()) {
            recordReject(400, 'invalid_envelope');
            return NextResponse.json({ error: 'Invalid telemetry envelope' }, { status: 400 });
          }
          payloadToDecode = parsedJson.d.trim();
        }
      }

      const decoded = tryDecodePayload(payloadToDecode);
      if (!decoded.ok) {
        recordReject(400, 'decode_failed');
        return NextResponse.json({ error: decoded.error }, { status: 400 });
      }

      if (decoded.events.length === 0) {
        recordReject(400, 'no_events');
        return NextResponse.json({ error: 'No telemetry events provided' }, { status: 400 });
      }

      if (decoded.events.length > MAX_TELEMETRY_BATCH_EVENTS) {
        batchSize = decoded.events.length;
        recordReject(400, 'batch_too_large');
        return NextResponse.json(
          { error: `Batch exceeds limit of ${MAX_TELEMETRY_BATCH_EVENTS} events` },
          { status: 400 }
        );
      }

      const validEvents = decoded.events.filter(isValidEventShape);
      if (validEvents.length === 0) {
        recordReject(400, 'invalid_event_schema');
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

      batchSize = events.length;

      // Split client_ops probes (routed exclusively to analytics_ops_metrics) from behavioral events
      const clientOpsEvents = events.filter((ev) => ev.eventType === 'client_ops');
      const behavioralEvents = events.filter((ev) => ev.eventType !== 'client_ops');

      for (const ev of clientOpsEvents) {
        const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
        const rawTarget = typeof meta.target === 'string' ? meta.target.trim() : '';
        const targetName = (rawTarget || 'client_unknown').slice(0, 96);
        const rawOutcome = typeof meta.outcome === 'string' ? meta.outcome.trim().toLowerCase() : 'error';

        let outcome: OpsOutcome = 'error';
        let errorCode: string | null =
          typeof meta.errorCode === 'string' && meta.errorCode.trim()
            ? meta.errorCode.trim().slice(0, 64)
            : null;

        if (rawOutcome === 'http_error') {
          outcome = 'error';
          errorCode = errorCode || 'http_error';
        } else if (VALID_CLIENT_OPS_OUTCOMES.has(rawOutcome as OpsOutcome)) {
          outcome = rawOutcome as OpsOutcome;
        } else {
          outcome = 'error';
          errorCode = errorCode || (rawOutcome ? rawOutcome.slice(0, 64) : 'error');
        }

        const statusCode =
          typeof meta.statusCode === 'number' && Number.isFinite(meta.statusCode)
            ? Math.round(meta.statusCode)
            : null;
        const durationMs =
          typeof meta.durationMs === 'number' && Number.isFinite(meta.durationMs)
            ? Math.max(0, Math.round(meta.durationMs))
            : 0;

        recordOpsMetric({
          metricKind: 'external_call',
          targetName,
          statusCode,
          outcome,
          durationMs,
          batchSize: 1,
          errorCode,
          metadata: {
            source: 'client_ops',
            pagePath: ev.pagePath || null,
            visitorId: ev.visitorId,
          },
        });
      }

      if (behavioralEvents.length > 0) {
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

        // 5. Persist behavioral events
        await ingestEvents(behavioralEvents, geo, serverParsedMeta, clientIp);

        // 6. Skip nuisance/VIP evaluation on heartbeat-only batches (BUG-14)
        const hasNonHeartbeatEvents = behavioralEvents.some((ev) => ev.eventType !== 'heartbeat');
        if (hasNonHeartbeatEvents) {
          runDetachedOpsContext(() =>
            evaluateAndRecordFlag({
              visitorId: behavioralEvents[0].visitorId,
              sessionId: behavioralEvents[0].sessionId,
              events: behavioralEvents,
              clientIp,
              geo,
              clientMeta: serverParsedMeta,
            })
          ).catch((flagErr) => {
            console.error('[Behavioral Flagging Ingestion Error]', flagErr);
          });
        }
      }

      recordOpsMetric({
        metricKind: 'ingest_batch',
        targetName: '/api/analytics',
        statusCode: 204,
        outcome: 'ok',
        durationMs: Date.now() - startMs,
        batchSize,
        metadata: batchId ? { batchId, clientOpsCount: clientOpsEvents.length } : { clientOpsCount: clientOpsEvents.length },
      });

      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    } catch (error: any) {
      console.error('[Telemetry Ingest Error]', error);
      const errorCode = (
        error?.code
          ? String(error.code)
          : error instanceof Error
          ? error.name
          : 'ingest_error'
      ).slice(0, 64);

      recordOpsMetric({
        metricKind: 'ingest_batch',
        targetName: '/api/analytics',
        statusCode: 500,
        outcome: 'error',
        durationMs: Date.now() - startMs,
        batchSize,
        errorCode,
        metadata: batchId ? { batchId } : null,
      });
      await flushOpsMetrics();

      return NextResponse.json(
        { error: 'Internal error' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    }
  });
}
