import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Load .env.local if present
try {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        const val = (match[2] || '').replace(/^['"]|['"]$/g, '').trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

// Resolve `@/*` alias and transpile `.ts` for Node test runner
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.resolve(request.slice(2));
    return originalResolveFilename.call(this, mapped, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = (module, filename) => {
  const code = fs.readFileSync(filename, 'utf8');
  const js = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(js, filename);
};

const { NextRequest } = require('next/server');
const authModule = require('../../lib/analytics/auth.ts');
const dbModule = require('../../lib/analytics/db.ts');
const trackerModule = require('../../lib/analytics/tracker.ts');
const ingestModule = require('../../lib/analytics/ingestHandler.ts');
const opsModule = require('../../lib/analytics/ops.ts');
const alertModule = require('../../lib/analytics/alert.ts');
const geoModule = require('../../lib/analytics/geo.ts');
const encoderModule = require('../../lib/analytics/encoder.ts');
const clustersModule = require('../../lib/analytics/clusters.ts');
const statsModule = require('../../lib/analytics/stats.ts');
const productsModule = require('../../lib/products.ts');
const utilsModule = require('../../lib/utils.ts');
const restrictionsServer = require('../../lib/restrictions-server.ts');
const middlewareModule = require('../../middleware.ts');
const opsBlockRoute = require('../../app/api/internal/ops-block/route.ts');
const analyticsRoute = require('../../app/api/analytics/route.ts');
const leadsRoute = require('../../app/api/leads/route.ts');
const searchRoute = require('../../app/api/products/search/route.ts');
const flagsRoute = require('../../app/api/flags/route.ts');
const restrictionsRoute = require('../../app/api/restrictions/route.ts');

const RUN_ID = Date.now();
const TEST_IP = '198.51.100.88';

function createMemoryStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
  };
}

function createFakeElement(attrs = {}, text = '') {
  const attrMap = new Map(Object.entries(attrs));
  return {
    tagName: (attrs.tagName || 'A').toUpperCase(),
    innerText: text,
    className: attrs.className || '',
    getAttribute(name) {
      return attrMap.has(name) ? attrMap.get(name) : null;
    },
    closest(selector) {
      const parts = selector.split(',').map((s) => s.trim());
      for (const part of parts) {
        if (part === 'a' && this.tagName === 'A') return this;
        if (part === 'button' && this.tagName === 'BUTTON') return this;
        if (part === '[data-track]' && attrMap.has('data-track')) return this;
        if (part === '[data-product-title]' && attrMap.has('data-product-title')) return this;
      }
      return null;
    },
  };
}

function setupMockBrowserEnv({ pathname = '/products/loader/test-part', title = 'Test Page' } = {}) {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevNavigator = globalThis.navigator;
  const prevLocalStorage = globalThis.localStorage;
  const prevSessionStorage = globalThis.sessionStorage;
  const prevIntersectionObserver = globalThis.IntersectionObserver;

  const localStorageMock = createMemoryStorage();
  const sessionStorageMock = createMemoryStorage();
  const docListeners = new Map();
  const winListeners = new Map();

  const mockDocument = {
    title,
    cookie: '',
    referrer: '',
    visibilityState: 'visible',
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = docListeners.get(type) || [];
      docListeners.set(
        type,
        list.filter((item) => item !== fn)
      );
    },
    querySelectorAll() {
      return [];
    },
  };

  const mockWindow = {
    location: { pathname, search: '', origin: 'http://localhost:3000' },
    screen: { width: 1280, height: 800 },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = winListeners.get(type) || [];
      winListeners.set(
        type,
        list.filter((item) => item !== fn)
      );
    },
  };

  const mockNavigator = {
    webdriver: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0',
    language: 'en-IN',
  };

  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', { value: mockDocument, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'navigator', { value: mockNavigator, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: MockIntersectionObserver,
    configurable: true,
    writable: true,
  });

  return {
    localStorageMock,
    sessionStorageMock,
    docListeners,
    restore() {
      const restoreProp = (prop, prev) => {
        if (prev === undefined) {
          delete globalThis[prop];
        } else {
          Object.defineProperty(globalThis, prop, {
            value: prev,
            configurable: true,
            writable: true,
          });
        }
      };
      restoreProp('window', prevWindow);
      restoreProp('document', prevDocument);
      restoreProp('navigator', prevNavigator);
      restoreProp('localStorage', prevLocalStorage);
      restoreProp('sessionStorage', prevSessionStorage);
      restoreProp('IntersectionObserver', prevIntersectionObserver);
    },
  };
}

