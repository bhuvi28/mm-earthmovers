import { NextRequest, NextResponse } from 'next/server';
import {
  getDashboardStats,
  getProductEnquiryPerformance,
  getProductEvents,
  getRecentEvents,
  getVisitorsList,
  getOpsHealthStats,
  getAuditLogs,
  TimeRange,
} from '@/lib/analytics/stats';
import { isAuthorized, verifyAdminKey, createSignedSessionToken, ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';
import { getDbPool, getRestrictions, addRestriction, removeRestriction } from '@/lib/analytics/db';
import { checkLoginRateLimit, recordAuditLog } from '@/lib/analytics/audit';
import { ingestTelemetryRequest } from '@/lib/analytics/ingestHandler';
import { withOpsMetric, flushOpsMetrics } from '@/lib/analytics/ops';
import { extractClientIp, invalidateRestrictionsCache } from '@/lib/restrictions-server';

function apiOutcomeMeta(res?: NextResponse, err?: unknown) {
  if (err) {
    return {
      statusCode: 500,
      outcome: 'error' as const,
      errorCode: err instanceof Error ? err.name.slice(0, 64) : 'Exception',
    };
  }
  if (res) {
    return {
      statusCode: res.status,
      outcome:
        res.status >= 500
          ? ('error' as const)
          : res.status >= 400
          ? ('rejected' as const)
          : ('ok' as const),
    };
  }
  return undefined;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
 * Handles telemetry ingestion (when { d: "..." } or raw encoded batch is sent)
 * AND admin queries (when view/action is sent)
 */
export async function POST(req: NextRequest) {
  try {
    return await withOpsMetric(
      'api_request',
      '/api/analytics',
      async () => {
        try {
          const bodyText = await req.text();
          if (!bodyText || !bodyText.trim()) {
            return new NextResponse(null, { status: 400 });
          }

          const trimmed = bodyText.trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return await ingestTelemetryRequest(req, bodyText);
          }

          let body: any = {};
          try {
            body = JSON.parse(bodyText);
          } catch {
            return await ingestTelemetryRequest(req, bodyText);
          }

          // 1. If payload is an obfuscated/direct telemetry batch, ingest via unified hardened pipeline
          const isAdminEnvelope =
            body &&
            typeof body === 'object' &&
            !Array.isArray(body) &&
            ('view' in body || 'action' in body);
          if (
            Array.isArray(body) ||
            (body &&
              typeof body === 'object' &&
              !isAdminEnvelope &&
              ('d' in body || (body.v && body.t) || ('visitorId' in body && 'eventType' in body)))
          ) {
            return await ingestTelemetryRequest(req, bodyText);
          }

          const clientIp = extractClientIp(req.headers);
          const {
            action,
            view,
            range,
            timeRange: bodyTimeRange,
            key,
            limit,
            offset,
            visitorId,
            eventType,
            ipAddress,
            correlateByIp,
            includeHeartbeat,
            productSlug,
            productTitle,
            partNumber,
            search,
            segment,
            device,
          } = body;

          // 2. Handle Authentication (Login) with rate limit + audit log
          if (action === 'login') {
            const rateLimit = await checkLoginRateLimit(clientIp);
            if (!rateLimit.allowed) {
              await recordAuditLog({
                actorIp: clientIp,
                action: 'login_rate_limited',
                targetType: 'admin_session',
                success: false,
                metadata: {
                  failuresInWindow: rateLimit.failuresInWindow,
                  retryAfterSeconds: rateLimit.retryAfterSeconds,
                },
              });
              return NextResponse.json(
                { error: 'Too many failed login attempts. Please try again later.' },
                {
                  status: 429,
                  headers: {
                    'Retry-After': String(rateLimit.retryAfterSeconds),
                    'Cache-Control': 'private, no-store',
                  },
                }
              );
            }

            if (!verifyAdminKey(key)) {
              await recordAuditLog({
                actorIp: clientIp,
                action: 'login',
                targetType: 'admin_session',
                success: false,
                metadata: { reason: 'invalid_key' },
              });
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const sessionToken = createSignedSessionToken();
            if (!sessionToken) {
              await recordAuditLog({
                actorIp: clientIp,
                action: 'login',
                targetType: 'admin_session',
                success: false,
                metadata: { reason: 'missing_session_secret' },
              });
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            await recordAuditLog({
              actorIp: clientIp,
              action: 'login',
              targetType: 'admin_session',
              success: true,
            });

            const response = NextResponse.json({ success: true });
            response.cookies.set({
              name: ADMIN_COOKIE_NAME,
              value: sessionToken,
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
            await recordAuditLog({
              actorIp: clientIp,
              action: 'logout',
              targetType: 'admin_session',
              success: true,
            });
            const response = NextResponse.json({ success: true });
            response.cookies.delete(ADMIN_COOKIE_NAME);
            return response;
          }

          // 4. All data views require authorization
          if (!isAuthorized(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }

          // Restriction Management Actions
          if (action === 'add_restriction') {
            const targetVal = String(body.value || '').trim();
            if (!targetVal) {
              return NextResponse.json({ error: 'Value is required' }, { status: 400 });
            }
            const targetType = (body.type || (targetVal.includes('.') || targetVal.includes(':') ? 'ip' : 'visitor_id')) as 'ip' | 'visitor_id';
            const created = await addRestriction(targetType, targetVal, body.note);
            invalidateRestrictionsCache();
            await recordAuditLog({
              actorIp: clientIp,
              action: 'add_restriction',
              targetType,
              targetValue: targetVal,
              success: true,
              metadata: { via: '/api/analytics', note: body.note || null, id: created?.id ?? null },
            });
            return NextResponse.json({ success: true, restriction: created });
          }

          if (action === 'remove_restriction') {
            const identifier = body.id || body.value;
            if (!identifier) {
              return NextResponse.json({ error: 'ID or Value is required' }, { status: 400 });
            }
            await removeRestriction(identifier);
            invalidateRestrictionsCache();
            await recordAuditLog({
              actorIp: clientIp,
              action: 'remove_restriction',
              targetType: typeof identifier === 'number' ? 'id' : 'value',
              targetValue: String(identifier),
              success: true,
              metadata: { via: '/api/analytics' },
            });
            return NextResponse.json({ success: true });
          }

          const timeRange = (bodyTimeRange || range || 'today') as TimeRange;

          // 5. Internal View Routing
          switch (view) {
            case 'restrictions': {
              const restrictions = await getRestrictions();
              return NextResponse.json({ restrictions });
            }

            case 'catalog': {
              const catalogStats = await getProductEnquiryPerformance(timeRange);
              return NextResponse.json(catalogStats);
            }

            case 'events': {
              const eventsData = await getRecentEvents({
                limit: limit ? parseInt(limit, 10) : 50,
                offset: offset ? parseInt(offset, 10) : 0,
                visitorId,
                ipAddress: ipAddress ? String(ipAddress).trim() : undefined,
                correlateByIp: correlateByIp !== undefined ? Boolean(correlateByIp) : Boolean(visitorId),
                eventType,
                includeHeartbeat: Boolean(includeHeartbeat),
                timeRange,
              });
              return NextResponse.json({ events: eventsData });
            }

            case 'product_events': {
              if (!productSlug || typeof productSlug !== 'string') {
                return NextResponse.json({ error: 'productSlug is required' }, { status: 400 });
              }
              const productEvents = await getProductEvents({
                slug: productSlug,
                title: typeof productTitle === 'string' ? productTitle : undefined,
                partNumber: typeof partNumber === 'string' ? partNumber : undefined,
                timeRange,
                limit: limit ? parseInt(limit, 10) : 100,
              });
              return NextResponse.json({ events: productEvents });
            }

            case 'visitors': {
              const visitorsResult = await getVisitorsList({
                limit: limit ? parseInt(String(limit), 10) : 100,
                offset: offset ? parseInt(String(offset), 10) : 0,
                timeRange,
                search: typeof search === 'string' ? search : undefined,
                segment: typeof segment === 'string' ? (segment as any) : undefined,
                device: typeof device === 'string' ? (device as any) : undefined,
              });
              return NextResponse.json(visitorsResult);
            }

            case 'ops_health': {
              const opsHealth = await getOpsHealthStats(timeRange);
              return NextResponse.json(opsHealth);
            }

            case 'audit_logs': {
              const auditLogs = await getAuditLogs(
                limit ? parseInt(String(limit), 10) : 50,
                offset ? parseInt(String(offset), 10) : 0
              );
              return NextResponse.json(auditLogs);
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
      },
      apiOutcomeMeta
    );
  } finally {
    await flushOpsMetrics();
  }
}

export async function GET(req: NextRequest) {
  try {
    return await withOpsMetric(
      'api_request',
      '/api/analytics',
      async () => {
        const { searchParams } = new URL(req.url);

        // Status diagnostics endpoint to verify database connectivity on deployment
        if (searchParams.get('check') === 'status') {
          let dbOk = false;
          let dbError: string | null = null;
          try {
            const p = getDbPool();
            await p.query('SELECT 1');
            dbOk = true;
          } catch (e: any) {
            dbError = e?.message || String(e);
          }

          const authorized = isAuthorized(req);
          return NextResponse.json({
            status: 'ok',
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            databaseConnected: dbOk,
            ...(authorized ? { databaseError: dbError } : {}),
            hasAdminKey: !!process.env.ADMIN_ANALYTICS_KEY,
          });
        }

        if (!isAuthorized(req)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const view = searchParams.get('view') || searchParams.get('v') || 'summary';
        const range = (searchParams.get('timeRange') || searchParams.get('r') || 'today') as TimeRange;

        try {
          if (view === 'catalog') {
            const data = await getProductEnquiryPerformance(range);
            return NextResponse.json(data);
          }
          if (view === 'ops_health') {
            const data = await getOpsHealthStats(range);
            return NextResponse.json(data);
          }
          if (view === 'audit_logs') {
            const limitParam = searchParams.get('limit');
            const offsetParam = searchParams.get('offset');
            const data = await getAuditLogs(
              limitParam ? parseInt(limitParam, 10) : 50,
              offsetParam ? parseInt(offsetParam, 10) : 0
            );
            return NextResponse.json(data);
          }
          if (view === 'visitors') {
            const limitParam = searchParams.get('limit');
            const offsetParam = searchParams.get('offset');
            const data = await getVisitorsList({
              limit: limitParam ? parseInt(limitParam, 10) : 100,
              offset: offsetParam ? parseInt(offsetParam, 10) : 0,
              timeRange: range,
              search: searchParams.get('search') || undefined,
              segment: (searchParams.get('segment') as any) || undefined,
              device: (searchParams.get('device') as any) || undefined,
            });
            return NextResponse.json(data);
          }
          const data = await getDashboardStats(range);
          return NextResponse.json(data);
        } catch (err: any) {
          return NextResponse.json({ error: 'Internal error' }, { status: 500 });
        }
      },
      apiOutcomeMeta
    );
  } finally {
    await flushOpsMetrics();
  }
}
