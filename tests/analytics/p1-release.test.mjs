import { describe, it, after } from 'node:test';
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

// Resolve `@/*` alias and transpile `.ts`/`.tsx` for Node test runner
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
const statsModule = require('../../lib/analytics/stats.ts');
const geoModule = require('../../lib/analytics/geo.ts');
const encoderModule = require('../../lib/analytics/encoder.ts');
const productsModule = require('../../lib/products.ts');
const utilsModule = require('../../lib/utils.ts');
const collectRoute = require('../../app/api/collect/route.ts');
const analyticsRoute = require('../../app/api/analytics/route.ts');
const flagsRoute = require('../../app/api/flags/route.ts');
const leadsRoute = require('../../app/api/leads/route.ts');
const restrictionsServer = require('../../lib/restrictions-server.ts');
const opsModule = require('../../lib/analytics/ops.ts');

describe('P1 Release Verification Suite', () => {
  after(async () => {
    try {
      await opsModule.waitForDetachedOpsContext();
      await dbModule.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_leads WHERE visitor_id LIKE 'p1-test-%' OR contact LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_flags WHERE LOWER(target_value) LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p1-test-%'");
      await dbModule.query("DELETE FROM analytics_audit_logs WHERE actor_ip = '198.51.100.77' OR LOWER(COALESCE(target_value, '')) LIKE 'p1-test-%'");
      await dbModule.query(
        `DELETE FROM analytics_ops_metrics
         WHERE created_at >= NOW() - INTERVAL '5 minutes'
           AND (
             (metric_kind = 'ingest_batch' AND target_name = '/api/analytics')
             OR (metric_kind = 'api_request' AND target_name IN ('/api/analytics', '/api/flags', '/api/leads'))
             OR (metric_kind = 'external_call' AND target_name = 'staticforms')
             OR (metric_kind = 'db_query' AND target_name = 'stats_product_events')
           )`
      );
    } catch {}
    try {
      restrictionsServer.invalidateRestrictionsCache();
      await dbModule.getDbPool().end();
    } catch {}
  });

  it('OBS-03: caches parsed markdown products with mtime invalidation and consolidates getDashboardStats to <= 4 queries', async () => {
    productsModule.invalidateProductsCache();
    const first = productsModule.getProducts();
    assert.ok(first.length > 0, 'Catalog must contain products');
    const second = productsModule.getProducts();
    assert.strictEqual(first, second, 'Warm cache hit must return cached catalog reference');

    const cacheStats = productsModule.getProductsCacheStats();
    assert.ok(cacheStats.hits >= 1);
    assert.ok(cacheStats.misses >= 1);

    // Count SQL round trips executed by getDashboardStats
    const pool = dbModule.getDbPool();
    const origQuery = pool.query.bind(pool);
    let queryCount = 0;
    pool.query = (...args) => {
      queryCount += 1;
      return origQuery(...args);
    };

    try {
      const stats90d = await statsModule.getDashboardStats('90d');
      assert.strictEqual(queryCount, 3, `Expected 3 consolidated CTE queries, observed ${queryCount}`);
      assert.ok(Array.isArray(stats90d.placementAttribution));
      assert.ok(stats90d.searchFunnelStats);
      assert.ok(stats90d.formFunnelStats);
      assert.ok(typeof stats90d.kpis.persistedFormSubmissions === 'number');

      const stats1y = await statsModule.getDashboardStats('1y');
      assert.ok(Array.isArray(stats1y.timeSeries));
      for (const pt of stats1y.timeSeries) {
        assert.match(pt.period, /^\d{4}-\d{2}$/, '1y timeSeries periods must be monthly YYYY-MM');
      }
    } finally {
      pool.query = origQuery;
    }
  });

  it('BUG-14: filters full RFC1918 172.16-31/12 and hides heartbeats from live feed by default', async () => {
    assert.strictEqual(geoModule.isValidPublicIp('127.0.0.1'), false);
    assert.strictEqual(geoModule.isValidPublicIp('10.12.0.5'), false);
    assert.strictEqual(geoModule.isValidPublicIp('192.168.1.50'), false);
    assert.strictEqual(geoModule.isValidPublicIp('172.16.0.1'), false);
    assert.strictEqual(geoModule.isValidPublicIp('172.20.14.9'), false);
    assert.strictEqual(geoModule.isValidPublicIp('172.31.255.254'), false);
    assert.strictEqual(geoModule.isValidPublicIp('::ffff:172.18.0.5'), false);
    assert.strictEqual(geoModule.isValidPublicIp('fe80::1'), false);
    assert.strictEqual(geoModule.isValidPublicIp('172.15.255.1'), true);
    assert.strictEqual(geoModule.isValidPublicIp('172.32.0.1'), true);
    assert.strictEqual(geoModule.isValidPublicIp('8.8.8.8'), true);

    const vid = `p1-test-hb-${Date.now()}`;
    const sid = `${vid}-s1`;
    await dbModule.ingestEvents(
      [
        { visitorId: vid, sessionId: sid, eventType: 'pageview', pagePath: '/products' },
        { visitorId: vid, sessionId: sid, eventType: 'heartbeat', pagePath: '/products' },
      ],
      { country: 'India', countryCode: 'IN', region: 'WB', city: 'Kolkata' },
      { deviceType: 'mobile', browser: 'Chrome Mobile', os: 'Android' },
      '8.8.4.4'
    );

    const defaultFeed = await statsModule.getRecentEvents({ visitorId: vid, correlateByIp: false, timeRange: 'today' });
    assert.strictEqual(defaultFeed.some((e) => e.event_type === 'heartbeat'), false);
    assert.strictEqual(defaultFeed.some((e) => e.event_type === 'pageview'), true);

    const withHeartbeat = await statsModule.getRecentEvents({
      visitorId: vid,
      correlateByIp: false,
      includeHeartbeat: true,
      timeRange: 'today',
    });
    assert.strictEqual(withHeartbeat.some((e) => e.event_type === 'heartbeat'), true);
  });

  it('BUG-07: flags.ts SQL cumulative copy check matches part-number criteria only', () => {
    const flagsSrc = fs.readFileSync(path.resolve('lib/analytics/flags.ts'), 'utf8');
    assert.ok(flagsSrc.includes("metadata->>'itemType' = 'part_number'"));
    assert.ok(flagsSrc.includes("element_tag = 'part-number'"));
    assert.ok(flagsSrc.includes("LENGTH(BTRIM(COALESCE(element_text, metadata->>'copiedText', ''))) <= 24"));
    assert.ok(flagsSrc.includes("~ '[0-9]'"));
  });

  it('SEC-04: enforces 64KB 413 cap, untrusted origin 403, strict 400 payload validation, batch limit <= 50, and bot 204', async () => {
    const bigPayload = JSON.stringify({ d: 'A'.repeat(66000) });
    for (const handler of [collectRoute.POST, analyticsRoute.POST]) {
      const res413 = await handler(
        new NextRequest('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://www.mmearthmovers.com' },
          body: bigPayload,
        })
      );
      assert.strictEqual(res413.status, 413);

      const res403 = await handler(
        new NextRequest('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://evil-scraper.example' },
          body: JSON.stringify({ d: 'dGVzdA==' }),
        })
      );
      assert.strictEqual(res403.status, 403);

      const res400Raw = await handler(
        new NextRequest('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: { 'content-type': 'text/plain', origin: 'http://localhost:3000' },
          body: '!not-valid-base64-payload!',
        })
      );
      assert.strictEqual(res400Raw.status, 400);

      const overBatch = Array.from({ length: 51 }, (_, idx) => ({
        visitorId: 'p1-test-batch-vid',
        sessionId: 'p1-test-batch-sid',
        eventType: 'click',
        pagePath: `/products?idx=${idx}`,
      }));
      const res400Batch = await handler(
        new NextRequest('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
          body: JSON.stringify({ d: encoderModule.encodePayload(overBatch) }),
        })
      );
      assert.strictEqual(res400Batch.status, 400);

      const resBot = await handler(
        new NextRequest('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
            'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            origin: 'https://www.mmearthmovers.com',
          },
          body: encoderModule.encodePayload([
            {
              visitorId: 'p1-test-bot-should-not-insert',
              sessionId: 'p1-test-bot-s1',
              eventType: 'pageview',
              pagePath: '/products',
            },
          ]),
        })
      );
      assert.strictEqual(resBot.status, 204);
    }

    const botRows = await dbModule.query(
      "SELECT id FROM analytics_events WHERE visitor_id = 'p1-test-bot-should-not-insert'"
    );
    assert.strictEqual(botRows.length, 0);

    const validVid = `p1-test-collect-${Date.now()}`;
    const validRes = await collectRoute.POST(
      new NextRequest('http://localhost:3000/api/collect', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          'user-agent': 'Mozilla/5.0 (Linux; Android 14)',
          origin: 'https://www.mmearthmovers.com',
        },
        body: encoderModule.encodePayload([
          {
            visitorId: validVid,
            sessionId: `${validVid}-s1`,
            eventType: 'pageview',
            pagePath: '/products',
          },
        ]),
      })
    );
    assert.strictEqual(validRes.status, 204);
  });

  it('SEC-06 & OBS-09: records audit logs and enforces 429 after 5 failed login attempts in 15 min per IP', async () => {
    const testIp = '198.51.100.77';
    await dbModule.query('DELETE FROM analytics_audit_logs WHERE actor_ip = $1', [testIp]);

    for (let i = 0; i < 5; i++) {
      const failRes = await analyticsRoute.POST(
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': testIp },
          body: JSON.stringify({ action: 'login', key: 'wrong-passcode' }),
        })
      );
      assert.strictEqual(failRes.status, 401);
    }

    // 6th attempt even with valid key must be rate limited (429)
    const rateLimitedRes = await analyticsRoute.POST(
      new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': testIp },
        body: JSON.stringify({ action: 'login', key: authModule.getAdminKey() }),
      })
    );
    assert.strictEqual(rateLimitedRes.status, 429);
    assert.ok(Number(rateLimitedRes.headers.get('retry-after')) >= 1);

    // Flag mutation records audit trail
    const adminKey = authModule.getAdminKey();
    const flagRes = await flagsRoute.POST(
      new NextRequest('http://localhost:3000/api/flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          action: 'add',
          targetType: 'visitor_id',
          targetValue: 'p1-test-audit-vid',
          flagType: 'suspicious',
        }),
      })
    );
    assert.strictEqual(flagRes.status, 200);

    const auditRows = await dbModule.query(
      "SELECT action, success FROM analytics_audit_logs WHERE actor_ip = $1 OR target_value = 'p1-test-audit-vid' ORDER BY id ASC",
      [testIp]
    );
    assert.ok(auditRows.some((r) => r.action === 'login' && r.success === false));
    assert.ok(auditRows.some((r) => r.action === 'login_rate_limited' && r.success === false));
    assert.ok(auditRows.some((r) => r.action === 'add_flag' && r.success === true));
  });

  it('PROD-01 & BI-01: /api/leads persists PostgreSQL backup when StaticForms fails, tracks delivery status, and stays non-CRM', async () => {
    assert.strictEqual('GET' in leadsRoute, false, 'CRM GET endpoint must not exist');
    assert.strictEqual('PATCH' in leadsRoute, false, 'CRM PATCH endpoint must not exist');

    const prevFetch = globalThis.fetch;
    const vid = `p1-test-lead-${Date.now()}`;

    try {
      // Case 1: StaticForms outage -> DB backup still returns 201 and marks status 'failed'
      globalThis.fetch = async () => new Response('Upstream error', { status: 500 });
      const failForwardRes = await leadsRoute.POST(
        new NextRequest('http://localhost:3000/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source: 'contact_form',
            placement: 'contact_page_form',
            visitorId: vid,
            sessionId: `${vid}-s1`,
            name: 'Test Fleet Buyer',
            contact: 'p1-test-buyer@example.com',
            message: 'Need 4HM hydraulic gear pump quote',
          }),
        })
      );
      assert.strictEqual(failForwardRes.status, 201);
      const failData = await failForwardRes.json();
      assert.strictEqual(failData.ok, true);
      assert.ok(failData.id);
      assert.strictEqual(failData.deliveryStatus, 'failed');

      // Case 2: StaticForms success -> status 'sent' + external_ref persisted
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ id: 'sf_p1_test_999', message: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      const okForwardRes = await leadsRoute.POST(
        new NextRequest('http://localhost:3000/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source: 'targeted_modal',
            placement: 'targeted_loader_modal',
            visitorId: vid,
            sessionId: `${vid}-s2`,
            contact: 'p1-test-9876543210',
            message: 'Loader pin bush kit',
          }),
        })
      );
      assert.strictEqual(okForwardRes.status, 201);
      const okData = await okForwardRes.json();
      assert.strictEqual(okData.deliveryStatus, 'sent');

      const leadRows = await dbModule.query(
        'SELECT delivery_status, external_ref FROM analytics_leads WHERE visitor_id = $1 ORDER BY id ASC',
        [vid]
      );
      assert.strictEqual(leadRows.length, 2);
      assert.strictEqual(leadRows[1].delivery_status, 'sent');
      assert.strictEqual(leadRows[1].external_ref, 'sf_p1_test_999');

      const visitorRows = await dbModule.query(
        'SELECT total_sessions FROM analytics_visitors WHERE visitor_id = $1',
        [vid]
      );
      assert.strictEqual(visitorRows[0].total_sessions, 0);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('BUG-05, BUG-09 & BUG-11: caps conversion <= 100%, splits detail vs listing, uncaps searchSummary, and queries product_events', async () => {
    const sample = productsModule.getProducts()[0];
    const slug = utilsModule.getProductUrlSlug(sample).toLowerCase();
    const catSlug =
      sample.category === 'Motor Grader' || sample.category === 'Grader'
        ? 'grader'
        : sample.category.toLowerCase();
    const detailPath = `/products/${catSlug}/${slug}`;

    const vid = `p1-test-prod-${Date.now()}`;
    const sid = `${vid}-s1`;

    // 1 detail view + 3 detail clicks in SAME session + 2 listing grid clicks + 1 admin click (excluded)
    await dbModule.ingestEvents(
      [
        { visitorId: vid, sessionId: sid, eventType: 'pageview', pagePath: detailPath },
        {
          visitorId: vid,
          sessionId: sid,
          eventType: 'click',
          pagePath: detailPath,
          elementText: 'Enquire Now',
          elementTarget: 'https://wa.me/+918334887009',
          metadata: { productSlug: slug, placement: 'product_detail_hero' },
        },
        {
          visitorId: vid,
          sessionId: sid,
          eventType: 'click',
          pagePath: detailPath,
          elementText: 'Enquire Now',
          elementTarget: 'https://wa.me/+918334887009',
          metadata: { productSlug: slug, placement: 'product_detail_hero' },
        },
        {
          visitorId: vid,
          sessionId: sid,
          eventType: 'click',
          pagePath: '/products',
          elementText: 'Enquire Now',
          elementTarget: 'https://wa.me/+918334887009',
          metadata: { productSlug: slug, placement: 'product_grid_enquire' },
        },
        {
          visitorId: vid,
          sessionId: sid,
          eventType: 'click',
          pagePath: '/admin/analytics',
          elementText: 'Enquire Now',
          elementTarget: 'https://wa.me/+918334887009',
          metadata: { productSlug: slug },
        },
      ],
      { country: 'India', countryCode: 'IN', region: 'WB', city: 'Kolkata' },
      { deviceType: 'desktop', browser: 'Chrome 125', os: 'Windows 10' },
      '8.8.8.8'
    );

    const catalog = await statsModule.getProductEnquiryPerformance('today');
    const item = catalog.products.find((p) => p.slug === slug);
    assert.ok(item, 'Sample product must appear in catalog performance');
    assert.ok(item.conversion_rate <= 100, `Conversion rate must never exceed 100%, got ${item.conversion_rate}`);
    assert.ok(item.detail_enquiries >= 2);
    assert.ok(item.listing_enquiries >= 1);

    // BUG-11: product_events API route queries PostgreSQL directly
    const adminKey = authModule.getAdminKey();
    const peRes = await analyticsRoute.POST(
      new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          view: 'product_events',
          productSlug: slug,
          productTitle: sample.title,
          partNumber: sample.part_number,
          range: 'today',
        }),
      })
    );
    assert.strictEqual(peRes.status, 200);
    const peJson = await peRes.json();
    assert.ok(peJson.events.some((ev) => ev.visitor_id === vid));
    assert.strictEqual(peJson.events.some((ev) => ev.page_path.startsWith('/admin')), false);

    // BUG-09: 55 distinct searches exceed LIMIT 50 and zeroResults tail must be reflected in totalSearches
    const searchBatch = Array.from({ length: 55 }, (_, i) => ({
      visitorId: vid,
      sessionId: sid,
      eventType: 'search',
      pagePath: '/products',
      metadata: {
        query: `p1-test-q-${i}`,
        zeroResults: i >= 52,
        searchSurface: 'products_page',
      },
    }));
    await dbModule.ingestEvents(
      searchBatch,
      { country: 'India', countryCode: 'IN', region: 'WB', city: 'Kolkata' },
      { deviceType: 'mobile', browser: 'Safari', os: 'iOS' },
      '8.8.8.8'
    );

    const dash = await statsModule.getDashboardStats('today');
    assert.ok(
      dash.searchSummary.totalSearches >= 55,
      `Expected uncapped totalSearches >= 55, got ${dash.searchSummary.totalSearches}`
    );
    assert.ok(
      dash.searchSummary.zeroResultsSearches >= 3,
      `Expected uncapped zeroResultsSearches >= 3, got ${dash.searchSummary.zeroResultsSearches}`
    );
  });

  it('Storefront CTAs & Mobile UX: verifies placement attributes, no hardcoded StaticForms secret in browser, and mobile bottom-sheet styles', () => {
    const filesToCheck = [
      'components/WhatsAppButton.tsx',
      'components/ExportInfo.tsx',
      'components/Contact.tsx',
      'components/TargetedAssistanceModal.tsx',
      'components/GlobalSearchModal.tsx',
      'components/ProductsPage.tsx',
      'components/ModelProductGrid.tsx',
      'components/Footer.tsx',
      'components/ComingSoon.tsx',
      'app/not-found.tsx',
      'app/products/[category]/[slug]/page.tsx',
      'app/models/[slug]/page.tsx',
    ];

    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.resolve(rel), 'utf8');
      assert.ok(content.includes('data-placement='), `${rel} must expose data-placement`);
      assert.strictEqual(
        content.includes('sf_fd80e723henagadlica8agki'),
        false,
        `${rel} must not contain hardcoded StaticForms key in client bundle`
      );
      assert.strictEqual(
        content.includes('919443228800'),
        false,
        `${rel} must not contain legacy phone number`
      );
    }

    const contactSrc = fs.readFileSync(path.resolve('components/Contact.tsx'), 'utf8');
    assert.ok(contactSrc.includes("fetch('/api/leads'"));
    assert.ok(contactSrc.includes('text-base sm:text-sm'));

    const modalSrc = fs.readFileSync(path.resolve('components/TargetedAssistanceModal.tsx'), 'utf8');
    assert.ok(modalSrc.includes("fetch('/api/leads'"));
    assert.ok(modalSrc.includes('items-end sm:items-center'));
    assert.ok(modalSrc.includes('rounded-t-3xl sm:rounded-2xl'));
  });
});
