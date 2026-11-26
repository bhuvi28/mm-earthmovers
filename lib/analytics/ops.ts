import { AsyncLocalStorage } from 'async_hooks';
import { getDbPool } from './db';

export type MetricKind =
  | 'ingest_batch'
  | 'api_request'
  | 'db_query'
  | 'external_call'
  | 'middleware_block'
  | 'catalog_cache';

export type OpsOutcome =
  | 'ok'
  | 'rejected'
  | 'timeout'
  | 'error'
  | 'blocked'
  | 'cache_hit'
  | 'cache_miss';

export interface OpsMetricInput {
  metricKind: MetricKind;
  targetName: string;
  statusCode?: number | null;
  outcome: OpsOutcome;
  durationMs?: number;
  batchSize?: number;
  errorCode?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NormalizedOpsMetric {
  metricKind: MetricKind;
  targetName: string;
  statusCode: number | null;
  outcome: OpsOutcome;
  durationMs: number;
  batchSize: number;
  errorCode: string | null;
  metadataJson: string | null;
}

interface OpsBufferStore {
  entries: NormalizedOpsMetric[];
  flushing: boolean;
  closed: boolean;
}

const MAX_BUFFER_ENTRIES = 100;
const FLUSH_TIMEOUT_MS = 250;

const VALID_METRIC_KINDS = new Set<MetricKind>([
  'ingest_batch',
  'api_request',
  'db_query',
  'external_call',
  'middleware_block',
  'catalog_cache',
]);

const VALID_OUTCOMES = new Set<OpsOutcome>([
  'ok',
  'rejected',
  'timeout',
  'error',
  'blocked',
  'cache_hit',
  'cache_miss',
]);

const opsStorage = new AsyncLocalStorage<OpsBufferStore>();

function normalizeMetric(input: OpsMetricInput): NormalizedOpsMetric {
  const metricKind: MetricKind = VALID_METRIC_KINDS.has(input.metricKind)
    ? input.metricKind
    : 'api_request';
  const outcome: OpsOutcome = VALID_OUTCOMES.has(input.outcome)
    ? input.outcome
    : 'error';
  const rawTarget = typeof input.targetName === 'string' ? input.targetName.trim() : '';
  const targetName = (rawTarget || 'unknown').slice(0, 96);

  const statusCode =
    typeof input.statusCode === 'number' && Number.isFinite(input.statusCode)
      ? Math.round(input.statusCode)
      : null;

  const rawDuration = Number(input.durationMs);
  const durationMs = Number.isFinite(rawDuration) ? Math.max(0, Math.round(rawDuration)) : 0;

  const rawBatch = Number(input.batchSize);
  const batchSize = Number.isFinite(rawBatch) ? Math.max(1, Math.round(rawBatch)) : 1;

  const rawErrorCode = typeof input.errorCode === 'string' ? input.errorCode.trim() : '';
  const errorCode = rawErrorCode ? rawErrorCode.slice(0, 64) : null;

  let metadataJson: string | null = null;
  if (input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)) {
    try {
      metadataJson = JSON.stringify(input.metadata);
    } catch {
      metadataJson = null;
    }
  }

  return {
    metricKind,
    targetName,
    statusCode,
    outcome,
    durationMs,
    batchSize,
    errorCode,
    metadataJson,
  };
}

