import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {
  inspectHeaderAndNav,
  inspectTabOps,
  inspectProductInspectorDrawer,
  inspectBiPanelsResponsive,
  inspectAdminModularization,
  inspectStorefrontAndSplashTelemetry,
  scanFixedPixelOverflow,
} from './analyzer.mjs';

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
const encoderModule = require('../../lib/analytics/encoder.ts');
const productsModule = require('../../lib/products.ts');
const utilsModule = require('../../lib/utils.ts');
const restrictionsServer = require('../../lib/restrictions-server.ts');
const opsModule = require('../../lib/analytics/ops.ts');
const analyticsRoute = require('../../app/api/analytics/route.ts');

const E2E_RUN_ID = Date.now();
const E2E_IP = '198.51.100.89';
let e2eStartedAt = null;

before(async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const startRow = await dbModule.query('SELECT NOW() AS started_at');
    e2eStartedAt = startRow[0].started_at;
    // Stale-sweep any leftover p2-e2e-% rows from an aborted prior run
    await dbModule.query("DELETE FROM analytics_leads WHERE visitor_id LIKE 'p2-e2e-%' OR contact LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_flags WHERE LOWER(target_value) LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_audit_logs WHERE LOWER(COALESCE(target_value, '')) LIKE 'p2-e2e-%'");
    await dbModule.query(
      "DELETE FROM analytics_alert_deliveries WHERE LOWER(COALESCE(visitor_id, '')) LIKE 'p2-e2e-%' OR LOWER(dedupe_key) LIKE 'p2-e2e-%'"
    );
    await dbModule.query(
      `DELETE FROM analytics_ops_metrics
       WHERE LOWER(COALESCE(metadata->>'visitorId', '')) LIKE 'p2-e2e-%'
          OR LOWER(COALESCE(metadata->>'batchId', '')) LIKE 'p2-e2e-%'
          OR LOWER(target_name) LIKE 'p2-e2e-%'`
    );
  } catch {}
});

after(async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    await opsModule.waitForDetachedOpsContext();
    await dbModule.query("DELETE FROM analytics_leads WHERE visitor_id LIKE 'p2-e2e-%' OR contact LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_visitors WHERE visitor_id LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_flags WHERE LOWER(target_value) LIKE 'p2-e2e-%'");
    await dbModule.query("DELETE FROM analytics_restrictions WHERE LOWER(value) LIKE 'p2-e2e-%' OR value = $1", [E2E_IP]);
    await dbModule.query(
      "DELETE FROM analytics_audit_logs WHERE actor_ip = $1 OR LOWER(COALESCE(target_value, '')) LIKE 'p2-e2e-%'",
      [E2E_IP]
    );
    await dbModule.query(
      "DELETE FROM analytics_alert_deliveries WHERE LOWER(COALESCE(visitor_id, '')) LIKE 'p2-e2e-%' OR LOWER(dedupe_key) LIKE 'p2-e2e-%'"
    );
    await dbModule.query(
      `DELETE FROM analytics_ops_metrics
       WHERE LOWER(COALESCE(metadata->>'visitorId', '')) LIKE 'p2-e2e-%'
          OR LOWER(COALESCE(metadata->>'batchId', '')) LIKE 'p2-e2e-%'
          OR LOWER(target_name) LIKE 'p2-e2e-%'
          OR ($1::timestamptz IS NOT NULL
              AND created_at >= $1::timestamptz
              AND target_name IN (
                '/api/analytics',
                'products_catalog',
                'ip_api',
                'alert_webhook',
                'stats_dashboard_summary',
                'stats_dashboard_behavior',
                'stats_dashboard_sentinel',
                'stats_visitors_list',
                'stats_catalog_clicks',
                'stats_catalog_views',
                'stats_catalog_gaps',
                'stats_ops_metrics',
                'stats_ops_alerts',
                'stats_ops_events',
                'stats_audit_logs'
              ))`,
      [e2eStartedAt]
    );
  } catch {}
  try {
    restrictionsServer.invalidateRestrictionsCache();
    productsModule.invalidateProductsCache();
    await dbModule.getDbPool().end();
  } catch {}
});

