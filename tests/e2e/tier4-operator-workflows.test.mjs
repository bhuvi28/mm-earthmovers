import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageSource,
  inspectHeaderAndNav,
  inspectTabStream,
  inspectTabProducts,
  inspectTabVisitors,
  inspectTabRestrictions,
  inspectModals,
  validateWhatsAppUrlGenerator,
} from './analyzer.mjs';

test('Tier 4: Real-World Operator Workflows — Mobile Lead Triage Simulation', async (t) => {
  await t.test('4.1 Step 1: Dashboard Mobile Initialization (Viewport 375px)', () => {
    const nav = inspectHeaderAndNav();
    assert.strictEqual(nav.hasStickyHeader, true, 'Operator sees sticky header on mobile load');
    assert.strictEqual(nav.mobileTabStrip.hasMobileTabStrip, true, 'Operator sees mobile navigation bar');
    assert.strictEqual(nav.mobileTabStrip.hasAll6Tabs, true, 'All 6 navigation tabs are available');
  });

  await t.test("4.2 Step 2: Time Range Filter Selection ('7d')", () => {
    const nav = inspectHeaderAndNav();
    assert.strictEqual(nav.timeRange.hasAllRanges, true, "Range '7d' is available for operator selection");
    assert.strictEqual(nav.timeRange.hasCompactMobileLabels, true, "Range '7d' is rendered compactly for 375px screens");
  });

  await t.test("4.3 Step 3: Navigation to 'visitors' (Leads Directory)", () => {
    const nav = inspectHeaderAndNav();
    assert.ok(
      !nav.mobileTabStrip.missingTabs.includes('visitors'),
      "'visitors' tab is present in mobile navigation"
    );

    const visitors = inspectTabVisitors();
    assert.strictEqual(
      visitors.hasMobileLeadCards,
      true,
      "Tapping 'visitors' reveals touch-friendly mobile lead cards"
    );
  });

  await t.test('4.4 Step 4: Lead Inspection & WhatsApp Outreach Action', () => {
    const visitors = inspectTabVisitors();
    assert.strictEqual(visitors.hasLeadName, true, 'Lead card presents company / buyer name');
    assert.strictEqual(visitors.hasAvatar, true, 'Lead card displays visual customer avatar / monogram');
    assert.strictEqual(visitors.hasWhatsAppButton, true, 'Lead card provides 1-tap WhatsApp button');

    // Simulate WhatsApp URL generation for lead outreach
    const phone = '+91 98400-11223';
    const message = 'Hello! Regarding your inquiry for Hydraulic Excavator Spares on MM Earthmovers:';
    const waUrl = validateWhatsAppUrlGenerator(phone, message);

    assert.ok(waUrl.startsWith('https://wa.me/919840011223?text='), 'WhatsApp link target must start with wa.me and clean phone number');
    assert.ok(waUrl.includes('Hydraulic%20Excavator%20Spares'), 'Message must be cleanly URL-encoded');
  });

  await t.test('4.5 Step 5: Visitor Journey Modal Bottom-Sheet Trigger', () => {
    const visitors = inspectTabVisitors();
    assert.strictEqual(
      visitors.hasLifecycleActions,
      true,
      'Lead card provides button to view Visitor Journey'
    );

    const modals = inspectModals();
    assert.strictEqual(
      modals.visitorJourney.hasJourneyBottomSheet,
      true,
      'Journey modal opens as slide-up bottom sheet pinned to screen bottom'
    );
    assert.strictEqual(
      modals.visitorJourney.hasSlideUpAnimation,
      true,
      'Journey modal bottom sheet animates smoothly upward'
    );

    const code = getPageSource();
    assert.ok(
      /document\.body\.style\.overflow\s*=\s*['"]hidden['"]/.test(code),
      'Body scroll is locked while inspecting journey bottom sheet'
    );
  });

  await t.test("4.6 Step 6: Security Enforcement & Transition to 'restrictions'", () => {
    const code = getPageSource();
    const hasAddRestriction = /handleAddRestriction/.test(code);
    assert.strictEqual(hasAddRestriction, true, 'Operator can trigger handleAddRestriction');

    const restrictions = inspectTabRestrictions();
    assert.strictEqual(
      restrictions.hasMobileCards,
      true,
      "Navigating to 'restrictions' shows active blocks formatted as mobile cards"
    );
    assert.strictEqual(
      restrictions.hasUnblockAction,
      true,
      'Restriction card allows operator to unblock or remove restriction with 1 tap'
    );
  });

  await t.test('4.7 Step 7: Desktop Equivalence & Layout Preservation', () => {
    const nav = inspectHeaderAndNav();
    const stream = inspectTabStream();
    const products = inspectTabProducts();
    const visitors = inspectTabVisitors();
    const restrictions = inspectTabRestrictions();
    const modals = inspectModals();

    assert.strictEqual(nav.desktopTabStrip.hasDesktopTabStrip, true, 'Desktop nav bar preserved');
    assert.strictEqual(stream.hasDesktopTable, true, 'Desktop stream table preserved');
    assert.strictEqual(products.hasDesktopTable, true, 'Desktop products table preserved');
    assert.strictEqual(visitors.hasDesktopTable, true, 'Desktop visitors table preserved');
    assert.strictEqual(restrictions.hasDesktopTable, true, 'Desktop restrictions table preserved');
    assert.strictEqual(modals.visitorJourney.hasJourneyDesktopCentered, true, 'Desktop modal centering preserved');
  });
});