async function flushEntriesToDb(entries: NormalizedOpsMetric[]): Promise<void> {
  if (entries.length === 0 || !process.env.DATABASE_URL) {
    return;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pool = getDbPool();
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const m = entries[i];
      const base = i * 8;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::jsonb)`
      );
      values.push(
        m.metricKind,
        m.targetName,
        m.statusCode,
        m.outcome,
        m.durationMs,
        m.batchSize,
        m.errorCode,
        m.metadataJson
      );
    }

    const sql = `
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
      VALUES ${placeholders.join(', ')}
    `;

    const queryPromise = pool.query(sql, values);
    queryPromise.catch(() => {});

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('ops_flush_timeout')), FLUSH_TIMEOUT_MS);
      if (timer && typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
    });

    await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    // Non-fatal: operational telemetry must never break request handling
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function flushStore(store: OpsBufferStore): Promise<void> {
  if (store.flushing || store.entries.length === 0) {
    return;
  }
  store.flushing = true;
  const batch = store.entries.splice(0, store.entries.length);
  try {
    await flushEntriesToDb(batch);
  } finally {
    store.flushing = false;
  }
}

/**
 * Runs an async operation inside a per-request ops telemetry buffer.
 * Reuses the active store if already inside one; flushes once at the outermost boundary.
 */
export async function runWithOpsContext<T>(fn: () => Promise<T>): Promise<T> {
  const existing = opsStorage.getStore();
  if (existing && !existing.closed) {
    return await fn();
  }

  const store: OpsBufferStore = { entries: [], flushing: false, closed: false };
  return await opsStorage.run(store, async () => {
    try {
      return await fn();
    } finally {
      store.closed = true;
      await flushStore(store);
    }
  });
}

const pendingDetachedOps = new Set<Promise<unknown>>();

/**
 * Detaches from any parent AsyncLocalStorage ops context (e.g. for fire-and-forget
 * background tasks) and runs `fn` inside a fresh, independent ops telemetry context.
 */
export async function runDetachedOpsContext<T>(fn: () => Promise<T>): Promise<T> {
  const promise = opsStorage.exit(async () => {
    return await runWithOpsContext(fn);
  });
  pendingDetachedOps.add(promise);
  try {
    return await promise;
  } finally {
    pendingDetachedOps.delete(promise);
  }
}

/**
 * Waits for any in-flight `runDetachedOpsContext` tasks to settle (with a bounded timeout).
 * Used by test teardown hooks so background DB writes finish before cleanup and pool shutdown.
 */
export async function waitForDetachedOpsContext(timeoutMs = 5000): Promise<void> {
  if (pendingDetachedOps.size === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const all = Promise.allSettled(Array.from(pendingDetachedOps));
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
      if (timer && typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
    });
    await Promise.race([all, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Synchronously appends a metric to the active AsyncLocalStorage request buffer.
 * Safe no-op outside an active request context so synchronous SSG/SSR/tests never touch the DB.
 */
export function recordOpsMetric(input: OpsMetricInput): void {
  const store = opsStorage.getStore();
  if (!store || store.closed || store.flushing || store.entries.length >= MAX_BUFFER_ENTRIES) {
    return;
  }
  store.entries.push(normalizeMetric(input));
}

/**
 * Flushes any buffered metrics in the active request context using a single batched raw pool query.
 * Idempotent and non-fatal.
 */
export async function flushOpsMetrics(): Promise<void> {
  const store = opsStorage.getStore();
  if (!store || store.closed) {
    return;
  }
  await flushStore(store);
}

export interface OpsMetaOverride {
  statusCode?: number;
  outcome?: OpsOutcome;
  batchSize?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as any).name;
  const code = String((err as any).code || '').toUpperCase();
  return name === 'TimeoutError' || name === 'AbortError' || code.includes('TIMEOUT');
}

function extractErrorCode(err: unknown): string {
  if (!err) return 'error';
  if (typeof err === 'object') {
    const code = (err as any).code;
    if (code) return String(code).slice(0, 64);
    const name = (err as any).name;
    if (name) return String(name).slice(0, 64);
  }
  return 'error';
}

/**
 * Instruments an async operation with operational telemetry.
 * Creates an ALS request buffer if none exists and flushes once in `finally` at the outermost boundary.
 */
export async function withOpsMetric<T>(
  kind: MetricKind,
  targetName: string,
  fn: () => Promise<T>,
  metaFn?: (res?: T, err?: unknown) => OpsMetaOverride | undefined
): Promise<T> {
  const existing = opsStorage.getStore();
  const activeExisting = existing && !existing.closed ? existing : undefined;
  const isOutermost = !activeExisting;
  const store: OpsBufferStore = activeExisting || { entries: [], flushing: false, closed: false };

  const execute = async (): Promise<T> => {
    const startMs = Date.now();
    try {
      const res = await fn();
      let meta: OpsMetaOverride | undefined;
      if (metaFn) {
        try {
          meta = metaFn(res, undefined);
        } catch {}
      }

      const inferredStatus =
        res && typeof res === 'object' && typeof (res as any).status === 'number'
          ? (res as any).status
          : null;
      const statusCode = meta?.statusCode !== undefined ? meta.statusCode : inferredStatus;

      const inferredOutcome: OpsOutcome =
        statusCode !== null && statusCode >= 500
          ? 'error'
          : statusCode !== null && statusCode >= 400
          ? 'rejected'
          : 'ok';

      recordOpsMetric({
        metricKind: kind,
        targetName,
        statusCode,
        outcome: meta?.outcome ?? inferredOutcome,
        durationMs: Date.now() - startMs,
        batchSize: meta?.batchSize ?? 1,
        errorCode: meta?.errorCode ?? null,
        metadata: meta?.metadata ?? null,
      });

      return res;
    } catch (err) {
      let meta: OpsMetaOverride | undefined;
      if (metaFn) {
        try {
          meta = metaFn(undefined, err);
        } catch {}
      }

      recordOpsMetric({
        metricKind: kind,
        targetName,
        statusCode: meta?.statusCode ?? null,
        outcome: meta?.outcome ?? (isTimeoutError(err) ? 'timeout' : 'error'),
        durationMs: Date.now() - startMs,
        batchSize: meta?.batchSize ?? 1,
        errorCode: meta?.errorCode ?? extractErrorCode(err),
        metadata: meta?.metadata ?? null,
      });

      throw err;
    }
  };

  if (!isOutermost) {
    return await execute();
  }

  return await opsStorage.run(store, async () => {
    try {
      return await execute();
    } finally {
      store.closed = true;
      await flushStore(store);
    }
  });
}
