import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalSecret } from '@/lib/analytics/auth';
import { getDbPool } from '@/lib/analytics/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLUSH_TIMEOUT_MS = 250;
const ALLOWED_OUTCOMES = new Set(['blocked', 'error', 'rejected', 'timeout', 'ok']);

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!verifyInternalSecret(secret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      {
        status: 400,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Invalid payload' },
      {
        status: 400,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  const targetName =
    typeof body.targetName === 'string' ? body.targetName.trim().slice(0, 96) : '';
  if (!targetName) {
    return NextResponse.json(
      { error: 'targetName is required' },
      {
        status: 400,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  const rawOutcome = typeof body.outcome === 'string' ? body.outcome.trim().toLowerCase() : 'blocked';
  const outcome = ALLOWED_OUTCOMES.has(rawOutcome) ? rawOutcome : 'blocked';

  const statusCode =
    typeof body.statusCode === 'number' && Number.isFinite(body.statusCode)
      ? Math.round(body.statusCode)
      : null;

  const rawDuration = Number(body.durationMs);
  const durationMs = Number.isFinite(rawDuration) ? Math.max(0, Math.round(rawDuration)) : 0;

  const errorCode =
    typeof body.errorCode === 'string' && body.errorCode.trim()
      ? body.errorCode.trim().slice(0, 64)
      : null;

  let metadataJson: string | null = null;
  if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
    try {
      metadataJson = JSON.stringify(body.metadata);
    } catch {
      metadataJson = null;
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (process.env.DATABASE_URL) {
      const pool = getDbPool();
      const queryPromise = pool.query(
        `
        INSERT INTO analytics_ops_metrics (
          metric_kind,
          target_name,
          status_code,
          outcome,
          duration_ms,
          batch_size,
          error_code,
          metadata
        )
        VALUES ('middleware_block', $1, $2, $3, $4, 1, $5, $6::jsonb)
        `,
        [targetName, statusCode, outcome, durationMs, errorCode, metadataJson]
      );
      queryPromise.catch(() => {});

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('ops_block_timeout')), FLUSH_TIMEOUT_MS);
        if (timer && typeof (timer as any).unref === 'function') {
          (timer as any).unref();
        }
      });

      await Promise.race([queryPromise, timeoutPromise]);
    }
  } catch {
    // Non-fatal: Edge block telemetry must never fail closed or raise
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
