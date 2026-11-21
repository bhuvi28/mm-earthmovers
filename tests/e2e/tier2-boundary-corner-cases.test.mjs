import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageSource,
  inspectRootLayout,
  scanFixedPixelOverflow,
  validateWhatsAppUrlGenerator,
} from './analyzer.mjs';

test('Tier 2: Boundary & Corner Cases — Viewports, Extremes & Resilience', async (t) => {
  await t.test('2.1 Viewport Width 375px (iPhone SE) Fixed Width Boundary Check', () => {
    const scan = scanFixedPixelOverflow(375);
    assert.strictEqual(
      scan.hasViolations,
      false,
      `Detected un-prefixed fixed pixel width exceeding 375px viewport: ${JSON.stringify(scan.violations)}`
    );
  });

  await t.test('2.2 Viewport Width 390px (iPhone 12/13/14) Boundary Check', () => {
    const scan = scanFixedPixelOverflow(390);
    assert.strictEqual(
      scan.hasViolations,
      false,
      `Detected un-prefixed fixed pixel width exceeding 390px viewport: ${JSON.stringify(scan.violations)}`
    );
  });

  await t.test('2.3 Viewport Width 414px (iPhone XR / Plus) Boundary Check', () => {
    const scan = scanFixedPixelOverflow(414);
    assert.strictEqual(
      scan.hasViolations,
      false,
      `Detected un-prefixed fixed pixel width exceeding 414px viewport: ${JSON.stringify(scan.violations)}`
    );
  });

  await t.test('2.4 Global Overflow Containment Resiliency', () => {
    const root = inspectRootLayout();
    assert.strictEqual(
      root.isCompliant,
      true,
      'Page wrapper must be fully compliant with min-h-screen, overflow-x-hidden, and w-full max-w-full'
    );
  });

  await t.test('2.5 Empty States & Zero-Results Resilience', () => {
    const code = getPageSource();
    
    // Tab 1 empty stream
    const hasEmptyStreamState = /filteredEvents\.length === 0|events\.length === 0|No events recorded|No recent activity/i.test(code);
    assert.strictEqual(
      hasEmptyStreamState,
      true,
      'Stream tab must have an empty state fallback when no events are recorded'
    );

    // Tab 5 empty visitors
    const hasEmptyVisitorsState = /visitorsList\.length === 0|filteredVisitors\.length === 0|No visitors recorded|No leads/i.test(code);
    assert.strictEqual(
      hasEmptyVisitorsState,
      true,
      'Visitors tab must have an empty state fallback when no visitors exist'
    );

    // Tab 6 empty restrictions
    const hasEmptyRestrictionsState = /restrictions\.length === 0|filteredRestrictions\.length === 0|No active restrictions|No restrictions/i.test(code);
    assert.strictEqual(
      hasEmptyRestrictionsState,
      true,
      'Restrictions tab must have an empty state fallback when zero restrictions are active'
    );
  });

  await t.test('2.6 Long Strings & Truncation Resilience', () => {
    const code = getPageSource();

    // Verify presence of text truncation or break utilities to prevent mobile card blowout
    const hasTruncate = /truncate/.test(code);
    const hasBreakAllOrWords = /break-all|break-words/.test(code);

    assert.strictEqual(
      hasTruncate,
      true,
      'Dashboard must use truncate class for long URLs, emails, or names'
    );
    assert.strictEqual(
      hasBreakAllOrWords,
      true,
      'Dashboard must use break-all or break-words to handle long part numbers, IDs, or tokens'
    );
  });

  await t.test('2.7 Missing Contact Numbers Fallback', () => {
    // Lead with missing / empty phone number
    const resultNull = validateWhatsAppUrlGenerator(null, 'Hello');
    assert.strictEqual(resultNull, null, 'Null phone number must return null (safe handling)');

    const resultUndefined = validateWhatsAppUrlGenerator(undefined, 'Hello');
    assert.strictEqual(resultUndefined, null, 'Undefined phone number must return null');

    const resultEmpty = validateWhatsAppUrlGenerator('', 'Hello');
    assert.strictEqual(resultEmpty, null, 'Empty string phone number must return null');

    const resultCharsOnly = validateWhatsAppUrlGenerator('no-phone-here', 'Hello');
    assert.strictEqual(resultCharsOnly, null, 'String with no digits must return null');
  });

  await t.test('2.8 Touch Target Boundary Standards (>= 44px)', () => {
    const code = getPageSource();

    // Check that mobile tabs, close buttons, and main mobile actions satisfy 44px hit-box
    const hasMinH44 = /min-h-\[44px\]/.test(code);
    assert.strictEqual(
      hasMinH44,
      true,
      'Dashboard must enforce min-h-[44px] for touch accessibility on mobile viewports'
    );
  });
});
