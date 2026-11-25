import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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
const productsModule = require('../../lib/products.ts');
const utilsModule = require('../../lib/utils.ts');
const restrictionsServer = require('../../lib/restrictions-server.ts');
const flagsRoute = require('../../app/api/flags/route.ts');
const restrictionsRoute = require('../../app/api/restrictions/route.ts');
const analyticsRoute = require('../../app/api/analytics/route.ts');
const internalRestrictionsRoute = require('../../app/api/internal/restrictions/route.ts');
const visitorStatusRoute = require('../../app/api/visitor-status/route.ts');
const searchRoute = require('../../app/api/products/search/route.ts');
const callbackRoute = require('../../app/api/callback/route.ts');

describe('P0 Release Verification Suite', () => {
  after(async () => {
    try {
      await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p0-test-%'");
      await dbModule.query("DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p0-test-%'");
    } catch {}
    try {
      await dbModule.getDbPool().end();
    } catch {}
  });

  it('SEC-02: fails closed in production without ADMIN_ANALYTICS_KEY and signs/verifies HMAC cookies safely', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevKey = process.env.ADMIN_ANALYTICS_KEY;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_ANALYTICS_KEY;
      assert.strictEqual(authModule.verifyAdminKey('mmearth@2026'), false);
      assert.strictEqual(authModule.createSignedSessionToken(), null);
      assert.strictEqual(authModule.getInternalApiSecret(), null);

      process.env.ADMIN_ANALYTICS_KEY = 'test-prod-secret-key';
      assert.strictEqual(authModule.verifyAdminKey('test-prod-secret-key'), true);
      assert.strictEqual(authModule.verifyAdminKey('mmearth@2026'), false);

      const token = authModule.createSignedSessionToken();
      assert.ok(token, 'Expected signed session token');
      const [expStr] = token.split('.');
      assert.ok(Number(expStr) < 10_000_000_000, 'exp must be Unix seconds');

      assert.strictEqual(authModule.verifySignedSessionToken(token), true);
      // Reject plaintext key as cookie
      assert.strictEqual(authModule.verifySignedSessionToken('test-prod-secret-key'), false);
      // Reject short/malformed signatures without throwing RangeError
      assert.strictEqual(authModule.verifySignedSessionToken(`${expStr}.abc.short`), false);
      assert.strictEqual(authModule.verifySignedSessionToken('invalid'), false);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKey === undefined) delete process.env.ADMIN_ANALYTICS_KEY;
      else process.env.ADMIN_ANALYTICS_KEY = prevKey;
    }
  });

  it('SEC-01: gates GET /api/flags and GET /api/restrictions and sanitizes public ?check=status', async () => {
    const flagsUnauth = await flagsRoute.GET(new NextRequest('http://localhost:3000/api/flags'));
    assert.strictEqual(flagsUnauth.status, 401);

    const restUnauth = await restrictionsRoute.GET(
      new NextRequest('http://localhost:3000/api/restrictions')
    );
    assert.strictEqual(restUnauth.status, 401);

    const key = authModule.getAdminKey();
    const restAuth = await restrictionsRoute.GET(
      new NextRequest('http://localhost:3000/api/restrictions', {
        headers: { authorization: `Bearer ${key}` },
      })
    );
    assert.strictEqual(restAuth.status, 200);
    assert.strictEqual(restAuth.headers.get('cache-control'), 'private, no-store');

    const statusPublic = await analyticsRoute.GET(
      new NextRequest('http://localhost:3000/api/analytics?check=status')
    );
    assert.strictEqual(statusPublic.status, 200);
    const statusJson = await statusPublic.json();
    assert.strictEqual('databaseError' in statusJson, false);
  });

  it('SEC-03 & PROD-05: Edge middleware has zero pg/Node crypto imports, internal endpoint fails closed, and DB restrictions enforce case-insensitively', async () => {
    const middlewareSrc = fs.readFileSync(path.resolve('middleware.ts'), 'utf8');
    assert.strictEqual(/from\s+['"]pg['"]|require\(['"]pg['"]\)/.test(middlewareSrc), false);
    assert.strictEqual(/from\s+['"](node:)?crypto['"]/.test(middlewareSrc), false);
    assert.ok(middlewareSrc.includes('/api/internal/restrictions'));

    const internalUnauth = await internalRestrictionsRoute.GET(
      new NextRequest('http://localhost:3000/api/internal/restrictions')
    );
    assert.strictEqual(internalUnauth.status, 401);

    const internalSecret = authModule.getInternalApiSecret();
    assert.ok(internalSecret);
    const internalAuth = await internalRestrictionsRoute.GET(
      new NextRequest('http://localhost:3000/api/internal/restrictions', {
        headers: { 'x-internal-secret': internalSecret },
      })
    );
    assert.strictEqual(internalAuth.status, 200);

    try {
      const rec1 = await dbModule.addRestriction('visitor_id', 'p0-test-Case-Vid', 'first');
      const rec2 = await dbModule.addRestriction('visitor_id', 'P0-TEST-CASE-VID', 'updated');
      assert.strictEqual(rec1.value, 'p0-test-case-vid');
      assert.strictEqual(rec2.value, 'p0-test-case-vid');
      assert.strictEqual(rec2.note, 'updated');
      restrictionsServer.invalidateRestrictionsCache();

      const statusRes = await visitorStatusRoute.GET(
        new NextRequest('http://localhost:3000/api/visitor-status?vid=P0-TEST-CASE-VID')
      );
      const statusData = await statusRes.json();
      assert.strictEqual(statusData.restricted, true);

      const searchRes = await searchRoute.GET(
        new NextRequest('http://localhost:3000/api/products/search', {
          headers: { cookie: 'mm_vid=P0-TEST-CASE-VID' },
        })
      );
      const searchData = await searchRes.json();
      assert.deepStrictEqual(searchData, []);
    } finally {
      await dbModule.removeRestriction('P0-TEST-CASE-VID');
      restrictionsServer.invalidateRestrictionsCache();
    }
  });

  it('SEC-05: OAuth /api/callback script blocks untrusted postMessage origins and allows trusted origins', async () => {
    const prevId = process.env.OAUTH_CLIENT_ID;
    const prevSecret = process.env.OAUTH_CLIENT_SECRET;
    const prevFetch = globalThis.fetch;

    try {
      process.env.OAUTH_CLIENT_ID = 'test-client';
      process.env.OAUTH_CLIENT_SECRET = 'test-secret';
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ access_token: 'gho_test_token_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      const res = await callbackRoute.GET(
        new Request('https://www.mmearthmovers.com/api/callback?code=abc')
      );
      const html = await res.text();
      const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
      assert.ok(scriptMatch, 'Expected inline script in OAuth callback HTML');

      const sent = [];
      let listener = null;
      const sandbox = {
        window: {
          location: { origin: 'https://www.mmearthmovers.com' },
          opener: {
            postMessage: (msg, origin) => sent.push({ msg, origin }),
          },
          addEventListener: (evt, fn) => {
            if (evt === 'message') listener = fn;
          },
          removeEventListener: () => {},
        },
      };
      vm.runInNewContext(scriptMatch[1], sandbox);
      assert.strictEqual(typeof listener, 'function');

      // Initial handshake only, no token yet
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].msg, 'authorizing:github');

      // Untrusted origin must be ignored
      listener({ origin: 'https://evil.example' });
      assert.strictEqual(sent.length, 1);

      // Trusted origins succeed
      listener({ origin: 'https://preview-123.vercel.app' });
      assert.strictEqual(sent.length, 2);
      assert.ok(sent[1].msg.includes('gho_test_token_123'));
      assert.strictEqual(sent[1].origin, 'https://preview-123.vercel.app');

      listener({ origin: 'http://127.0.0.1:3000' });
      assert.strictEqual(sent.length, 3);
      assert.strictEqual(sent[2].origin, 'http://127.0.0.1:3000');
    } finally {
      globalThis.fetch = prevFetch;
      if (prevId === undefined) delete process.env.OAUTH_CLIENT_ID;
      else process.env.OAUTH_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.OAUTH_CLIENT_SECRET;
      else process.env.OAUTH_CLIENT_SECRET = prevSecret;
    }
  });

  it('BUG-01, BUG-02, BUG-03, BUG-04, BUG-06, BUG-08: DB ingestion increments sessions accurately and stats queries return clean numbers', async () => {
    const vid = `p0-test-visitor-${Date.now()}`;
    const s1 = `p0-test-s1-${Date.now()}`;
    const s2 = `p0-test-s2-${Date.now()}`;
    const sampleProduct = productsModule.getProducts()[0];
    assert.ok(sampleProduct, 'Expected at least one catalog product');
    const catSlug =
      sampleProduct.category === 'Motor Grader' || sampleProduct.category === 'Grader'
        ? 'grader'
        : sampleProduct.category.toLowerCase().trim();
    const canonicalSlug = utilsModule.getProductUrlSlug(sampleProduct).toLowerCase();
    const productPath = `/products/${catSlug}/${canonicalSlug}`;
    const dwellPath = `/p0-test-dwell-${Date.now()}`;

    try {
      const beforeCatalog = await statsModule.getProductEnquiryPerformance('today');
      const beforeProd = beforeCatalog.products.find((p) => p.slug === canonicalSlug);
      const viewsBefore = beforeProd ? beforeProd.views : 0;

      // Same session twice -> total_sessions must be 1
      await dbModule.ingestEvents(
        [
          { visitorId: vid, sessionId: s1, eventType: 'pageview', pagePath: `${productPath}?utm_source=test` },
          { visitorId: vid, sessionId: s1, eventType: 'pageview', pagePath: `${dwellPath}?utm_source=test` },
          { visitorId: vid, sessionId: s1, eventType: 'section_view', pagePath: `${dwellPath}?utm_source=test`, metadata: { sectionId: 'specs', dwellSeconds: 30 } },
          { visitorId: vid, sessionId: s1, eventType: 'section_view', pagePath: `${dwellPath}/`, metadata: { sectionId: 'faq', dwellSeconds: 50 } },
        ],
        { country: 'India', countryCode: 'IN', city: 'Kolkata' },
        { deviceType: 'desktop', browser: 'Chrome', os: 'Windows' },
        '127.0.0.1'
      );
      await dbModule.ingestEvents(
        [{ visitorId: vid, sessionId: s1, eventType: 'click', pagePath: `${productPath}?utm_source=test`, elementTarget: 'https://wa.me/918334887009' }],
        { country: 'India', countryCode: 'IN', city: 'Kolkata' },
        { deviceType: 'desktop', browser: 'Chrome', os: 'Windows' },
        '127.0.0.1'
      );

      let rows = await dbModule.query('SELECT total_sessions FROM analytics_visitors WHERE visitor_id = $1', [vid]);
      assert.strictEqual(Number(rows[0].total_sessions), 1);

      // Second distinct session -> total_sessions must become 2
      await dbModule.ingestEvents(
        [{ visitorId: vid, sessionId: s2, eventType: 'pageview', pagePath: `${productPath}/` }],
        { country: 'India', countryCode: 'IN', city: 'Kolkata' },
        { deviceType: 'desktop', browser: 'Chrome', os: 'Windows' },
        '127.0.0.1'
      );

      rows = await dbModule.query('SELECT total_sessions FROM analytics_visitors WHERE visitor_id = $1', [vid]);
      assert.strictEqual(Number(rows[0].total_sessions), 2);

      // Verify stats query normalization for BUG-03 & BUG-04
      const stats = await statsModule.getDashboardStats('today');
      assert.strictEqual(typeof stats.kpis.avgDurationSeconds, 'number');
      assert.ok(Array.isArray(stats.pageDwellStats));
      const matchedPage = stats.pageDwellStats.find((p) => p.page_path === dwellPath);
      assert.ok(matchedPage, 'Expected normalized test dwell page in pageDwellStats');
      assert.strictEqual(Number(matchedPage.views), 1);
      assert.strictEqual(Number(matchedPage.avg_dwell_seconds), 40);

      const afterCatalog = await statsModule.getProductEnquiryPerformance('today');
      const afterProd = afterCatalog.products.find((p) => p.slug === canonicalSlug);
      assert.ok(afterProd && afterProd.views >= viewsBefore + 2, 'Expected UTM and trailing-slash views to increment product views by >= 2');
    } finally {
      await dbModule.query('DELETE FROM analytics_visitors WHERE visitor_id = $1', [vid]);
    }
  });

  it('BUG-06, BUG-08, BUG-10: source invariants for part_copies_count nullish fallback, dashboard scorecard, and modal error guard', () => {
    const statsSrc = fs.readFileSync(path.resolve('lib/analytics/stats.ts'), 'utf8');
    assert.strictEqual(statsSrc.includes('Number(s.part_copies_count) || copies'), false);
    assert.ok(statsSrc.includes('LEAD_CLICK_SQL'));

    const pageSrc = fs.readFileSync(path.resolve('app/admin/analytics/page.tsx'), 'utf8');
    assert.strictEqual(pageSrc.includes('{chartTotals.totalVisitors.toLocaleString()}'), false);
    assert.ok(pageSrc.includes('Avg. Section Dwell'));

    const modalSrc = fs.readFileSync(path.resolve('components/TargetedAssistanceModal.tsx'), 'utf8');
    assert.ok(modalSrc.includes('!res.ok'));
    assert.ok(
      modalSrc.includes('form_submit_error') || modalSrc.includes("trackForm('submit_error'")
    );
  });
});
