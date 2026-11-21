import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectRootLayout,
  inspectHeaderAndNav,
  inspectTabStream,
  inspectTabProducts,
  inspectTabAudience,
  inspectTabDemand,
  inspectTabVisitors,
  inspectTabRestrictions,
  inspectModals,
} from './analyzer.mjs';

test('Tier 1: Feature Coverage — Comprehensive Inventory Verification', async (t) => {
  await t.test('1.1 Global Page Container & Overflow Prevention', () => {
    const root = inspectRootLayout();
    assert.strictEqual(
      root.hasOverflowXHidden,
      true,
      'Root layout container must include overflow-x-hidden to prevent window-level horizontal scroll on mobile'
    );
    assert.strictEqual(
      root.hasWFull,
      true,
      'Root layout container must specify w-full or max-w-full'
    );
  });

  await t.test('1.2 R1 Header & Sticky Mobile Navbar with Space-Efficient Time Range', () => {
    const nav = inspectHeaderAndNav();
    assert.strictEqual(
      nav.hasStickyHeader,
      true,
      'Header navbar must be sticky at top-0 for mobile navigation'
    );
    assert.strictEqual(
      nav.timeRange.hasAllRanges,
      true,
      "Time range selector must support all ranges: 'today', '7d', '30d', 'all'"
    );
    assert.strictEqual(
      nav.timeRange.hasCompactMobileLabels,
      true,
      'Time range selector must use compact mobile labels (Today, 7d, 30d, All) on < 640px'
    );
  });

  await t.test('1.3 R1 Horizontally Scrollable 6-Tab Navigation Bar', () => {
    const nav = inspectHeaderAndNav();
    assert.strictEqual(
      nav.mobileTabStrip.hasMobileTabStrip,
      true,
      'Mobile navigation strip must exist with flex md:hidden'
    );
    assert.strictEqual(
      nav.mobileTabStrip.hasScrollbarHide,
      true,
      'Mobile tab strip must use scrollbar-hide to prevent ugly browser scrollbars'
    );
    assert.strictEqual(
      nav.mobileTabStrip.hasAll6Tabs,
      true,
      `Mobile tab strip must include all 6 tabs. Missing: ${nav.mobileTabStrip.missingTabs.join(', ')}`
    );
    assert.strictEqual(
      nav.mobileTabStrip.has44pxTouchTargets,
      true,
      'Mobile tab buttons must provide at least 44px touch targets (min-h-[44px])'
    );
    assert.strictEqual(
      nav.desktopTabStrip.hasDesktopTabStrip,
      true,
      'Desktop tab strip must be preserved with hidden md:flex'
    );
  });

  await t.test("1.4 R2 Tab 1 ('stream') Mobile Cards & Desktop Table", () => {
    const stream = inspectTabStream();
    assert.strictEqual(
      stream.hasMobileCards,
      true,
      "Tab 1 ('stream') must render responsive mobile cards on < 768px viewports"
    );
    assert.strictEqual(
      stream.cardFields.hasEventField,
      true,
      'Tab 1 mobile cards must display Event / Action type'
    );
    assert.strictEqual(
      stream.cardFields.hasPageField,
      true,
      'Tab 1 mobile cards must display Page path'
    );
    assert.strictEqual(
      stream.cardFields.hasTimeField,
      true,
      'Tab 1 mobile cards must display Time'
    );
    assert.strictEqual(
      stream.hasDesktopTable,
      true,
      'Tab 1 desktop table must be preserved for >= 768px'
    );
  });

  await t.test("1.5 R2 Tab 2 ('products') Mobile Cards & 1-Tap Copy Part Button", () => {
    const products = inspectTabProducts();
    assert.strictEqual(
      products.hasMobileCards,
      true,
      "Tab 2 ('products') must support mobile card layouts"
    );
    assert.strictEqual(
      products.hasCopyPartButton,
      true,
      'Tab 2 must wire handleCopyPart for 1-tap part number copying'
    );
    assert.strictEqual(
      products.has44pxCopyButton,
      true,
      'Tab 2 copy part button must have accessible touch target (>= 44px)'
    );
    assert.strictEqual(
      products.hasViewSwitcher,
      true,
      'Tab 2 must maintain view switcher compatibility'
    );
    assert.strictEqual(
      products.hasDesktopTable,
      true,
      'Tab 2 desktop table must be preserved for >= 768px'
    );
  });

  await t.test("1.6 R2 Tab 3 ('audience') Responsive Geographic Layout", () => {
    const audience = inspectTabAudience();
    assert.strictEqual(
      audience.hasGeoLevels,
      true,
      'Tab 3 must support Cities, States, and Countries views'
    );
    assert.strictEqual(
      audience.hasMobileCards,
      true,
      'Tab 3 must render responsive card layouts on mobile < 768px'
    );
    assert.strictEqual(
      audience.hasDesktopTable,
      true,
      'Tab 3 desktop table must be preserved for >= 768px'
    );
  });

  await t.test("1.7 R2 Tab 4 ('demand') Mobile Cards for Demand, Dwell & Sentinel", () => {
    const demand = inspectTabDemand();
    assert.strictEqual(
      demand.hasSearchDemandCards,
      true,
      'Tab 4 must provide mobile cards for buyer search demand & catalog gaps'
    );
    assert.strictEqual(
      demand.hasDwellCards,
      true,
      'Tab 4 must provide mobile cards for dwell time analytics'
    );
    assert.strictEqual(
      demand.hasSentinelCards,
      true,
      'Tab 4 must provide mobile cards for Competitor Sentinel surveillance'
    );
    assert.strictEqual(
      demand.hasDesktopTable,
      true,
      'Tab 4 desktop tables must be preserved for >= 768px'
    );
  });

  await t.test("1.8 R2 Tab 5 ('visitors') Native Mobile Lead Cards & WhatsApp Link", () => {
    const visitors = inspectTabVisitors();
    assert.strictEqual(
      visitors.hasMobileLeadCards,
      true,
      'Tab 5 must render native mobile lead cards on < 768px'
    );
    assert.strictEqual(
      visitors.hasAvatar,
      true,
      'Tab 5 mobile lead cards must render customer avatar / monogram'
    );
    assert.strictEqual(
      visitors.hasLeadName,
      true,
      'Tab 5 mobile lead cards must display lead / company name'
    );
    assert.strictEqual(
      visitors.hasWhatsAppButton,
      true,
      'Tab 5 mobile lead cards must feature 1-click WhatsApp action'
    );
    assert.strictEqual(
      visitors.hasLifecycleActions,
      true,
      'Tab 5 mobile lead cards must wire openVisitorJourney'
    );
    assert.strictEqual(
      visitors.hasDesktopTable,
      true,
      'Tab 5 desktop table must be preserved for >= 768px'
    );
  });

  await t.test("1.9 R2 Tab 6 ('restrictions') Mobile Access Cards", () => {
    const restrictions = inspectTabRestrictions();
    assert.strictEqual(
      restrictions.hasMobileCards,
      true,
      'Tab 6 must render mobile cards for active IP and Visitor ID restrictions'
    );
    assert.strictEqual(
      restrictions.hasUnblockAction,
      true,
      'Tab 6 mobile cards must wire handleRemoveRestriction for 1-tap unblock'
    );
    assert.strictEqual(
      restrictions.hasDesktopTable,
      true,
      'Tab 6 desktop table must be preserved for >= 768px'
    );
  });

  await t.test('1.10 R3 Mobile Bottom-Sheet Slide-Up Modals', () => {
    const modals = inspectModals();
    assert.strictEqual(
      modals.visitorJourney.hasVisitorJourney,
      true,
      'Visitor Journey modal must be wired with selectedVisitorId'
    );
    assert.strictEqual(
      modals.visitorJourney.hasJourneyBottomSheet,
      true,
      'Visitor Journey modal must behave as slide-up bottom sheet on mobile (items-end, rounded-t-...)'
    );
    assert.strictEqual(
      modals.visitorJourney.hasJourneyDesktopCentered,
      true,
      'Visitor Journey modal must be centered dialog on desktop (md:items-center, md:rounded-2xl)'
    );
    assert.strictEqual(
      modals.visitorJourney.hasSlideUpAnimation,
      true,
      'Visitor Journey modal must include smooth slide-up animation'
    );
  });

  await t.test('1.11 R4 Desktop Layout Preservation & Separation', () => {
    const nav = inspectHeaderAndNav();
    const stream = inspectTabStream();
    const products = inspectTabProducts();
    const visitors = inspectTabVisitors();

    assert.strictEqual(
      nav.desktopTabStrip.hasDesktopTabStrip,
      true,
      'Desktop navigation must be preserved via hidden md:flex'
    );
    assert.strictEqual(
      stream.hasDesktopTable,
      true,
      'Stream desktop table must be preserved via hidden md:table or hidden md:block'
    );
    assert.strictEqual(
      products.hasDesktopTable,
      true,
      'Products desktop table must be preserved via hidden md:table'
    );
    assert.strictEqual(
      visitors.hasDesktopTable,
      true,
      'Visitors desktop table must be preserved via hidden md:table'
    );
  });
});
