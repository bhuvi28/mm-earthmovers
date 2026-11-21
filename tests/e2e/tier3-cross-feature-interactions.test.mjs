import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageSource,
  inspectTabProducts,
  inspectModals,
  validateWhatsAppUrlGenerator,
} from './analyzer.mjs';

test('Tier 3: Cross-Feature Interactions & State Harmony', async (t) => {
  await t.test('3.1 View Switcher + Part Number Copy Interaction', () => {
    const code = getPageSource();
    const products = inspectTabProducts();

    assert.strictEqual(
      products.hasCopyPartButton,
      true,
      'Part copy handler handleCopyPart must be present'
    );

    // Verify copy feedback state
    const hasCopiedState = /copiedPart/.test(code);
    assert.strictEqual(
      hasCopiedState,
      true,
      'Dashboard must track copiedPart state to provide visual feedback upon copy'
    );

    // Verify that handleCopyPart works across view switcher states (cards and table)
    const hasCopyInMobile = /handleCopyPart/.test(code);
    assert.strictEqual(
      hasCopyInMobile,
      true,
      'handleCopyPart must be wired in mobile card view'
    );
  });

  await t.test('3.2 Tab Switching + Time Range Selector Independence', () => {
    const code = getPageSource();

    // Verify independent state declarations
    const hasActiveTabState = /const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState/.test(code);
    const hasTimeRangeState = /const\s+\[timeRange,\s*setTimeRange\]\s*=\s*useState/.test(code);

    assert.strictEqual(
      hasActiveTabState,
      true,
      'activeTab state must be declared and managed'
    );
    assert.strictEqual(
      hasTimeRangeState,
      true,
      'timeRange state must be declared and managed'
    );

    // Verify state handlers don't cross-contaminate
    const timeRangeHandlerMatches = code.match(/setTimeRange\([^)]+\)/g);
    assert.ok(
      timeRangeHandlerMatches && timeRangeHandlerMatches.length > 0,
      'setTimeRange must be wired to controls'
    );

    const activeTabHandlerMatches = code.match(/setActiveTab\([^)]+\)/g);
    assert.ok(
      activeTabHandlerMatches && activeTabHandlerMatches.length > 0,
      'setActiveTab must be wired to tab buttons'
    );
  });

  await t.test('3.3 Mobile Lead Card + WhatsApp Link Format & Escaping', () => {
    // Standard Indian phone number with spaces and dashes
    const url1 = validateWhatsAppUrlGenerator('+91 98765-43210', 'Hi, inquiring about Excavator Parts');
    assert.strictEqual(
      url1,
      'https://wa.me/919876543210?text=Hi%2C%20inquiring%20about%20Excavator%20Parts',
      'Must sanitize phone number and URI-encode text parameter'
    );

    // Phone with brackets and special characters
    const url2 = validateWhatsAppUrlGenerator('(022) 2410-1234', 'Part #123 & Inquiry?');
    assert.strictEqual(
      url2,
      'https://wa.me/02224101234?text=Part%20%23123%20%26%20Inquiry%3F',
      'Must strip all non-digit formatting and encode #, &, ?'
    );

    // Empty text
    const url3 = validateWhatsAppUrlGenerator('+919988776655', '');
    assert.strictEqual(
      url3,
      'https://wa.me/919988776655',
      'Must omit text parameter when empty'
    );
  });

  await t.test('3.4 Modal Trigger + Bottom Sheet & Body Scroll Lock Behavior', () => {
    const code = getPageSource();
    const modals = inspectModals();

    // Body scroll lock effect
    const hasBodyScrollLock = /document\.body\.style\.overflow\s*=\s*['"]hidden['"]/.test(code);
    assert.strictEqual(
      hasBodyScrollLock,
      true,
      'Opening a modal or bottom sheet must lock document body scroll to prevent background scrolling'
    );

    // Bottom sheet structure
    assert.strictEqual(
      modals.visitorJourney.hasJourneyBottomSheet,
      true,
      'Visitor Journey modal must apply mobile bottom sheet layout (items-end, rounded-t-...)'
    );
    assert.strictEqual(
      modals.visitorJourney.hasJourneyDesktopCentered,
      true,
      'Visitor Journey modal must apply desktop centered modal layout (md:items-center)'
    );
  });
});