async function flushMicrotasks(rounds = 8) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('P2 Release Verification Suite', () => {
  let testStartedAt;

  before(async () => {
    const startRow = await dbModule.query('SELECT NOW() AS started_at');
    testStartedAt = startRow[0].started_at;
    // Pre-run stale-sweep for any leftover p2-test-% rows from an aborted prior run
    try {
      await dbModule.query("DELETE FROM analytics_leads WHERE visitor_id LIKE 'p2-test-%' OR contact LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_flags WHERE LOWER(target_value) LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_audit_logs WHERE LOWER(COALESCE(target_value, '')) LIKE 'p2-test-%'");
      await dbModule.query(
        "DELETE FROM analytics_alert_deliveries WHERE dedupe_key LIKE 'p2-test-%' OR visitor_id LIKE 'p2-test-%'"
      );
      await dbModule.query(
        `DELETE FROM analytics_ops_metrics
         WHERE target_name LIKE 'p2-test-%'
            OR COALESCE(metadata->>'visitorId', '') LIKE 'p2-test-%'
            OR COALESCE(metadata->>'batchId', '') LIKE 'p2-test-%'
            OR (metric_kind = 'middleware_block' AND COALESCE(metadata->>'pathname', '') LIKE '%p2-test-%')`
      );
    } catch {}
  });

  after(async () => {
    try {
      await opsModule.waitForDetachedOpsContext();
      await dbModule.query("DELETE FROM analytics_leads WHERE visitor_id LIKE 'p2-test-%' OR contact LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p2-test-%'");
      await dbModule.query("DELETE FROM analytics_flags WHERE LOWER(target_value) LIKE 'p2-test-%'");
      await dbModule.query(
        "DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p2-test-%' OR value = $1",
        [TEST_IP]
      );
      await dbModule.query(
        "DELETE FROM analytics_audit_logs WHERE actor_ip = $1 OR LOWER(COALESCE(target_value, '')) LIKE 'p2-test-%'",
        [TEST_IP]
      );
      await dbModule.query(
        "DELETE FROM analytics_alert_deliveries WHERE dedupe_key LIKE 'p2-test-%' OR visitor_id LIKE 'p2-test-%'"
      );
      await dbModule.query(
        `DELETE FROM analytics_ops_metrics
         WHERE target_name LIKE 'p2-test-%'
            OR COALESCE(metadata->>'visitorId', '') LIKE 'p2-test-%'
            OR COALESCE(metadata->>'batchId', '') LIKE 'p2-test-%'
            OR (metric_kind = 'middleware_block' AND COALESCE(metadata->>'pathname', '') LIKE '%p2-test-%')
            OR (created_at >= $1 AND metric_kind = 'middleware_block' AND target_name IN ('visitor_id', 'ip', 'visitor_id+ip') AND COALESCE(metadata->>'pathname', '') = '/api/products/search')
            OR (created_at >= $1 AND target_name IN (
              '/api/analytics',
              '/api/leads',
              '/api/products/search',
              '/api/flags',
              '/api/restrictions',
              'products_catalog',
              'ip_api',
              'staticforms',
              'alert_webhook',
              'ntfy_sh',
              'resend_email',
              'stats_dashboard_summary',
              'stats_dashboard_behavior',
              'stats_dashboard_sentinel',
              'stats_visitors_list',
              'stats_recent_events',
              'stats_recent_events_ip_lookup',
              'stats_product_events',
              'stats_catalog_clicks',
              'stats_catalog_views',
              'stats_catalog_gaps',
              'stats_ops_metrics',
              'stats_ops_alerts',
              'stats_ops_events',
              'stats_audit_logs'
            ))`,
        [testStartedAt]
      );
    } catch {}
    try {
      restrictionsServer.invalidateRestrictionsCache();
      productsModule.invalidateProductsCache();
      await dbModule.getDbPool().end();
    } catch {}
  });

  it('OBS-01: enforces <= 49,152 byte chunking, FIFO-50 mm_retry_queue, 2s/8s/30s backoff, next-load drain, no-retry on 400/403/413, and all P2 event types', async (t) => {
    assert.strictEqual(trackerModule.MAX_TELEMETRY_UPLOAD_BYTES, 49152);
    assert.strictEqual(trackerModule.MAX_TELEMETRY_BATCH_EVENTS, 50);
    assert.strictEqual(trackerModule.RETRY_QUEUE_STORAGE_KEY, 'mm_retry_queue');
    assert.strictEqual(trackerModule.MAX_RETRY_QUEUE_EVENTS, 50);

    // 1. Byte chunking & oversized single-event truncation
    const largeBatch = Array.from({ length: 30 }, (_, idx) => ({
      visitorId: `p2-test-chunk-${idx}`,
      sessionId: `p2-test-chunk-s-${idx}`,
      eventType: 'click',
      pagePath: `/products/loader/item-${idx}`,
      metadata: { payloadPad: 'x'.repeat(1600), idx },
    }));
    const chunks = trackerModule.chunkEventsForUpload(largeBatch);
    assert.ok(chunks.length >= 2, `Expected multi-chunk split, got ${chunks.length}`);
    for (const chunk of chunks) {
      assert.ok(
        Buffer.byteLength(chunk.payload, 'utf8') <= 49152,
        `Chunk exceeded 49152 bytes: ${Buffer.byteLength(chunk.payload, 'utf8')}`
      );
      assert.ok(chunk.events.length <= 50);
    }

    const oversizedSingle = [
      {
        visitorId: 'p2-test-oversized-v1',
        sessionId: 'p2-test-oversized-s1',
        eventType: 'client_error',
        pagePath: '/products/test',
        metadata: { hugeStack: 'E'.repeat(65000) },
      },
    ];
    const truncatedChunks = trackerModule.chunkEventsForUpload(oversizedSingle);
    assert.strictEqual(truncatedChunks.length, 1);
    assert.ok(Buffer.byteLength(truncatedChunks[0].payload, 'utf8') <= 49152);

    // 2. Retry queue FIFO cap 50, [2000, 8000, 30000] backoff, next-load drain, and non-retry on 400/403/413
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const browserEnv = setupMockBrowserEnv();
    const prevFetch = globalThis.fetch;

    try {
      let fetchStatus = 500;
      const fetchCalls = [];
      globalThis.fetch = async (url, init) => {
        fetchCalls.push({ url, body: init?.body });
        return new Response(null, { status: fetchStatus });
      };

      const tracker = new trackerModule.AnalyticsTracker();
      for (let i = 0; i < 55; i++) {
        tracker.track('click', {
          pagePath: `/p2-test-retry/${i}`,
          metadata: { seq: i },
        });
      }
      tracker.flush(false);
      await flushMicrotasks();

      const storedAfterFail = JSON.parse(
        browserEnv.localStorageMock.getItem(trackerModule.RETRY_QUEUE_STORAGE_KEY) || '[]'
      );
      assert.strictEqual(storedAfterFail.length, 50, 'Retry queue must enforce FIFO cap of 50');
      assert.strictEqual(storedAfterFail[0].metadata.seq, 5, 'Oldest 5 events should be evicted FIFO');
      assert.strictEqual(storedAfterFail[49].metadata.seq, 54);

      const initialCalls = fetchCalls.length;
      // Retry 1 after 2000ms (still 500 -> schedules 8000ms)
      t.mock.timers.tick(1999);
      await flushMicrotasks();
      assert.strictEqual(fetchCalls.length, initialCalls);
      t.mock.timers.tick(1);
      await flushMicrotasks();
      assert.ok(fetchCalls.length > initialCalls, 'Expected 1st retry after 2000ms');

      // Retry 2 after 8000ms (still 500 -> schedules 30000ms)
      const callsAfterRetry1 = fetchCalls.length;
      t.mock.timers.tick(7999);
      await flushMicrotasks();
      assert.strictEqual(fetchCalls.length, callsAfterRetry1);
      t.mock.timers.tick(1);
      await flushMicrotasks();
      assert.ok(fetchCalls.length > callsAfterRetry1, 'Expected 2nd retry after 8000ms');

      // Retry 3 after 30000ms (now return 204 -> clears queue)
      const callsAfterRetry2 = fetchCalls.length;
      fetchStatus = 204;
      t.mock.timers.tick(29999);
      await flushMicrotasks();
      assert.strictEqual(fetchCalls.length, callsAfterRetry2);
      t.mock.timers.tick(1);
      await flushMicrotasks();
      assert.ok(fetchCalls.length > callsAfterRetry2, 'Expected 3rd retry after 30000ms');
      assert.strictEqual(
        browserEnv.localStorageMock.getItem(trackerModule.RETRY_QUEUE_STORAGE_KEY),
        null,
        'Successful retry must clear mm_retry_queue'
      );

      // Next-load drain on fresh AnalyticsTracker instantiation
      const preseeded = [
        {
          visitorId: 'p2-test-nextload-v1',
          sessionId: 'p2-test-nextload-s1',
          eventType: 'placeholder_impression',
          pagePath: '/products',
          metadata: { productSlug: 'test-sku', hasImage: false },
        },
      ];
      browserEnv.localStorageMock.setItem(
        trackerModule.RETRY_QUEUE_STORAGE_KEY,
        JSON.stringify(preseeded)
      );
      const callsBeforeDrain = fetchCalls.length;
      new trackerModule.AnalyticsTracker();
      await flushMicrotasks();
      assert.ok(fetchCalls.length > callsBeforeDrain, 'Fresh tracker init must drain mm_retry_queue');
      assert.strictEqual(
        browserEnv.localStorageMock.getItem(trackerModule.RETRY_QUEUE_STORAGE_KEY),
        null
      );

      // Non-retry on 400 / 403 / 413
      for (const rejectStatus of [400, 403, 413]) {
        fetchStatus = rejectStatus;
        const rejectTracker = new trackerModule.AnalyticsTracker();
        rejectTracker.track('click', { pagePath: `/p2-test-reject/${rejectStatus}` });
        rejectTracker.flush(false);
        await flushMicrotasks();
        assert.strictEqual(
          browserEnv.localStorageMock.getItem(trackerModule.RETRY_QUEUE_STORAGE_KEY),
          null,
          `HTTP ${rejectStatus} must not enqueue mm_retry_queue`
        );
      }

      // Verify all P2 AnalyticsEventType values exist in tracker.ts
      const trackerSrc = fs.readFileSync(path.resolve('lib/analytics/tracker.ts'), 'utf8');
      const expectedTypes = [
        'placeholder_impression',
        'image_zoom',
        'spec_toggle',
        'related_product_click',
        'export_banner_view',
        'client_ops',
        'model_faq_accordion_toggle',
        'model_sibling_switcher_card',
        'video_play',
        'video_switch',
        'video_complete',
        'loading_screen_timing',
        'client_error',
        'not_found',
      ];
      for (const eventType of expectedTypes) {
        assert.ok(trackerSrc.includes(`'${eventType}'`), `Missing AnalyticsEventType '${eventType}'`);
      }
    } finally {
      globalThis.fetch = prevFetch;
      browserEnv.restore();
      t.mock.timers.reset();
    }
  });

  it('tracker.ts setupAutoClickTracking: dispatches typed related_product_click & model_sibling_switcher_card without double-firing click, and suppresses click on accordions', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const browserEnv = setupMockBrowserEnv({ pathname: '/products/loader/source-loader-pump' });
    const prevFetch = globalThis.fetch;

    try {
      globalThis.fetch = async () => new Response(null, { status: 204 });
      const tracker = new trackerModule.AnalyticsTracker();
      const recorded = [];
      const origTrack = tracker.track.bind(tracker);
      tracker.track = (eventType, dataOrMetadata, extra) => {
        recorded.push({ eventType, dataOrMetadata, extra });
        return origTrack(eventType, dataOrMetadata, extra);
      };

      const clickListeners = browserEnv.docListeners.get('click') || [];
      assert.ok(clickListeners.length >= 1, 'Expected click listener registered');
      const onDocClick = clickListeners[clickListeners.length - 1];

      // 1. related_product_click
      const relatedEl = createFakeElement(
        {
          tagName: 'A',
          href: '/products/loader/target-seal-kit',
          'data-track': 'related_product_click',
          'data-source-slug': 'source-loader-pump',
          'data-product-slug': 'target-seal-kit',
          'data-target-title': 'Target Seal Kit',
          'data-target-part-number': 'PN-8899',
          'data-position': '2',
          'data-heading': 'Similar Products',
        },
        'Target Seal Kit'
      );
      onDocClick({ target: relatedEl });

      const relatedEvents = recorded.filter((r) => r.eventType === 'related_product_click');
      assert.strictEqual(relatedEvents.length, 1);
      assert.strictEqual(recorded.filter((r) => r.eventType === 'click').length, 0);
      assert.strictEqual(relatedEvents[0].dataOrMetadata.metadata.sourceProductSlug, 'source-loader-pump');
      assert.strictEqual(relatedEvents[0].dataOrMetadata.metadata.targetProductSlug, 'target-seal-kit');
      assert.strictEqual(relatedEvents[0].dataOrMetadata.metadata.targetTitle, 'Target Seal Kit');
      assert.strictEqual(relatedEvents[0].dataOrMetadata.metadata.targetPartNumber, 'PN-8899');
      assert.strictEqual(relatedEvents[0].dataOrMetadata.metadata.position, 2);

      // 2. model_sibling_switcher_card
      recorded.length = 0;
      const siblingEl = createFakeElement(
        {
          tagName: 'A',
          href: '/models/hm-2021',
          'data-track': 'model_sibling_switcher_card',
          'data-source-machine-slug': 'hm-2071',
          'data-target-machine-slug': 'hm-2021',
          'data-machine-name': 'HM 2021 Wheel Loader',
          'data-position': '1',
        },
        'HM 2021 Wheel Loader'
      );
      onDocClick({ target: siblingEl });

      const siblingEvents = recorded.filter((r) => r.eventType === 'model_sibling_switcher_card');
      assert.strictEqual(siblingEvents.length, 1);
      assert.strictEqual(recorded.filter((r) => r.eventType === 'click').length, 0);
      assert.strictEqual(siblingEvents[0].dataOrMetadata.metadata.sourceMachineSlug, 'hm-2071');
      assert.strictEqual(siblingEvents[0].dataOrMetadata.metadata.targetMachineSlug, 'hm-2021');
      assert.strictEqual(siblingEvents[0].dataOrMetadata.metadata.targetMachineName, 'HM 2021 Wheel Loader');
      assert.strictEqual(siblingEvents[0].dataOrMetadata.metadata.position, 1);

      // 3. Accordion click suppression (model_faq_accordion_toggle & spec_toggle)
      recorded.length = 0;
      const faqEl = createFakeElement({ tagName: 'SUMMARY', 'data-track': 'model_faq_accordion_toggle' }, 'FAQ Q1');
      const specEl = createFakeElement({ tagName: 'SUMMARY', 'data-track': 'spec_toggle' }, 'Product Details');
      onDocClick({ target: faqEl });
      onDocClick({ target: specEl });
      assert.strictEqual(recorded.filter((r) => r.eventType === 'click').length, 0);
    } finally {
      globalThis.fetch = prevFetch;
      browserEnv.restore();
      t.mock.timers.reset();
    }
  });

  it('OBS-01 & OBS-04: routes client_ops to analytics_ops_metrics, excludes from analytics_events, records ingest_batch, and returns sanitized 500 on DB error', async () => {
    const vid = `p2-test-clientops-${RUN_ID}`;
    const sid = `${vid}-s1`;
    const batchId = `p2-test-batch-${RUN_ID}`;

    const encoded = encoderModule.encodePayload([
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'client_ops',
        pagePath: '/products',
        metadata: {
          target: 'ipapi_co',
          outcome: 'http_error',
          statusCode: 429,
          durationMs: 142,
        },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'pageview',
        pagePath: '/products',
      },
    ]);

    const res = await analyticsRoute.POST(
      new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ d: encoded, batchId }),
      })
    );
    assert.strictEqual(res.status, 204);

    const eventRows = await dbModule.query(
      'SELECT event_type FROM analytics_events WHERE visitor_id = $1',
      [vid]
    );
    assert.strictEqual(eventRows.some((r) => r.event_type === 'client_ops'), false);
    assert.strictEqual(eventRows.some((r) => r.event_type === 'pageview'), true);

    const opsRows = await dbModule.query(
      `SELECT metric_kind, target_name, status_code, outcome, duration_ms, error_code, metadata
       FROM analytics_ops_metrics
       WHERE created_at >= $1
         AND (metadata->>'visitorId' = $2 OR metadata->>'batchId' = $3)
       ORDER BY id ASC`,
      [testStartedAt, vid, batchId]
    );
    const clientOpsRow = opsRows.find(
      (r) => r.metric_kind === 'external_call' && r.target_name === 'ipapi_co'
    );
    assert.ok(clientOpsRow, 'Expected client_ops row in analytics_ops_metrics');
    assert.strictEqual(clientOpsRow.outcome, 'error');
    assert.strictEqual(clientOpsRow.error_code, 'http_error');
    assert.strictEqual(Number(clientOpsRow.status_code), 429);
    assert.strictEqual(Number(clientOpsRow.duration_ms), 142);

    const ingestRow = opsRows.find(
      (r) => r.metric_kind === 'ingest_batch' && r.target_name === '/api/analytics'
    );
    assert.ok(ingestRow, 'Expected ingest_batch row in analytics_ops_metrics');
    assert.strictEqual(ingestRow.outcome, 'ok');

    // Sanitized 500 on DB failure
    const pool = dbModule.getDbPool();
    const hadOwnConnect = Object.prototype.hasOwnProperty.call(pool, 'connect');
    const origConnect = pool.connect;
    pool.connect = (cb) => {
      const err = new Error('ECONNREFUSED secret_pg_host_10_0_0_99');
      if (typeof cb === 'function') {
        queueMicrotask(() => cb(err));
        return;
      }
      return Promise.reject(err);
    };
    try {
      const failBody = JSON.stringify({
        d: encoderModule.encodePayload([
          { visitorId: `${vid}-dbfail`, sessionId: `${sid}-dbfail`, eventType: 'pageview', pagePath: '/products' },
        ]),
      });
      const failRes = await ingestModule.ingestTelemetryRequest(
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
          body: failBody,
        }),
        failBody
      );
      assert.strictEqual(failRes.status, 500);
      const failJson = await failRes.json();
      assert.deepStrictEqual(failJson, { error: 'Internal error' });
    } finally {
      if (hadOwnConnect) {
        pool.connect = origConnect;
      } else {
        delete pool.connect;
      }
    }
  });

  it('OBS-02: non-recursive withOpsMetric, 250ms flush timeout tolerance, and API/external/cache instrumentation', async () => {
    // 1. No-op outside ALS
    const outsideTarget = `p2-test-outside-als-${RUN_ID}`;
    opsModule.recordOpsMetric({
      metricKind: 'db_query',
      targetName: outsideTarget,
      outcome: 'ok',
      durationMs: 5,
    });
    const outsideRows = await dbModule.query(
      'SELECT id FROM analytics_ops_metrics WHERE target_name = $1',
      [outsideTarget]
    );
    assert.strictEqual(outsideRows.length, 0);

    // 2. 250ms flush timeout tolerance without throwing or leaking dangling promise
    const pool = dbModule.getDbPool();
    const hadOwnQuery = Object.prototype.hasOwnProperty.call(pool, 'query');
    const origQuery = pool.query;
    let releaseDelayedQuery;
    const delayedQueryPromise = new Promise((resolve) => {
      releaseDelayedQuery = () => resolve({ rows: [], rowCount: 0 });
    });
    pool.query = (sql, params) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO analytics_ops_metrics')) {
        return delayedQueryPromise;
      }
      return origQuery.call(pool, sql, params);
    };
    try {
      const t0 = Date.now();
      const val = await opsModule.withOpsMetric('db_query', `p2-test-timeout-${RUN_ID}`, async () => 'ok');
      const elapsed = Date.now() - t0;
      assert.strictEqual(val, 'ok');
      assert.ok(elapsed >= 200 && elapsed < 500, `Expected ~250ms timeout cap, got ${elapsed}ms`);
    } finally {
      if (hadOwnQuery) pool.query = origQuery;
      else delete pool.query;
      releaseDelayedQuery?.();
      await flushMicrotasks();
    }

    // 3. Real withOpsMetric persistence
    const realTarget = `p2-test-real-ops-${RUN_ID}`;
    await opsModule.withOpsMetric('db_query', realTarget, async () => true);
    const realRows = await dbModule.query(
      'SELECT metric_kind, outcome FROM analytics_ops_metrics WHERE target_name = $1',
      [realTarget]
    );
    assert.strictEqual(realRows.length, 1);
    assert.strictEqual(realRows[0].outcome, 'ok');

    // 4. API routes, catalog_cache (miss + hit), StaticForms, and geo ip_api
    const adminKey = authModule.getAdminKey();
    productsModule.invalidateProductsCache();

    const searchMissRes = await searchRoute.GET(new NextRequest('http://localhost:3000/api/products/search'));
    assert.strictEqual(searchMissRes.status, 200);
    const searchHitRes = await searchRoute.GET(new NextRequest('http://localhost:3000/api/products/search'));
    assert.strictEqual(searchHitRes.status, 200);

    const flagsRes = await flagsRoute.GET(
      new NextRequest('http://localhost:3000/api/flags', {
        headers: { authorization: `Bearer ${adminKey}` },
      })
    );
    assert.strictEqual(flagsRes.status, 200);

    const restRes = await restrictionsRoute.GET(
      new NextRequest('http://localhost:3000/api/restrictions', {
        headers: { authorization: `Bearer ${adminKey}` },
      })
    );
    assert.strictEqual(restRes.status, 200);

    const prevFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        const strUrl = String(url);
        if (strUrl.includes('ip-api.com')) {
          return new Response(
            JSON.stringify({
              status: 'success',
              country: 'India',
              countryCode: 'IN',
              region: 'TN',
              city: 'Hosur',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ id: `sf_p2_test_${RUN_ID}`, success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };

      const leadRes = await leadsRoute.POST(
        new NextRequest('http://localhost:3000/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source: 'contact_form',
            placement: 'contact_page_form',
            visitorId: `p2-test-lead-${RUN_ID}`,
            sessionId: `p2-test-lead-${RUN_ID}-s1`,
            name: 'P2 Ops Tester',
            contact: `p2-test-lead-${RUN_ID}@example.com`,
            message: 'Testing ops telemetry',
          }),
        })
      );
      assert.strictEqual(leadRes.status, 201);

      const geoResult = await geoModule.extractGeolocation(
        new Headers({ 'x-forwarded-for': '9.9.9.9' })
      );
      assert.strictEqual(geoResult.city, 'Hosur');
    } finally {
      globalThis.fetch = prevFetch;
    }

    const metrics = await dbModule.query(
      `SELECT metric_kind, target_name, outcome
       FROM analytics_ops_metrics
       WHERE created_at >= $1`,
      [testStartedAt]
    );
    const hasMetric = (kind, target, outcome) =>
      metrics.some(
        (m) =>
          m.metric_kind === kind &&
          m.target_name === target &&
          (outcome ? m.outcome === outcome : true)
      );

    assert.ok(hasMetric('api_request', '/api/products/search', 'ok'));
    assert.ok(hasMetric('catalog_cache', 'products_catalog', 'cache_miss'));
    assert.ok(hasMetric('catalog_cache', 'products_catalog', 'cache_hit'));
    assert.ok(hasMetric('api_request', '/api/flags', 'ok'));
    assert.ok(hasMetric('api_request', '/api/restrictions', 'ok'));
    assert.ok(hasMetric('api_request', '/api/leads', 'ok'));
    assert.ok(hasMetric('external_call', 'staticforms', 'ok'));
    assert.ok(hasMetric('external_call', 'ip_api', 'ok'));
  });

  it('OBS-05: persists DB-backed alert deduplication in analytics_alert_deliveries across cache clears and logs webhook failures', async () => {
    const vid = `p2-test-alert-${RUN_ID}`;
    const sid = `${vid}-s1`;
    const payload = {
      visitorId: vid,
      sessionId: sid,
      ipAddress: TEST_IP,
      geo: { city: 'Krishnagiri', region: 'TN', country: 'India' },
      flag: {
        flagType: 'nuisance',
        heuristicName: 'krishnagiri_opera_nuisance',
        reason: 'P2 alert dedupe test',
      },
    };

    alertModule.clearDedupeCache();
    alertModule.clearMockAlerts();

    const first = await alertModule.dispatchAlert(payload, { mock: true, persistMock: true });
    assert.strictEqual(first.success, true);
    assert.strictEqual(first.mode, 'mock');
    assert.notStrictEqual(first.deduplicated, true);

    // Clear L1 cache to simulate cold start and verify DB-backed dedupe
    alertModule.clearDedupeCache();
    const isDupInDb = await alertModule.checkAndRecordDedupeDb(`${sid}:nuisance`);
    assert.strictEqual(isDupInDb, true, 'Expected checkAndRecordDedupeDb to hit persisted DB row');

    alertModule.clearDedupeCache();
    const second = await alertModule.dispatchAlert(payload, { mock: true, persistMock: true });
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.deduplicated, true);

    // Webhook 503 failure path
    const prevAlertTestMode = process.env.ALERT_TEST_MODE;
    const prevWebhookUrl = process.env.ALERT_WEBHOOK_URL;
    const prevNtfy = process.env.NTFY_TOPIC;
    const prevPhone = process.env.PHONE_ALERT_CODE;
    const prevAlertPhone = process.env.ALERT_PHONE_TOPIC;
    const prevResend = process.env.RESEND_API_KEY;
    const prevEmailTo = process.env.ALERT_EMAIL_TO;
    const prevFetch = globalThis.fetch;

    try {
      delete process.env.ALERT_TEST_MODE;
      delete process.env.NTFY_TOPIC;
      delete process.env.PHONE_ALERT_CODE;
      delete process.env.ALERT_PHONE_TOPIC;
      delete process.env.RESEND_API_KEY;
      delete process.env.ALERT_EMAIL_TO;
      process.env.ALERT_WEBHOOK_URL = 'https://p2-test-webhook.invalid/hook';

      globalThis.fetch = async () => new Response('Service Unavailable', { status: 503 });

      const failVid = `p2-test-alert-fail-${RUN_ID}`;
      const failSid = `${failVid}-s1`;
      alertModule.clearDedupeCache();

      const failResult = await alertModule.dispatchAlert({
        ...payload,
        visitorId: failVid,
        sessionId: failSid,
      });
      assert.strictEqual(failResult.success, true);
      assert.strictEqual(failResult.mode, 'webhook');

      const deliveryRows = await dbModule.query(
        `SELECT visitor_id, channel, outcome, http_status
         FROM analytics_alert_deliveries
         WHERE visitor_id IN ($1, $2)
         ORDER BY id ASC`,
        [vid, failVid]
      );
      assert.ok(
        deliveryRows.some((r) => r.visitor_id === vid && r.channel === 'mock' && r.outcome === 'sent')
      );
      assert.ok(
        deliveryRows.some(
          (r) => r.visitor_id === vid && r.channel === 'mock' && r.outcome === 'deduplicated'
        )
      );
      assert.ok(
        deliveryRows.some(
          (r) =>
            r.visitor_id === failVid &&
            r.channel === 'webhook' &&
            r.outcome === 'failed' &&
            Number(r.http_status) === 503
        )
      );

      const webhookOpsRows = await dbModule.query(
        `SELECT outcome, status_code
         FROM analytics_ops_metrics
         WHERE target_name = 'alert_webhook' AND created_at >= $1`,
        [testStartedAt]
      );
      assert.ok(
        webhookOpsRows.some((r) => r.outcome === 'error' && Number(r.status_code) === 503),
        'Expected failed alert_webhook ops metric'
      );
    } finally {
      globalThis.fetch = prevFetch;
      const restoreEnv = (k, v) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      };
      restoreEnv('ALERT_TEST_MODE', prevAlertTestMode);
      restoreEnv('ALERT_WEBHOOK_URL', prevWebhookUrl);
      restoreEnv('NTFY_TOPIC', prevNtfy);
      restoreEnv('PHONE_ALERT_CODE', prevPhone);
      restoreEnv('ALERT_PHONE_TOPIC', prevAlertPhone);
      restoreEnv('RESEND_API_KEY', prevResend);
      restoreEnv('ALERT_EMAIL_TO', prevEmailTo);
    }
  });

  it('OBS-08: Edge middleware has zero pg/Node crypto imports and records 307/200 blocks via /api/internal/ops-block', async () => {
    const middlewareSrc = fs.readFileSync(path.resolve('middleware.ts'), 'utf8');
    assert.strictEqual(/from\s+['"]pg['"]|require\(['"]pg['"]\)/.test(middlewareSrc), false);
    assert.strictEqual(/from\s+['"](node:)?crypto['"]|require\(['"](node:)?crypto['"]\)/.test(middlewareSrc), false);
    assert.ok(middlewareSrc.includes('crypto.subtle'));

    // Route validation checks
    const unauthRes = await opsBlockRoute.POST(
      new NextRequest('http://localhost:3000/api/internal/ops-block', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': 'wrong-secret' },
        body: JSON.stringify({ targetName: 'visitor_id', statusCode: 307 }),
      })
    );
    assert.strictEqual(unauthRes.status, 401);

    const internalSecret = authModule.getInternalApiSecret();
    assert.ok(internalSecret);

    const badJsonRes = await opsBlockRoute.POST(
      new NextRequest('http://localhost:3000/api/internal/ops-block', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': internalSecret },
        body: '{invalid-json',
      })
    );
    assert.strictEqual(badJsonRes.status, 400);

    const missingTargetRes = await opsBlockRoute.POST(
      new NextRequest('http://localhost:3000/api/internal/ops-block', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({ statusCode: 307 }),
      })
    );
    assert.strictEqual(missingTargetRes.status, 400);

    // End-to-end middleware -> ops-block delegation via event.waitUntil
    const blockedVid = `p2-test-mw-vid-${RUN_ID}`;
    const prevFetch = globalThis.fetch;
    const waitUntilPromises = [];
    const mockEvent = {
      waitUntil(promise) {
        waitUntilPromises.push(promise);
      },
    };

    try {
      globalThis.fetch = async (url, init) => {
        const strUrl = String(url);
        if (strUrl.includes('/api/internal/restrictions')) {
          return new Response(
            JSON.stringify({ visitorIds: [blockedVid], ips: [] }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        if (strUrl.includes('/api/internal/ops-block')) {
          return await opsBlockRoute.POST(
            new NextRequest(strUrl, {
              method: 'POST',
              headers: init?.headers,
              body: init?.body,
            })
          );
        }
        throw new Error(`Unexpected middleware fetch URL: ${strUrl}`);
      };

      const res307 = await middlewareModule.middleware(
        new NextRequest(`http://localhost:3000/products/loader/p2-test-part-${RUN_ID}`, {
          headers: { cookie: `mm_vid=${blockedVid}` },
        }),
        mockEvent
      );
      assert.strictEqual(res307.status, 307);
      assert.ok((res307.headers.get('location') || '').endsWith('/#contact'));

      const res200 = await middlewareModule.middleware(
        new NextRequest(`http://localhost:3000/api/products/search?q=p2-test-${RUN_ID}`, {
          headers: { cookie: `mm_vid=${blockedVid}` },
        }),
        mockEvent
      );
      assert.strictEqual(res200.status, 200);
      assert.deepStrictEqual(await res200.json(), []);

      await Promise.all(waitUntilPromises);

      const blockRows = await dbModule.query(
        `SELECT status_code, outcome, metadata
         FROM analytics_ops_metrics
         WHERE metric_kind = 'middleware_block'
           AND COALESCE(metadata->>'pathname', '') LIKE $1
         ORDER BY id ASC`,
        [`%p2-test-%${RUN_ID}%`]
      );
      // Note: /api/products/search query string isn't in pathname, check /products/... and also recent 200 block
      assert.ok(
        blockRows.some((r) => Number(r.status_code) === 307 && r.outcome === 'blocked'),
        'Expected 307 middleware_block row'
      );

      const block200Rows = await dbModule.query(
        `SELECT status_code, outcome, metadata
         FROM analytics_ops_metrics
         WHERE metric_kind = 'middleware_block'
           AND status_code = 200
           AND target_name = 'visitor_id'
           AND created_at >= $1`,
        [testStartedAt]
      );
      assert.ok(block200Rows.length >= 1, 'Expected 200 middleware_block row');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('BUG-13: encoder.ts expands JSON fallback arrays/objects via expandEvent & clusters.ts prioritizes cities over regions with % decoding', () => {
    const arrDecoded = encoderModule.tryDecodePayload(
      JSON.stringify([{ v: 'v-arr', s: 's-arr', t: 'pageview', p: '/products' }])
    );
    assert.strictEqual(arrDecoded.ok, true);
    assert.strictEqual(arrDecoded.events[0].visitorId, 'v-arr');
    assert.strictEqual(arrDecoded.events[0].sessionId, 's-arr');
    assert.strictEqual(arrDecoded.events[0].eventType, 'pageview');
    assert.strictEqual(arrDecoded.events[0].pagePath, '/products');

    const objDecoded = encoderModule.tryDecodePayload(
      JSON.stringify({ v: 'v-short', visitorId: 'v-full', s: 's-obj', t: 'click', p: '/models' })
    );
    assert.strictEqual(objDecoded.ok, true);
    assert.strictEqual(objDecoded.events[0].visitorId, 'v-full', 'Existing full key must not be overwritten');
    assert.strictEqual(objDecoded.events[0].sessionId, 's-obj');
    assert.strictEqual(objDecoded.events[0].eventType, 'click');
    assert.strictEqual(objDecoded.events[0].pagePath, '/models');

    // City priority over region
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Jamshedpur', 'JH')?.name, 'OEM & Quarry');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Chennai', 'TN')?.name, 'OEM & Quarry');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Hosur', 'TN')?.name, 'OEM & Quarry');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Nagpur', 'MH')?.name, 'Mining Cluster');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Kolkata', 'WB')?.name, 'Mining Cluster');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Pune', 'MH')?.name, 'Infra & Fleets');

    // Region fallback
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Bokaro', 'JH')?.name, 'Mining Cluster');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Nashik', 'MH')?.name, 'Infra & Fleets');

    // Percent-decoding
    assert.strictEqual(clustersModule.getIndustrialClusterTag('New%20Delhi', 'DL')?.name, 'Infra & Fleets');
    assert.strictEqual(clustersModule.getIndustrialClusterTag('Jamshedpur%20City', 'JH')?.name, 'OEM & Quarry');

    // Unknown -> null
    assert.strictEqual(clustersModule.getIndustrialClusterTag('UnknownTown', 'ZZ'), null);

    // Arg order for getIndustrialBadge(region, city)
    assert.strictEqual(clustersModule.getIndustrialBadge('JH', 'Jamshedpur')?.label, '🏭 OEM & Quarry');
    assert.strictEqual(clustersModule.getIndustrialBadge('MH', 'Nagpur')?.label, '⛏️ Mining Cluster');
  });

  it('BI-09, BI-04..08, OBS-03, OBS-06/07, PROD-09: verifies stats.ts extensions, 3-query budget, and POST /api/analytics views', async () => {
    const allProducts = productsModule.getProducts();
    const imageless = allProducts.find((p) => !p.image || !String(p.image).trim());
    const imaged = allProducts.find((p) => Boolean(p.image && String(p.image).trim()));
    assert.ok(imageless, 'Catalog must contain at least one imageless SKU');
    assert.ok(imaged, 'Catalog must contain at least one imaged SKU');

    const imagelessSlug = utilsModule.getProductUrlSlug(imageless).toLowerCase();
    const imagedSlug = utilsModule.getProductUrlSlug(imaged).toLowerCase();
    const imagedCat =
      imaged.category === 'Motor Grader' || imaged.category === 'Grader'
        ? 'grader'
        : imaged.category.toLowerCase();
    const imagedPath = `/products/${imagedCat}/${imagedSlug}`;

    const vid1 = `p2-test-bi-${RUN_ID}`;
    const sid1 = `${vid1}-s1`;
    const sid2 = `${vid1}-s2`;

    // Batch 1: model view, related click, impression, zoom, spec toggle, export banner, error, 404, loading
    await dbModule.ingestEvents(
      [
        { visitorId: vid1, sessionId: sid1, eventType: 'pageview', pagePath: '/models/hm-2021d' },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'model_faq_accordion_toggle',
          pagePath: '/models/hm-2021d',
          metadata: { open: true, machineSlug: 'hm-2021d', question: `P2 Test FAQ ${RUN_ID}` },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'model_sibling_switcher_card',
          pagePath: '/models/hm-2021d',
          metadata: {
            sourceMachineSlug: 'hm-2021d',
            targetMachineSlug: 'hm-2071',
            targetMachineName: 'HM 2071',
          },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'placeholder_impression',
          pagePath: '/products',
          metadata: { productSlug: imagelessSlug, hasImage: false, surface: 'catalog_card' },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'click',
          pagePath: '/products',
          elementTarget: 'https://wa.me/918334887009',
          metadata: { productSlug: imagelessSlug, placement: 'placeholder_photo_wa' },
        },
        { visitorId: vid1, sessionId: sid1, eventType: 'pageview', pagePath: '/products?category=excavator' },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'search',
          pagePath: '/products',
          metadata: { query: 'excavator bucket teeth', category: 'Excavator', zeroResults: false },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'click',
          pagePath: '/products',
          elementTarget: 'https://wa.me/918334887009',
          metadata: {
            trackLabel: 'products_excavator_whatsapp',
            placement: 'products_excavator_banner',
          },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'image_zoom',
          pagePath: imagedPath,
          metadata: { action: 'open', productSlug: imagedSlug, productTitle: imaged.title },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'image_zoom',
          pagePath: imagedPath,
          metadata: { action: 'close', productSlug: imagedSlug, durationMs: 2400 },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'spec_toggle',
          pagePath: imagedPath,
          metadata: { open: true, productSlug: imagedSlug },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'related_product_click',
          pagePath: '/products/loader/source-sku',
          metadata: {
            sourceProductSlug: 'source-sku',
            targetProductSlug: imagedSlug,
            targetTitle: imaged.title,
          },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'export_banner_view',
          pagePath: imagedPath,
          metadata: { country: 'United Arab Emirates', countryCode: 'AE', pagePath: imagedPath },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'click',
          pagePath: imagedPath,
          elementTarget: 'https://wa.me/918334887009',
          metadata: { placement: 'export_banner', country: 'United Arab Emirates', countryCode: 'AE' },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'not_found',
          pagePath: `/products/p2-test-404-${RUN_ID}`,
          metadata: {
            requestedPath: `/products/p2-test-404-${RUN_ID}`,
            referrer: 'https://google.com',
            inferredPartNumber: '4729012',
          },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'loading_screen_timing',
          pagePath: '/',
          metadata: {
            waitDurationMs: 3200,
            hitFallback12s: false,
            dismissedNormally: true,
            bouncedBeforeDismiss: false,
            isMobile: false,
          },
        },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'client_error',
          pagePath: '/products',
          metadata: { kind: 'runtime', message: `p2-test-err-${RUN_ID}`, source: '/products' },
        },
      ],
      { country: 'United Arab Emirates', countryCode: 'AE', region: 'DU', city: 'Dubai' },
      { deviceType: 'desktop', browser: 'Chrome 126', os: 'Windows 11' },
      '8.8.8.8'
    );

    // Batch 2: downstream product view + WA click in same session + 2nd session for cohort retention
    await new Promise((r) => setTimeout(r, 15));
    await dbModule.ingestEvents(
      [
        { visitorId: vid1, sessionId: sid1, eventType: 'pageview', pagePath: imagedPath },
        {
          visitorId: vid1,
          sessionId: sid1,
          eventType: 'click',
          pagePath: imagedPath,
          elementText: 'Enquire Now',
          elementTarget: 'https://wa.me/918334887009',
          metadata: { productSlug: imagedSlug, placement: 'product_detail_hero' },
        },
      ],
      { country: 'United Arab Emirates', countryCode: 'AE', region: 'DU', city: 'Dubai' },
      { deviceType: 'desktop', browser: 'Chrome 126', os: 'Windows 11' },
      '8.8.8.8'
    );
    await dbModule.ingestEvents(
      [{ visitorId: vid1, sessionId: sid2, eventType: 'pageview', pagePath: '/products' }],
      { country: 'United Arab Emirates', countryCode: 'AE', region: 'DU', city: 'Dubai' },
      { deviceType: 'desktop', browser: 'Chrome 126', os: 'Windows 11' },
      '8.8.8.8'
    );

    await dbModule.query(
      `INSERT INTO analytics_audit_logs (actor_ip, actor_label, action, target_type, target_value, success, metadata)
       VALUES ($1, 'admin', 'p2_test_audit', 'system', $2, true, '{}'::jsonb)`,
      [TEST_IP, `p2-test-audit-${RUN_ID}`]
    );

    // OBS-03: Verify 3-query budget on getDashboardStats('90d')
    const pool = dbModule.getDbPool();
    const hadOwnQuery = Object.prototype.hasOwnProperty.call(pool, 'query');
    const origQuery = pool.query;
    let queryCount = 0;
    pool.query = (...args) => {
      queryCount += 1;
      return origQuery.apply(pool, args);
    };
    try {
      const stats90d = await statsModule.getDashboardStats('90d');
      assert.strictEqual(queryCount, 3, `Expected 3 CTE queries in getDashboardStats('90d'), got ${queryCount}`);
      assert.ok(stats90d.productEngagementStats);
      assert.ok(stats90d.exportFunnelStats);
      assert.ok(stats90d.modelHubStats);
      assert.ok(stats90d.cohortRetentionStats);
    } finally {
      if (hadOwnQuery) pool.query = origQuery;
      else delete pool.query;
    }

    const adminKey = authModule.getAdminKey();
    const callAnalyticsView = async (body) => {
      const res = await analyticsRoute.POST(
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
          body: JSON.stringify(body),
        })
      );
      assert.strictEqual(res.status, 200);
      return await res.json();
    };

    const summary = await callAnalyticsView({ view: 'summary', timeRange: 'today' });
    assert.ok(summary.productEngagementStats.zoomOpens >= 1);
    assert.ok(summary.productEngagementStats.zoomCloses >= 1);
    assert.ok(summary.productEngagementStats.specToggles >= 1);
    assert.ok(summary.productEngagementStats.relatedClicks >= 1);
    assert.ok(summary.productEngagementStats.relatedAssistedEnquiries >= 1);
    assert.ok(summary.exportFunnelStats.bannerViews >= 1);
    assert.ok(summary.exportFunnelStats.whatsappClicks >= 1);
    assert.ok(summary.modelHubStats.faqToggles >= 1);
    assert.ok(summary.modelHubStats.siblingClicks >= 1);
    const hmHub = summary.modelHubStats.hubs.find((h) => h.machineSlug === 'hm-2021');
    assert.ok(hmHub && hmHub.views >= 1 && hmHub.downstreamPartViews >= 1 && hmHub.downstreamEnquiries >= 1);
    assert.ok(summary.cohortRetentionStats.returningVisitors >= 1);
    assert.ok(Array.isArray(summary.cohortRetentionStats.cohorts) && summary.cohortRetentionStats.cohorts.length === 3);

    const catalog = await callAnalyticsView({ view: 'catalog', timeRange: 'today' });
    assert.ok(catalog.products.length > 0);
    assert.strictEqual(typeof catalog.products[0].enquire_clicks, 'number');
    assert.ok(catalog.catalogHealthGaps.missingPhotoSkuCount >= 1);
    assert.ok(catalog.catalogHealthGaps.missingPhotoImpressions >= 1);
    assert.ok(catalog.catalogHealthGaps.excavatorViews >= 1);
    assert.ok(catalog.catalogHealthGaps.excavatorSearches >= 1);
    assert.ok(catalog.catalogHealthGaps.excavatorBannerClicks >= 1);

    const visitors = await callAnalyticsView({
      view: 'visitors',
      timeRange: 'today',
      search: vid1,
      segment: 'repeat',
      device: 'desktop',
      limit: 10,
      offset: 0,
    });
    assert.strictEqual(visitors.totalCount, 1);
    assert.strictEqual(visitors.visitors.length, 1);
    assert.strictEqual(visitors.visitors[0].visitor_id, vid1);
    assert.ok(visitors.summaryCounts && typeof visitors.summaryCounts.total === 'number');

    const opsHealth = await callAnalyticsView({ view: 'ops_health', timeRange: 'today' });
    assert.ok(opsHealth.ingestStats.totalBatches >= 1);
    assert.ok(Array.isArray(opsHealth.apiSla));
    assert.ok(opsHealth.dbPoolAndCache && opsHealth.dbPoolAndCache.pool);
    assert.ok(Array.isArray(opsHealth.externalSlas));
    assert.ok(opsHealth.alertDeliveries);
    assert.ok(opsHealth.notFoundPaths.some((p) => p.path === `/products/p2-test-404-${RUN_ID}`));
    assert.ok(opsHealth.loadingScreen.samples >= 1);
    assert.ok(opsHealth.clientErrors.totalErrors >= 1);
    assert.ok(opsHealth.middlewareBlocks);

    const auditLogs = await callAnalyticsView({ view: 'audit_logs', limit: 20, offset: 0 });
    assert.ok(auditLogs.totalCount >= 1);
    assert.ok(auditLogs.logs.some((l) => l.target_value === `p2-test-audit-${RUN_ID}`));
  });

  it('E1: enforces <= 49,152 UTF-8 byte chunking on multi-byte Devanagari/CJK/emoji and surrogate-pair truncation boundaries', async () => {
    const utf8Batch = Array.from({ length: 25 }, (_, idx) => ({
      visitorId: `p2-test-utf8-${idx}`,
      sessionId: `p2-test-utf8-s-${idx}`,
      eventType: 'search',
      pagePath: '/products',
      metadata: { q: 'एक्सकेवेटर पार्ट्स 挖掘机配件 🚜🔧⚙️ '.repeat(30), idx },
    }));
    const chunks = trackerModule.chunkEventsForUpload(utf8Batch);
    assert.ok(chunks.length >= 2, `Expected multi-byte batch to split into >= 2 chunks, got ${chunks.length}`);
    for (const chunk of chunks) {
      const byteLen = Buffer.byteLength(chunk.payload, 'utf8');
      assert.ok(byteLen <= 49152, `UTF-8 chunk exceeded 49152 bytes: ${byteLen}`);
      const parsed = JSON.parse(chunk.payload);
      const decoded = encoderModule.tryDecodePayload(parsed.d);
      assert.strictEqual(decoded.ok, true, `Expected tryDecodePayload ok for chunk: ${decoded.error}`);
    }

    const oversizedSurrogate = [
      {
        visitorId: 'p2-test-surrogate-v1',
        sessionId: 'p2-test-surrogate-s1',
        eventType: 'client_error',
        pagePath: '/products/test',
        metadata: {
          hugeText: 'A'.repeat(499) + '🚜' + 'B'.repeat(65000),
          nestedArr: ['पार्ट्स'.repeat(10000)],
        },
      },
    ];
    const truncated = trackerModule.chunkEventsForUpload(oversizedSurrogate);
    assert.strictEqual(truncated.length, 1);
    const truncBytes = Buffer.byteLength(truncated[0].payload, 'utf8');
    assert.ok(truncBytes <= 49152, `Truncated surrogate chunk exceeded 49152 bytes: ${truncBytes}`);
    const decodedTrunc = encoderModule.tryDecodePayload(JSON.parse(truncated[0].payload).d);
    assert.strictEqual(decodedTrunc.ok, true, `Expected tryDecodePayload ok for truncated event`);

    // String-only surrogate-boundary oversized event (without nestedArr) + pre-existing lone surrogate stripping
    const hasLoneSurrogate = (str) => {
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
          if (next < 0xdc00 || next > 0xdfff) return true;
          i += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          return true;
        }
      }
      return false;
    };

    assert.strictEqual(trackerModule.safeSlice('AB\uD83DCD\uDE9CE', 10), 'ABCDE');
    assert.strictEqual(trackerModule.safeSlice('A'.repeat(499) + '🚜B', 500), 'A'.repeat(499));
    assert.strictEqual(trackerModule.safeSlice('A'.repeat(498) + '🚜B', 500), 'A'.repeat(498) + '🚜');

    const surrogateVid = `p2-test-surrogate-${RUN_ID}`;
    const surrogateSid = `${surrogateVid}-s1`;
    const stringOnlySurrogate = [
      {
        visitorId: surrogateVid,
        sessionId: surrogateSid,
        eventType: 'client_error',
        pagePath: '/products/test',
        metadata: {
          hugeText: 'A'.repeat(499) + '🚜' + 'B'.repeat(65000),
        },
      },
    ];
    const surrogateChunks = trackerModule.chunkEventsForUpload(stringOnlySurrogate);
    assert.strictEqual(surrogateChunks.length, 1);
    const surrogateBytes = Buffer.byteLength(surrogateChunks[0].payload, 'utf8');
    assert.ok(surrogateBytes <= 49152, `String-only surrogate chunk exceeded 49152 bytes: ${surrogateBytes}`);

    const decodedSurr = encoderModule.tryDecodePayload(JSON.parse(surrogateChunks[0].payload).d);
    assert.strictEqual(decodedSurr.ok, true, 'Expected tryDecodePayload ok for string-only surrogate event');
    const decodedHugeText = decodedSurr.events[0]?.metadata?.hugeText;
    assert.strictEqual(typeof decodedHugeText, 'string');
    assert.ok(decodedHugeText.length <= 499, `Expected hugeText length <= 499, got ${decodedHugeText.length}`);
    assert.strictEqual(hasLoneSurrogate(decodedHugeText), false, 'Decoded hugeText must contain zero lone surrogates');
    assert.ok(decodedHugeText.startsWith('A'.repeat(499)), 'Expected hugeText to start with 499 As');

    const ingestRes = await ingestModule.ingestTelemetryRequest(
      new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: surrogateChunks[0].payload,
      }),
      surrogateChunks[0].payload
    );
    assert.strictEqual(
      ingestRes.status,
      204,
      `Expected HTTP 204 for surrogate-truncated payload, got ${ingestRes.status}`
    );

    const persistedRows = await dbModule.query(
      `SELECT visitor_id, event_type, metadata->>'hugeText' AS huge_text
       FROM analytics_events
       WHERE visitor_id = $1`,
      [surrogateVid]
    );
    assert.strictEqual(persistedRows.length, 1, 'Expected surrogate-truncated event persisted in analytics_events');
    assert.strictEqual(persistedRows[0].event_type, 'client_error');
    assert.strictEqual(persistedRows[0].huge_text, 'A'.repeat(499));
  });

  it('E2: tolerates corrupted/non-array mm_retry_queue JSON and falls back to memoryRetryQueue on QuotaExceededError', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const browserEnv = setupMockBrowserEnv({ pathname: '/products' });
    const prevFetch = globalThis.fetch;

    try {
      let fetchStatus = 204;
      const fetchCalls = [];
      globalThis.fetch = async (url, init) => {
        fetchCalls.push({ url, body: init?.body });
        return new Response(null, { status: fetchStatus });
      };

      // 1. Corrupted & non-array mm_retry_queue payloads must never throw
      for (const badValue of ['{corrupted-json', 'null', '12345', '{"not":"an-array"}']) {
        browserEnv.localStorageMock.setItem(trackerModule.RETRY_QUEUE_STORAGE_KEY, badValue);
        const safeTracker = new trackerModule.AnalyticsTracker();
        safeTracker.track('click', { pagePath: `/p2-test-corrupt/${badValue.length}` });
        safeTracker.flush(false);
        await flushMicrotasks();
      }
      assert.ok(fetchCalls.length >= 4);

      // 2. QuotaExceededError fallback to in-memory retry queue & 2000ms timer drain
      browserEnv.localStorageMock.removeItem(trackerModule.RETRY_QUEUE_STORAGE_KEY);
      const origSetItem = browserEnv.localStorageMock.setItem.bind(browserEnv.localStorageMock);
      browserEnv.localStorageMock.setItem = (key, value) => {
        if (key === trackerModule.RETRY_QUEUE_STORAGE_KEY) {
          throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
        }
        return origSetItem(key, value);
      };

      fetchCalls.length = 0;
      fetchStatus = 500;
      const quotaTracker = new trackerModule.AnalyticsTracker();
      for (let i = 0; i < 3; i++) {
        quotaTracker.track('click', { pagePath: `/p2-test-quota/${i}`, metadata: { idx: i } });
      }
      quotaTracker.flush(false);
      await flushMicrotasks();
      assert.strictEqual(fetchCalls.length, 1, 'Expected initial failing POST attempt');
      assert.strictEqual(
        browserEnv.localStorageMock.getItem(trackerModule.RETRY_QUEUE_STORAGE_KEY),
        null,
        'QuotaExceededError should leave localStorage retry key unset'
      );

      // Switch to 204 and advance 2000ms backoff timer -> memoryRetryQueue drains
      fetchStatus = 204;
      t.mock.timers.tick(2000);
      await flushMicrotasks();
      assert.strictEqual(fetchCalls.length, 2, 'Expected memoryRetryQueue drain at 2000ms');
      const retryDecoded = encoderModule.tryDecodePayload(JSON.parse(fetchCalls[1].body).d);
      assert.strictEqual(retryDecoded.ok, true);
      assert.strictEqual(retryDecoded.events.length, 3);
    } finally {
      globalThis.fetch = prevFetch;
      browserEnv.restore();
      t.mock.timers.reset();
    }
  });

  it('E3: rejects missing, empty, whitespace, short, and overlong x-internal-secret headers with 401 without RangeError or DB writes', async () => {
    const startRow = await dbModule.query('SELECT NOW() AS ts');
    const beforeE3 = startRow[0].ts;

    const secretCases = [
      undefined,
      '',
      '   ',
      'short',
      'x'.repeat(250),
      '0'.repeat(64),
    ];

    for (const secretHeader of secretCases) {
      const headers = new Headers({ 'content-type': 'application/json' });
      if (secretHeader !== undefined) {
        headers.set('x-internal-secret', secretHeader);
      }
      const res = await opsBlockRoute.POST(
        new NextRequest('http://localhost:3000/api/internal/ops-block', {
          method: 'POST',
          headers,
          body: JSON.stringify({ targetName: 'p2-test-e3', statusCode: 307 }),
        })
      );
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.headers.get('cache-control'), 'private, no-store');
      assert.deepStrictEqual(await res.json(), { error: 'Unauthorized' });
    }

    const writtenRows = await dbModule.query(
      `SELECT COUNT(*)::int AS cnt
       FROM analytics_ops_metrics
       WHERE metric_kind = 'middleware_block'
         AND created_at >= $1
         AND target_name = 'p2-test-e3'`,
      [beforeE3]
    );
    assert.strictEqual(writtenRows[0].cnt, 0);
  });

  it('E4: returns sanitized 500 Internal error on DB outage across POST/GET admin views and hides databaseError on unauthenticated status check', async () => {
    const pool = dbModule.getDbPool();
    const hadOwnConnect = Object.prototype.hasOwnProperty.call(pool, 'connect');
    const origConnect = pool.connect;
    const hadOwnQuery = Object.prototype.hasOwnProperty.call(pool, 'query');
    const origQuery = pool.query;

    const dbOutageErr = new Error('FATAL: password authentication failed for host pg-prod-secret.internal:5432');
    pool.connect = (cb) => {
      if (typeof cb === 'function') {
        queueMicrotask(() => cb(dbOutageErr));
        return;
      }
      return Promise.reject(dbOutageErr);
    };
    pool.query = () => Promise.reject(dbOutageErr);

    const adminKey = authModule.getAdminKey();
    try {
      for (const view of ['summary', 'ops_health', 'visitors', 'audit_logs']) {
        const res = await analyticsRoute.POST(
          new NextRequest('http://localhost:3000/api/analytics', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
            body: JSON.stringify({ view, timeRange: 'today' }),
          })
        );
        assert.strictEqual(res.status, 500, `Expected 500 for POST view=${view}`);
        const json = await res.json();
        assert.deepStrictEqual(json, { error: 'Internal error' });
        assert.strictEqual(JSON.stringify(json).includes('pg-prod-secret.internal'), false);
      }

      for (const view of ['summary', 'ops_health']) {
        const res = await analyticsRoute.GET(
          new NextRequest(`http://localhost:3000/api/analytics?view=${view}`, {
            headers: { authorization: `Bearer ${adminKey}` },
          })
        );
        assert.strictEqual(res.status, 500, `Expected 500 for GET view=${view}`);
        const json = await res.json();
        assert.deepStrictEqual(json, { error: 'Internal error' });
        assert.strictEqual(JSON.stringify(json).includes('pg-prod-secret.internal'), false);
      }

      const statusRes = await analyticsRoute.GET(
        new NextRequest('http://localhost:3000/api/analytics?check=status')
      );
      assert.strictEqual(statusRes.status, 200);
      const statusJson = await statusRes.json();
      assert.strictEqual(statusJson.databaseConnected, false);
      assert.strictEqual('databaseError' in statusJson, false);
      assert.strictEqual(JSON.stringify(statusJson).includes('pg-prod-secret.internal'), false);
    } finally {
      if (hadOwnConnect) pool.connect = origConnect;
      else delete pool.connect;
      if (hadOwnQuery) pool.query = origQuery;
      else delete pool.query;
    }
  });

  it('E5: parameterizes SQLi payloads, clamps extreme/invalid limit & offset on visitors/audit_logs, and tolerates hostile waitDurationMs values', async () => {
    const vidHostile = `p2-test-hostile-${RUN_ID}`;
    const sidHostile = `${vidHostile}-s1`;
    const hostileWaits = ['-500', '999999999999999999999', "'; DROP TABLE analytics_events;--", '1e30', 'NaN'];

    await dbModule.ingestEvents(
      hostileWaits.map((waitDurationMs, idx) => ({
        visitorId: vidHostile,
        sessionId: sidHostile,
        eventType: 'loading_screen_timing',
        pagePath: '/',
        metadata: {
          waitDurationMs,
          hitFallback12s: false,
          dismissedNormally: true,
          bouncedBeforeDismiss: false,
          isMobile: idx % 2 === 0,
        },
      })),
      { country: 'India', countryCode: 'IN', region: 'TN', city: 'Chennai' },
      { deviceType: 'desktop', browser: 'Chrome 126', os: 'Windows 11' },
      TEST_IP
    );

    const adminKey = authModule.getAdminKey();
    const postAdmin = async (body) => {
      const res = await analyticsRoute.POST(
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
          body: JSON.stringify(body),
        })
      );
      assert.strictEqual(res.status, 200);
      return await res.json();
    };

    const sqliVisitors1 = await postAdmin({
      view: 'visitors',
      timeRange: 'today',
      search: "' OR '1'='1; %_\\\"",
      segment: "leads' OR 1=1--",
      device: "mobile' OR 1=1--",
      limit: -5,
      offset: -10,
    });
    assert.ok(Array.isArray(sqliVisitors1.visitors));
    assert.strictEqual(typeof sqliVisitors1.totalCount, 'number');
    assert.ok(sqliVisitors1.summaryCounts && typeof sqliVisitors1.summaryCounts.total === 'number');

    const sqliVisitors2 = await postAdmin({
      view: 'visitors',
      timeRange: 'today',
      limit: 'abc',
      offset: 999999999999,
    });
    assert.ok(Array.isArray(sqliVisitors2.visitors));
    assert.strictEqual(sqliVisitors2.visitors.length, 0);

    const audit1 = await postAdmin({ view: 'audit_logs', limit: 'NaN', offset: -50 });
    assert.ok(Array.isArray(audit1.logs));
    assert.strictEqual(typeof audit1.totalCount, 'number');

    const audit2 = await postAdmin({ view: 'audit_logs', limit: 999999, offset: 1e15 });
    assert.ok(Array.isArray(audit2.logs));
    assert.strictEqual(audit2.logs.length, 0);

    const opsToday = await postAdmin({ view: 'ops_health', timeRange: 'today' });
    assert.ok(opsToday.loadingScreen && typeof opsToday.loadingScreen.samples === 'number');
    assert.ok(Number.isFinite(opsToday.loadingScreen.p50WaitMs));

    const opsInvalidRange = await statsModule.getOpsHealthStats('not_a_range');
    assert.ok(opsInvalidRange.loadingScreen && typeof opsInvalidRange.loadingScreen.samples === 'number');

    // Confirm analytics_events and analytics_visitors tables remain intact
    const intactRows = await dbModule.query(
      'SELECT COUNT(*)::int AS cnt FROM analytics_events WHERE visitor_id = $1',
      [vidHostile]
    );
    assert.strictEqual(intactRows[0].cnt, hostileWaits.length);
  });

  it('Scope Boundaries: .env.local keys only, zero CRM/analytics_lead_events, PROD-02/PROD-04 untouched, and zero P3 features', async () => {
    const envRaw = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    const keys = envRaw
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([\w.-]+)\s*=/)?.[1])
      .filter(Boolean);
    assert.deepStrictEqual(keys.sort(), ['ADMIN_ANALYTICS_KEY', 'DATABASE_URL']);

    const leadEventsCount = await dbModule.query('SELECT COUNT(*)::int AS cnt FROM analytics_lead_events');
    assert.strictEqual(leadEventsCount[0].cnt, 0);
    assert.strictEqual('GET' in leadsRoute, false);
    assert.strictEqual('PATCH' in leadsRoute, false);

    // PROD-02 untouched
    for (const rel of [
      'components/ProductsPage.tsx',
      'components/ModelProductGrid.tsx',
      'components/ProductImageZoom.tsx',
    ]) {
      const src = fs.readFileSync(path.resolve(rel), 'utf8');
      assert.ok(src.includes('Coming Soon'), `${rel} must retain Coming Soon UI`);
    }

    // PROD-04 untouched
    const homeClientSrc = fs.readFileSync(path.resolve('components/HomeClient.tsx'), 'utf8');
    assert.ok(homeClientSrc.includes('3000') && homeClientSrc.includes('12000'));

    // 7 tabs only, no CRM/P3
    const headerSrc = fs.readFileSync(
      path.resolve('app/admin/analytics/_components/DashboardHeader.tsx'),
      'utf8'
    );
    assert.ok(headerSrc.includes("'ops'"));
    assert.strictEqual(headerSrc.includes("'crm'"), false);

    const scanRoots = ['app', 'lib', 'components'];
    const forbidden = [
      'TelemetryScripts',
      'reviewRedirectStats',
      'Create in CMS',
      'estimated_value_inr',
      'first_responded_at',
      'analytics_lead_events',
    ];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          for (const token of forbidden) {
            assert.strictEqual(content.includes(token), false, `Forbidden token '${token}' in ${full}`);
          }
        }
      }
    };
    for (const root of scanRoots) {
      walk(path.resolve(root));
    }
  });
});