test('Tier 5: P2 Telemetry, Ops & Audit Tab, Modularization & E2E Flow Contracts', async (t) => {
  await t.test('5.1 7-Tab Header Strip, Ops Tab, Navigation Anchor & 44px Touch Targets', () => {
    const nav = inspectHeaderAndNav();
    assert.strictEqual(nav.hasOpsTab, true, "Header & page must include 7th 'ops' tab");
    assert.strictEqual(nav.hasAll7Tabs, true, 'All 7 tabs must be present across mobile and desktop nav');
    assert.strictEqual(nav.hasNavAnchorComment, true, 'Navigation Tabs anchor comment must be preserved');
    assert.strictEqual(nav.mobileTabStrip.has44pxTouchTargets, true, 'Mobile tab targets must be >= 44px');
    assert.strictEqual(nav.desktopTabStrip.hasDesktopTabStrip, true);
  });

  await t.test('5.2 Tab 7 Ops & Audit (OpsHealthTab.tsx) Responsive Panels & Touch Targets', () => {
    const ops = inspectTabOps();
    assert.strictEqual(ops.hasMobileCards, true, 'OpsHealthTab must render mobile cards (md:hidden)');
    assert.strictEqual(ops.hasDesktopTable, true, 'OpsHealthTab must render desktop tables (hidden md:block)');
    assert.strictEqual(ops.has44pxControls, true, 'OpsHealthTab controls must meet min-h-[44px]');
    assert.strictEqual(ops.hasOpsPanels, true, 'OpsHealthTab must render all 10 operational/audit panels');
  });

  await t.test('5.3 ProductInspectorDrawer Responsive Bottom-Sheet / Drawer & BI-05 Signals', () => {
    const drawer = inspectProductInspectorDrawer();
    assert.strictEqual(drawer.exists, true);
    assert.strictEqual(drawer.hasBottomSheet, true, 'Drawer must render mobile bottom sheet');
    assert.strictEqual(drawer.hasDesktopDrawer, true, 'Drawer must render desktop side drawer');
    assert.strictEqual(drawer.has44pxTargets, true, 'Drawer interactive controls must meet min-h-[44px]');
    assert.strictEqual(drawer.hasDirectProductEventsQuery, true);
    assert.strictEqual(drawer.hasBi05Signals, true);
    assert.strictEqual(drawer.isCompliant, true);
  });

  await t.test('5.4 All 5 New M2/M3 BI Panels Paired Mobile/Desktop Layouts & Unified clusters.ts', () => {
    const bi = inspectBiPanelsResponsive();
    for (const [name, status] of Object.entries(bi.panels)) {
      assert.strictEqual(status.found, true, `BI panel ${name} must exist`);
      assert.strictEqual(status.hasMobileCards, true, `BI panel ${name} must render mobile cards`);
      assert.strictEqual(status.hasDesktopTable, true, `BI panel ${name} must render desktop table`);
    }
    assert.strictEqual(bi.clustersUnified, true, 'AudienceGeoTab & VisitorsTab must import unified clusters.ts');
    assert.strictEqual(bi.isCompliant, true);
  });

  await t.test('5.5 Admin Modularization, Visibility-Paused Polling, Zero CRM & Zero 375/390/414px Overflow', () => {
    const mod = inspectAdminModularization();
    assert.strictEqual(mod.isPageModularized, true, `Missing components: ${mod.missingComponents.join(', ')}`);
    assert.strictEqual(mod.hasTypesAndHooks, true);
    assert.strictEqual(mod.hasTypesEnquireClicks, true, 'ProductEnquiryStat.enquire_clicks must be preserved');
    assert.strictEqual(mod.hasVisibilityPause, true, 'useAnalyticsPolling must pause when document is hidden');
    assert.strictEqual(mod.hasActiveTabScopedPolling, true, 'Polling must refresh summary + active tab only');
    assert.strictEqual(mod.zeroCrm, true, `Unexpected CRM references: ${mod.crmHits.join(', ')}`);

    for (const width of [375, 390, 414]) {
      const scan = scanFixedPixelOverflow(width);
      assert.strictEqual(
        scan.hasViolations,
        false,
        `Fixed-pixel overflow at ${width}px: ${JSON.stringify(scan.violations)}`
      );
    }
  });

  await t.test('5.6 Storefront & Splash Telemetry Contracts (BI-04/05/07/08, OBS-06/07) & PROD-02/PROD-04 Untouched', () => {
    const sf = inspectStorefrontAndSplashTelemetry();
    assert.strictEqual(sf.prod02Untouched, true, 'PROD-02 dark Coming Soon UI must remain untouched');
    assert.strictEqual(sf.prod04Untouched, true, 'PROD-04 LoadingScreen 3000/12000 timers must remain untouched');
    assert.strictEqual(sf.bi04Compliant, true);
    assert.strictEqual(sf.bi05Compliant, true);
    assert.strictEqual(sf.bi07Compliant, true);
    assert.strictEqual(sf.bi08Compliant, true);
    assert.strictEqual(sf.obs07Compliant, true);
    assert.strictEqual(sf.obs06Compliant, true);
    assert.strictEqual(sf.allCompliant, true);
  });

  await t.test('5.7 End-to-End P2 Telemetry Ingestion & Admin View Round-Trip (p2-e2e-*)', async () => {
    assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be configured for E2E DB round-trip');

    const allProducts = productsModule.getProducts();
    const imageless = allProducts.find((p) => !p.image || !String(p.image).trim());
    const imaged = allProducts.find((p) => Boolean(p.image && String(p.image).trim()));
    assert.ok(imageless && imaged);
    const imagelessSlug = utilsModule.getProductUrlSlug(imageless).toLowerCase();
    const imagedSlug = utilsModule.getProductUrlSlug(imaged).toLowerCase();
    const imagedCat =
      imaged.category === 'Motor Grader' || imaged.category === 'Grader'
        ? 'grader'
        : imaged.category.toLowerCase();
    const imagedPath = `/products/${imagedCat}/${imagedSlug}`;

    const vid = `p2-e2e-${E2E_RUN_ID}`;
    const sid = `${vid}-s1`;

    const encodedBatch = encoderModule.encodePayload([
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'client_ops',
        pagePath: '/products',
        metadata: { target: 'ipapi_co', outcome: 'ok', statusCode: 200, durationMs: 88 },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'placeholder_impression',
        pagePath: '/products',
        metadata: { productSlug: imagelessSlug, hasImage: false, surface: 'catalog_card' },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'image_zoom',
        pagePath: imagedPath,
        metadata: { action: 'open', productSlug: imagedSlug, productTitle: imaged.title },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'image_zoom',
        pagePath: imagedPath,
        metadata: { action: 'close', productSlug: imagedSlug, durationMs: 1800 },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'spec_toggle',
        pagePath: imagedPath,
        metadata: { open: true, productSlug: imagedSlug },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'related_product_click',
        pagePath: '/products/loader/src-sku',
        metadata: { sourceProductSlug: 'src-sku', targetProductSlug: imagedSlug, targetTitle: imaged.title },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'export_banner_view',
        pagePath: imagedPath,
        metadata: { country: 'Singapore', countryCode: 'SG', pagePath: imagedPath },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'pageview',
        pagePath: '/models/hm-2021',
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'model_faq_accordion_toggle',
        pagePath: '/models/hm-2021',
        metadata: { open: true, machineSlug: 'hm-2021', question: `E2E FAQ ${E2E_RUN_ID}` },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'model_sibling_switcher_card',
        pagePath: '/models/hm-2021',
        metadata: { sourceMachineSlug: 'hm-2021', targetMachineSlug: 'hm-2071', targetMachineName: 'HM 2071' },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'video_play',
        pagePath: '/',
        metadata: { videoIndex: 0, trigger: 'auto', isMobile: false },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'video_switch',
        pagePath: '/',
        metadata: { videoIndex: 1, trigger: 'next', isMobile: false },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'video_complete',
        pagePath: '/',
        metadata: { videoIndex: 0, trigger: 'auto', isMobile: false },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'loading_screen_timing',
        pagePath: '/',
        metadata: {
          waitDurationMs: 3100,
          hitFallback12s: false,
          dismissedNormally: true,
          bouncedBeforeDismiss: false,
          isMobile: false,
        },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'client_error',
        pagePath: '/products',
        metadata: { kind: 'runtime', message: `p2-e2e-err-${E2E_RUN_ID}`, source: '/products' },
      },
      {
        visitorId: vid,
        sessionId: sid,
        eventType: 'not_found',
        pagePath: `/products/p2-e2e-404-${E2E_RUN_ID}`,
        metadata: { requestedPath: `/products/p2-e2e-404-${E2E_RUN_ID}`, inferredPartNumber: '4729012' },
      },
    ]);

    const ingestRes = await analyticsRoute.POST(
      new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
        },
        body: JSON.stringify({ d: encodedBatch, batchId: `p2-e2e-batch-${E2E_RUN_ID}` }),
      })
    );
    assert.strictEqual(ingestRes.status, 204);

    await dbModule.query(
      `INSERT INTO analytics_audit_logs (actor_ip, actor_label, action, target_type, target_value, success, metadata)
       VALUES ($1, 'admin', 'p2_e2e_audit', 'system', $2, true, '{}'::jsonb)`,
      [E2E_IP, `p2-e2e-audit-${E2E_RUN_ID}`]
    );

    const adminKey = authModule.getAdminKey();
    const postAdmin = async (payload) => {
      const res = await analyticsRoute.POST(
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminKey}` },
          body: JSON.stringify(payload),
        })
      );
      assert.strictEqual(res.status, 200);
      return await res.json();
    };

    const summary = await postAdmin({ view: 'summary', timeRange: 'today' });
    assert.ok(summary.productEngagementStats.zoomOpens >= 1);
    assert.ok(summary.exportFunnelStats.bannerViews >= 1);
    assert.ok(summary.modelHubStats.faqToggles >= 1);
    assert.ok(summary.cohortRetentionStats.cohorts.length === 3);

    const catalog = await postAdmin({ view: 'catalog', timeRange: 'today' });
    assert.ok(catalog.catalogHealthGaps.missingPhotoImpressions >= 1);

    const visitors = await postAdmin({ view: 'visitors', timeRange: 'today', search: vid });
    assert.strictEqual(visitors.totalCount, 1);

    const opsHealth = await postAdmin({ view: 'ops_health', timeRange: 'today' });
    assert.ok(opsHealth.ingestStats.totalBatches >= 1);
    assert.ok(opsHealth.externalSlas.some((e) => e.targetName === 'ipapi_co'));
    assert.ok(opsHealth.loadingScreen.samples >= 1);
    assert.ok(opsHealth.clientErrors.totalErrors >= 1);
    assert.ok(opsHealth.notFoundPaths.some((p) => p.path === `/products/p2-e2e-404-${E2E_RUN_ID}`));

    const auditLogs = await postAdmin({ view: 'audit_logs', limit: 20, offset: 0 });
    assert.ok(auditLogs.logs.some((l) => l.target_value === `p2-e2e-audit-${E2E_RUN_ID}`));
  });
});
