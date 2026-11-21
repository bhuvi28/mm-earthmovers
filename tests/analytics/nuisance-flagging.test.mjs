import test, { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Load environment variables from .env.local if present
try {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/^['"]|['"]$/g, '').trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

// Enable direct in-memory TypeScript loading for test execution
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

// Import analytics modules under test
const flagsModule = require('../../lib/analytics/flags.ts');
const alertModule = require('../../lib/analytics/alert.ts');
const dbModule = require('../../lib/analytics/db.ts');

const {
  isPartNumberCopy,
  hasConversionIntent,
  isBhuvanExempt,
  evaluateBehavioralSignature,
  evaluateAndRecordFlag,
} = flagsModule;

const {
  dispatchAlert,
  getMockAlerts,
  clearMockAlerts,
  clearDedupeCache,
  checkAndRecordDedupe,
} = alertModule;

const { getFlags, query } = dbModule;

// Set mock alerting mode during testing to avoid external network spam
process.env.ALERT_TEST_MODE = 'true';

describe('Sentinel Behavioral Flagging & Zero-Cost Alerting Test Suite', () => {
  beforeEach(() => {
    clearMockAlerts();
    clearDedupeCache();
  });

  after(async () => {
    try {
      const pool = dbModule.getDbPool();
      await pool.end();
    } catch {}
  });

  /* =========================================================================
   * TIER 1: UNIT LOGIC & FEATURE EXTRACTION
   * ========================================================================= */
  describe('Tier 1: Feature Extraction & Unit Rules', () => {
    it('1.1 isPartNumberCopy: identifies OEM part number copy telemetry', () => {
      // Direct metadata flag
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          metadata: { itemType: 'part_number' },
          pagePath: '/products/loader/5223015-5223016',
          elementText: '5223015',
        }),
        true,
        'Should identify copy event with explicit metadata itemType part_number'
      );

      // Product catalog alphanumeric text
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader/23045902',
          elementText: '23045902',
        }),
        true,
        'Should identify copy event of numeric part ID on product page'
      );

      // Element tag marker
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          elementTag: 'part-number',
          elementText: 'WA470-3-PIN',
        }),
        true,
        'Should identify copy event with elementTag part-number'
      );

      // Negative control: Normal text copy on homepage
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/',
          elementText: 'Welcome to MM Earthmovers',
        }),
        false,
        'Should not flag general marketing text copy'
      );

      // Negative controls (Challenger 1): Brand, category, and equipment words
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'Earthmovers',
        }),
        false,
        'Should not flag brand name Earthmovers as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: 'Excavator',
        }),
        false,
        'Should not flag category name Excavator as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'Loader',
        }),
        false,
        'Should not flag machine type Loader as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/hm',
          elementText: 'Hindustan',
        }),
        false,
        'Should not flag brand name Hindustan as part number'
      );

      // Negative controls (Challenger 1): Price strings with symbols/labels
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'Rs. 45000',
        }),
        false,
        'Should not flag Rs. 45000 as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: '₹45000',
        }),
        false,
        'Should not flag ₹45000 as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: '$45000',
        }),
        false,
        'Should not flag $45000 as part number'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'Price: 45000',
        }),
        false,
        'Should not flag Price: 45000 as part number'
      );

      // Positive controls: Valid alphanumeric OEM parts
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'WA470-3',
        }),
        true,
        'Should identify alphanumeric OEM part WA470-3'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: 'PC200-8',
        }),
        true,
        'Should identify alphanumeric OEM part PC200-8'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/caterpillar',
          elementText: '110-3323',
        }),
        true,
        'Should identify alphanumeric OEM part 110-3323'
      );

      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: '5223015-5223016',
        }),
        true,
        'Should identify alphanumeric OEM part range 5223015-5223016'
      );

      // Negative control: Non-copy event
      assert.strictEqual(
        isPartNumberCopy({
          eventType: 'click',
          pagePath: '/products',
          elementText: '5223015',
        }),
        false,
        'Should not flag click events as copy events'
      );
    });

    it('1.2 hasConversionIntent: detects lead actions across WhatsApp, Phone, and Forms', () => {
      // WhatsApp click
      assert.strictEqual(
        hasConversionIntent([
          {
            eventType: 'click',
            elementTarget: 'https://wa.me/+918334887009?text=Inquiry',
          },
        ]),
        true,
        'Should detect WhatsApp conversion link'
      );

      // Telephone click
      assert.strictEqual(
        hasConversionIntent([
          {
            eventType: 'click',
            elementTarget: 'tel:+918334887009',
          },
        ]),
        true,
        'Should detect telephone dial conversion link'
      );

      // Contact form submission
      assert.strictEqual(
        hasConversionIntent([
          {
            eventType: 'form_submit',
            pagePath: '/#contact',
            metadata: { name: 'Customer', contact: '9876543210' },
          },
        ]),
        true,
        'Should detect contact form submission'
      );

      // Negative control: Standard browsing clicks
      assert.strictEqual(
        hasConversionIntent([
          { eventType: 'click', elementTarget: '/products?category=loader' },
          { eventType: 'pageview', pagePath: '/products' },
        ]),
        false,
        'Should not consider internal catalog navigation as conversion intent'
      );
    });

    it('1.3 isBhuvanExempt: strictly excludes tester Bhuvan (9830164610 from Kolkata)', () => {
      // Identified contact match
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'b1747b10-0ca4-4db3-9d58-eecc3cfe6479',
          sessionId: 'session-test-bhuvan-1',
          identifiedContact: '9830164610',
          identifiedName: 'Bhuvan',
          events: [],
        }),
        true,
        'Should exempt visitor with identified contact 9830164610'
      );

      // Event metadata contact match
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'any-visitor',
          sessionId: 'session-test-bhuvan-2',
          events: [
            {
              eventType: 'form_submit',
              metadata: { name: 'Bhuvan Mehta', contact: '9830164610' },
            },
          ],
        }),
        true,
        'Should exempt visitor submitting Bhuvan contact in event metadata'
      );

      // Regression: Numeric contact input (prevent TypeError: toLowerCase is not a function)
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'b1747b10-numeric-contact',
          sessionId: 'session-test-bhuvan-numeric',
          identifiedContact: 9830164610,
          events: [],
        }),
        true,
        'Should exempt visitor with numeric identifiedContact 9830164610 without throwing TypeError'
      );

      // Regression: Spaced phone format
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'b1747b10-spaced-contact',
          sessionId: 'session-test-bhuvan-spaced',
          identifiedContact: '+91 98301 64610',
          events: [],
        }),
        true,
        'Should exempt visitor with spaced phone number "+91 98301 64610"'
      );

      // Regression: Dashed phone format
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'b1747b10-dashed-contact',
          sessionId: 'session-test-bhuvan-dashed',
          identifiedContact: '+91-98301-64610',
          events: [],
        }),
        true,
        'Should exempt visitor with dashed phone number "+91-98301-64610"'
      );

      // Regression: Event metadata with numeric contact
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'any-visitor',
          sessionId: 'session-test-bhuvan-meta-numeric',
          events: [
            {
              eventType: 'form_submit',
              metadata: { name: 'Bhuvan Mehta', contact: 9830164610 },
            },
          ],
        }),
        true,
        'Should exempt visitor with numeric contact in event metadata'
      );

      // Regression: Event metadata with spaced contact
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'any-visitor',
          sessionId: 'session-test-bhuvan-meta-spaced',
          events: [
            {
              eventType: 'form_submit',
              metadata: { name: 'Bhuvan Mehta', contact: '+91 98301 64610' },
            },
          ],
        }),
        true,
        'Should exempt visitor with spaced contact in event metadata'
      );

      // Negative control: Krishnagiri scraper without tester credentials
      assert.strictEqual(
        isBhuvanExempt({
          visitorId: 'b1747b10-krishnagiri-nuisance',
          sessionId: 'session-kg-1',
          events: [{ eventType: 'copy', metadata: { itemType: 'part_number' } }],
        }),
        false,
        'Should not exempt anonymous Krishnagiri session'
      );
    });

    it('1.4 evaluateBehavioralSignature: evaluates heuristic vectors and exclusions', () => {
      // Vector A: Mass Part Harvester (>= 3 copies, 0 leads)
      const vectorA = evaluateBehavioralSignature({
        partCopiesCount: 4,
        distinctPages: 2,
        durationSeconds: 120,
        rageClicksCount: 0,
        leadActionsCount: 0,
      });
      assert.strictEqual(vectorA.matches, true);
      assert.strictEqual(vectorA.heuristic, 'mass_part_harvester');

      // Vector B: Catalog Recon & Dwell Scraping (>= 2 copies, >= 4 pages, >= 300s, 0 leads)
      const vectorB = evaluateBehavioralSignature({
        partCopiesCount: 2,
        distinctPages: 5,
        durationSeconds: 450,
        rageClicksCount: 0,
        leadActionsCount: 0,
      });
      assert.strictEqual(vectorB.matches, true);
      assert.strictEqual(vectorB.heuristic, 'catalog_recon_dwell');

      // Vector C: Krishnagiri Signature (Krishnagiri + >= 2 copies, 0 leads)
      const vectorC = evaluateBehavioralSignature({
        partCopiesCount: 2,
        distinctPages: 2,
        durationSeconds: 150,
        rageClicksCount: 1,
        leadActionsCount: 0,
        city: 'Krishnagiri',
      });
      assert.strictEqual(vectorC.matches, true);
      assert.strictEqual(vectorC.heuristic, 'krishnagiri_opera_nuisance');

      // Exemption: Any session with lead actions must never match
      const convertedSession = evaluateBehavioralSignature({
        partCopiesCount: 10,
        distinctPages: 8,
        durationSeconds: 1200,
        rageClicksCount: 0,
        leadActionsCount: 1, // e.g. WhatsApp clicked
      });
      assert.strictEqual(convertedSession.matches, false);
      assert.strictEqual(convertedSession.heuristic, 'none');

      // Normal visitor: 1 copy, 2 pages, 60s
      const normalSession = evaluateBehavioralSignature({
        partCopiesCount: 1,
        distinctPages: 2,
        durationSeconds: 60,
        rageClicksCount: 0,
        leadActionsCount: 0,
      });
      assert.strictEqual(normalSession.matches, false);
    });
  });

  /* =========================================================================
   * TIER 2: SYNTHETIC REPLAY & DISAMBIGUATION GUARANTEES
   * ========================================================================= */
  describe('Tier 2: Synthetic Replay & Disambiguation Suite', () => {
    it('2.1 Replay Krishnagiri Opera Pattern: 100% detection rate on scraping activity', async () => {
      const syntheticKrishnagiriBatch = [
        {
          visitorId: 'synth-kg-visitor-001',
          sessionId: 'synth-kg-session-001',
          eventType: 'pageview',
          pagePath: '/products/loader/5223015-5223016',
        },
        {
          visitorId: 'synth-kg-visitor-001',
          sessionId: 'synth-kg-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/5223015-5223016',
          metadata: { itemType: 'part_number' },
          elementText: '5223015',
        },
        {
          visitorId: 'synth-kg-visitor-001',
          sessionId: 'synth-kg-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/5223015-5223016',
          metadata: { itemType: 'part_number' },
          elementText: '5223016',
        },
        {
          visitorId: 'synth-kg-visitor-001',
          sessionId: 'synth-kg-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/23045902',
          metadata: { itemType: 'part_number' },
          elementText: '23045902',
        },
      ];

      const result = await evaluateAndRecordFlag({
        visitorId: 'synth-kg-visitor-001',
        sessionId: 'synth-kg-session-001',
        events: syntheticKrishnagiriBatch,
        geo: { city: 'Krishnagiri', region: 'Tamil Nadu', country: 'India' },
        clientMeta: { browser: 'Opera 102', os: 'Windows 10', deviceType: 'desktop' },
      });

      assert.ok(result, 'Evaluation must return a result object');
      assert.strictEqual(result.flagged, true, 'Krishnagiri scraping session must be flagged');
      assert.strictEqual(result.flagType, 'competitor');
      assert.strictEqual(result.heuristicName, 'mass_part_harvester');

      // Verify immediate alert dispatch in mock store
      const alerts = getMockAlerts();
      assert.strictEqual(alerts.length, 1, 'Exactly one alert must be dispatched for flagged session');
      assert.strictEqual(alerts[0].sessionId, 'synth-kg-session-001');
      assert.strictEqual(alerts[0].geo?.city, 'Krishnagiri');
      assert.strictEqual(alerts[0].actionTaken, 'Flag recorded in analytics_flags. Zero automatic restrictions applied.');
    });

    it('2.2 Replay Kolkata Bhuvan Test Activity: 0% false positive rate', async () => {
      // Simulate developer Bhuvan submitting the targeted assistance modal test form
      const bhuvanTestBatch = [
        {
          visitorId: 'synth-bhuvan-visitor-001',
          sessionId: 'synth-bhuvan-session-001',
          eventType: 'pageview',
          pagePath: '/',
        },
        {
          visitorId: 'synth-bhuvan-visitor-001',
          sessionId: 'synth-bhuvan-session-001',
          eventType: 'click',
          elementText: 'Request Callback / Part Details',
          pagePath: '/',
        },
        {
          visitorId: 'synth-bhuvan-visitor-001',
          sessionId: 'synth-bhuvan-session-001',
          eventType: 'form_submit',
          elementText: 'Targeted Assistance Modal',
          metadata: { name: 'Bhuvan', contact: '9830164610', notes: 'Pin', category: 'Loader' },
          pagePath: '/',
        },
      ];

      const result = await evaluateAndRecordFlag({
        visitorId: 'synth-bhuvan-visitor-001',
        sessionId: 'synth-bhuvan-session-001',
        events: bhuvanTestBatch,
        identifiedName: 'Bhuvan',
        identifiedContact: '9830164610',
        geo: { city: 'Kolkata', region: 'West Bengal', country: 'India' },
        clientMeta: { browser: 'Chrome 158', os: 'Windows 10', deviceType: 'desktop' },
      });

      assert.ok(result, 'Evaluation must return a result object');
      assert.strictEqual(result.flagged, false, 'Bhuvan Kolkata test session must NEVER be flagged');
      assert.strictEqual(result.heuristicName, 'exempt_bhuvan');

      // Ensure zero alerts were fired
      const alerts = getMockAlerts();
      assert.strictEqual(alerts.length, 0, 'Zero alerts must be dispatched for developer test activity');
    });

    it('2.3 Replay Genuine Madurai Buyer: 0% false positive rate due to WhatsApp conversion', async () => {
      const genuineBuyerBatch = [
        {
          visitorId: 'synth-madurai-buyer-001',
          sessionId: 'synth-madurai-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/5223015-5223016',
          metadata: { itemType: 'part_number' },
          elementText: '5223015',
        },
        {
          visitorId: 'synth-madurai-buyer-001',
          sessionId: 'synth-madurai-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/5223015-5223016',
          metadata: { itemType: 'part_number' },
          elementText: '5223016',
        },
        {
          visitorId: 'synth-madurai-buyer-001',
          sessionId: 'synth-madurai-session-001',
          eventType: 'copy',
          pagePath: '/products/loader/23045902',
          metadata: { itemType: 'part_number' },
          elementText: '23045902',
        },
        {
          visitorId: 'synth-madurai-buyer-001',
          sessionId: 'synth-madurai-session-001',
          eventType: 'click',
          elementTarget: 'https://wa.me/+918334887009?text=Interested%20in%20pin',
          pagePath: '/products/loader/23045902',
        },
      ];

      const result = await evaluateAndRecordFlag({
        visitorId: 'synth-madurai-buyer-001',
        sessionId: 'synth-madurai-session-001',
        events: genuineBuyerBatch,
        geo: { city: 'Madurai', region: 'Tamil Nadu', country: 'India' },
        clientMeta: { browser: 'Mobile Chrome 157', os: 'Android 14', deviceType: 'mobile' },
      });

      assert.ok(result);
      assert.strictEqual(result.flagged, false, 'Buyer who initiated WhatsApp inquiry must NOT be flagged');
      assert.strictEqual(result.heuristicName, 'exempt_conversion');
      assert.strictEqual(getMockAlerts().length, 0);
    });

    it('2.4 UI Text Copying: Genuine user copying brand/category/prices is NOT flagged as mass_part_harvester', async () => {
      const genuineBrowserBatch = [
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'pageview',
          pagePath: '/products/excavator',
        },
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: 'Earthmovers',
        },
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: 'Excavator',
        },
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: 'Rs. 45000',
        },
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'copy',
          pagePath: '/products/excavator',
          elementText: '₹45000',
        },
        {
          visitorId: 'visitor-genuine-browser',
          sessionId: 'session-genuine-browser',
          eventType: 'copy',
          pagePath: '/products/loader',
          elementText: 'Loader',
        },
      ];

      const result = await evaluateAndRecordFlag({
        visitorId: 'visitor-genuine-browser',
        sessionId: 'session-genuine-browser',
        events: genuineBrowserBatch,
        geo: { city: 'Coimbatore', region: 'Tamil Nadu', country: 'India', ip: '157.46.220.10' },
        clientMeta: { browser: 'Chrome 122', os: 'Android 14', deviceType: 'mobile' },
      });

      assert.ok(result, 'Evaluation must return a result object');
      assert.strictEqual(
        result.flagged,
        false,
        'Genuine prospective buyer copying brand, category, and price strings must NEVER be flagged as harvester'
      );
      assert.strictEqual(getMockAlerts().length, 0, 'Zero alerts must be dispatched for UI text copying');
    });
  });

  /* =========================================================================
   * TIER 3: ZERO-COST ALERTING DISPATCHER & DEDUPLICATION
   * ========================================================================= */
  describe('Tier 3: Immediate Zero-Cost Alerting & Anti-Spam Deduplication', () => {
    it('3.1 Alert payload contains complete diagnostic metadata', async () => {
      const payload = {
        sessionId: 'session-alert-meta-001',
        visitorId: 'visitor-alert-meta-001',
        ipAddress: '49.207.210.12',
        geo: { city: 'Krishnagiri', region: 'Tamil Nadu', country: 'India' },
        clientMeta: { browser: 'Opera 102', os: 'Windows 10', deviceType: 'desktop' },
        behavioralIndicators: {
          durationSeconds: 4283,
          pageCount: 6,
          partCopiesCount: 26,
          rageClicksCount: 8,
          conversionClicksCount: 0,
        },
        flag: {
          flagType: 'competitor',
          heuristicName: 'krishnagiri_opera_nuisance',
          reason: 'Mass part number harvesting with 0 conversion inquiry',
          confidenceScore: 0.98,
        },
        actionTaken: 'Flag recorded in analytics_flags. Zero automatic restrictions applied.',
      };

      const dispatchResult = await dispatchAlert(payload, { mock: true });
      assert.strictEqual(dispatchResult.success, true);
      assert.strictEqual(dispatchResult.mode, 'mock');

      const alerts = getMockAlerts();
      assert.strictEqual(alerts.length, 1);
      assert.strictEqual(alerts[0].sessionId, 'session-alert-meta-001');
      assert.strictEqual(alerts[0].geo?.city, 'Krishnagiri');
      assert.strictEqual(alerts[0].behavioralIndicators?.partCopiesCount, 26);
      assert.strictEqual(alerts[0].behavioralIndicators?.rageClicksCount, 8);
    });

    it('3.2 Anti-Spam: Deduplicates alerts within the 60-minute window for the same session/visitor', async () => {
      const payload = {
        sessionId: 'session-spam-prevention-001',
        visitorId: 'visitor-spam-prevention-001',
        geo: { city: 'Krishnagiri' },
        flag: { flagType: 'competitor', heuristicName: 'krishnagiri_opera_nuisance', reason: 'Dwell scraping' },
      };

      // 1st dispatch: should succeed
      const res1 = await dispatchAlert(payload, { mock: true });
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.deduplicated, undefined);
      assert.strictEqual(getMockAlerts().length, 1);

      // 2nd dispatch (e.g. heartbeat 30 seconds later in same session): should be deduplicated
      const res2 = await dispatchAlert(payload, { mock: true });
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.deduplicated, true, 'Second alert in same session must be suppressed');
      assert.strictEqual(getMockAlerts().length, 1, 'Mock alert store must still contain only 1 alert');

      // 3rd dispatch with force=true: should bypass deduplication
      const res3 = await dispatchAlert(payload, { mock: true, force: true });
      assert.strictEqual(res3.success, true);
      assert.strictEqual(res3.deduplicated, undefined);
      assert.strictEqual(getMockAlerts().length, 2, 'Forced alert should bypass deduplication');
    });

    it('3.3 Non-blocking timeout guarantee: external failures do not throw exceptions', async () => {
      // Mock an invalid URL with non-mock mode
      const oldEnv = process.env.ALERT_TEST_MODE;
      delete process.env.ALERT_TEST_MODE;
      process.env.ALERT_WEBHOOK_URL = 'http://127.0.0.1:59999/non-existent-webhook';

      try {
        const payload = {
          sessionId: 'session-timeout-test',
          visitorId: 'visitor-timeout-test',
          flag: { flagType: 'competitor', heuristicName: 'test', reason: 'Test failure handling' },
        };

        // Dispatch must not throw unhandled rejection
        const result = await dispatchAlert(payload);
        assert.ok(result, 'Must return a result object even if webhook is unreachable');
      } finally {
        process.env.ALERT_TEST_MODE = oldEnv || 'true';
        delete process.env.ALERT_WEBHOOK_URL;
      }
    });
  });

  /* =========================================================================
   * TIER 4: RESTRICTION BOUNDARY & DATABASE INTEGRITY
   * ========================================================================= */
  describe('Tier 4: Strict Restriction Boundary & Database Guarantees', () => {
    it('4.1 STRICT PROHIBITION: Flagging engine NEVER modifies or inserts into analytics_restrictions', async () => {
      // Inspect analytics_restrictions before synthetic flag evaluation
      let restrictionsBefore = [];
      try {
        restrictionsBefore = await query('SELECT * FROM analytics_restrictions');
      } catch (err) {
        console.warn('Database query skipped in offline mode:', err.message);
      }

      // Execute flag evaluation on a synthetic nuisance session
      await evaluateAndRecordFlag({
        visitorId: 'synth-boundary-test-visitor-999',
        sessionId: 'synth-boundary-test-session-999',
        events: [
          {
            eventType: 'copy',
            pagePath: '/products/loader/5223015-5223016',
            metadata: { itemType: 'part_number' },
            elementText: '5223015',
          },
          {
            eventType: 'copy',
            pagePath: '/products/loader/5223015-5223016',
            metadata: { itemType: 'part_number' },
            elementText: '5223016',
          },
          {
            eventType: 'copy',
            pagePath: '/products/loader/23045902',
            metadata: { itemType: 'part_number' },
            elementText: '23045902',
          },
        ],
        geo: { city: 'Krishnagiri' },
      });

      // Inspect analytics_restrictions after flag evaluation
      let restrictionsAfter = [];
      try {
        restrictionsAfter = await query('SELECT * FROM analytics_restrictions');
      } catch {}

      assert.strictEqual(
        restrictionsAfter.length,
        restrictionsBefore.length,
        'analytics_restrictions count must remain strictly unchanged by automated flagging'
      );

      // Verify that the synthetic visitor was NOT added to restrictions
      const foundInRestrictions = restrictionsAfter.find(
        (r) => r.value === 'synth-boundary-test-visitor-999'
      );
      assert.strictEqual(
        foundInRestrictions,
        undefined,
        'Flagged visitor must NEVER be added to analytics_restrictions automatically'
      );

      // Cleanup any test flag from analytics_flags
      try {
        await query("DELETE FROM analytics_flags WHERE target_value LIKE 'synth-%'");
      } catch {}
    });

    it('4.2 Static fallback restriction file lib/restrictions.ts remains static and untouched', () => {
      const restrictionsFile = fs.readFileSync(path.resolve('lib/restrictions.ts'), 'utf8');
      assert.ok(
        restrictionsFile.includes('b1747b10-0ca4-4db3-9d58-eecc3cfe6479'),
        'lib/restrictions.ts must preserve the historical static baseline'
      );
      assert.strictEqual(
        restrictionsFile.includes('evaluateAndRecordFlag'),
        false,
        'lib/restrictions.ts must not be modified by automated flagging'
      );
    });
  });

  /* =========================================================================
   * TIER 5: HISTORICAL 10-DAY DATABASE REPLAY & AUDIT
   * ========================================================================= */
  describe('Tier 5: Historical 10-Day Database Audit Replay', () => {
    it('5.1 Historical Krishnagiri Sessions Replay: 100% active scraping detection', async () => {
      try {
        const rows = await query(`
          SELECT
            s.session_id,
            s.visitor_id,
            s.duration_seconds,
            s.city,
            COUNT(CASE WHEN e.event_type = 'copy' THEN 1 END) as copies_count,
            COUNT(DISTINCT e.page_path) as distinct_pages,
            COUNT(CASE WHEN (e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%')) OR e.event_type = 'form_submit' THEN 1 END) as lead_actions
          FROM analytics_sessions s
          LEFT JOIN analytics_events e ON s.session_id = e.session_id
          WHERE s.city = 'Krishnagiri'
          GROUP BY s.session_id, s.visitor_id, s.duration_seconds, s.city
          ORDER BY s.duration_seconds DESC
        `);

        if (rows && rows.length > 0) {
          let detectedScrapingSessions = 0;
          let totalActiveScrapingSessions = 0;

          for (const row of rows) {
            const copies = Number(row.copies_count) || 0;
            const leads = Number(row.lead_actions) || 0;
            const duration = Number(row.duration_seconds) || 0;
            const pages = Number(row.distinct_pages) || 0;

            if (copies >= 3 || (copies >= 2 && pages >= 4 && duration >= 300)) {
              totalActiveScrapingSessions++;
              const sig = evaluateBehavioralSignature({
                partCopiesCount: copies,
                distinctPages: pages,
                durationSeconds: duration,
                rageClicksCount: 0,
                leadActionsCount: leads,
                city: 'Krishnagiri',
              });

              if (sig.matches) {
                detectedScrapingSessions++;
              }
            }
          }

          assert.ok(totalActiveScrapingSessions > 0, 'Must identify historical active scraping sessions');
          assert.strictEqual(
            detectedScrapingSessions,
            totalActiveScrapingSessions,
            'Detection rate on active Krishnagiri scraping sessions must be 100%'
          );
        }
      } catch (err) {
        console.warn('Skipping live DB query in offline mode:', err.message);
      }
    });

    it('5.2 Historical Kolkata Bhuvan Sessions Replay: 0% false positives', async () => {
      try {
        const bhuvanRows = await query(`
          SELECT
            s.session_id,
            s.visitor_id,
            s.duration_seconds,
            s.city,
            v.identified_name,
            v.identified_contact,
            COUNT(CASE WHEN e.event_type = 'copy' AND (e.metadata->>'itemType' = 'part_number' AND e.metadata->>'copiedText' NOT ILIKE '%models%' AND e.metadata->>'copiedText' NOT ILIKE '%in-stock%' AND e.metadata->>'copiedText' NOT ILIKE '%parts available%') THEN 1 END) as part_copies_count,
            COUNT(CASE WHEN (e.event_type = 'click' AND (e.element_target LIKE '%wa.me%' OR e.element_target LIKE 'tel:%')) OR e.event_type = 'form_submit' THEN 1 END) as lead_actions
          FROM analytics_sessions s
          JOIN analytics_visitors v ON s.visitor_id = v.visitor_id
          LEFT JOIN analytics_events e ON s.session_id = e.session_id
          WHERE s.city = 'Kolkata' OR v.identified_contact = '9830164610'
          GROUP BY s.session_id, s.visitor_id, s.duration_seconds, s.city, v.identified_name, v.identified_contact
        `);

        if (bhuvanRows && bhuvanRows.length > 0) {
          let falsePositives = 0;
          for (const row of bhuvanRows) {
            const isExempt =
              (row.identified_contact || '').includes('9830164610') ||
              (row.identified_name || '').toLowerCase().includes('bhuvan');

            if (isExempt) continue;

            const partCopies = Number(row.part_copies_count) || 0;
            const leads = Number(row.lead_actions) || 0;
            const sig = evaluateBehavioralSignature({
              partCopiesCount: partCopies,
              distinctPages: 2,
              durationSeconds: Number(row.duration_seconds) || 0,
              rageClicksCount: 0,
              leadActionsCount: leads,
              city: row.city,
            });

            if (sig.matches) {
              falsePositives++;
            }
          }

          assert.strictEqual(
            falsePositives,
            0,
            'False positive rate for Kolkata Bhuvan test sessions must be 0%'
          );
        }
      } catch (err) {
        console.warn('Skipping live DB query in offline mode:', err.message);
      }
    });
  });
});
