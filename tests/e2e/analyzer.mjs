import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const PAGE_PATH = path.resolve('app/admin/analytics/page.tsx');

/**
 * Reads raw page source code
 */
export function getPageSource() {
  return fs.readFileSync(PAGE_PATH, 'utf8');
}

/**
 * Parses page.tsx into a TypeScript AST
 */
export function getParsedAST() {
  const code = getPageSource();
  return {
    sourceFile: ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    rawCode: code,
  };
}

/**
 * Recursively traverses AST and finds all JSX elements and fragments
 */
export function findAllJsxElements(node) {
  const elements = [];
  function visit(n) {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      elements.push(n);
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return elements;
}

/**
 * Extracts className attribute string from a JSX element
 */
export function getClassName(jsxNode) {
  const attrs = ts.isJsxElement(jsxNode)
    ? jsxNode.openingElement.attributes.properties
    : jsxNode.attributes.properties;

  for (const attr of attrs) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === 'className') {
      if (attr.initializer) {
        if (ts.isStringLiteral(attr.initializer)) {
          return attr.initializer.text;
        }
        if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
          return attr.initializer.expression.getText();
        }
      }
    }
  }
  return '';
}

/**
 * Checks if a JSX node or its className has responsive mobile visibility
 */
export function isMobileVisible(className) {
  if (!className) return true;
  // If explicitly hidden on mobile and shown on desktop
  if (className.includes('hidden') && className.includes('md:')) {
    if (/hidden\s+md:(block|flex|table|grid)/.test(className)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a JSX node or its className has desktop visibility
 */
export function isDesktopVisible(className) {
  if (!className) return true;
  // If explicitly block on mobile and hidden on md
  if (className.includes('md:hidden')) {
    return false;
  }
  return true;
}

/**
 * Inspects Root Page Layout
 */
export function inspectRootLayout() {
  const code = getPageSource();
  const hasOverflowXHidden = /overflow-x-hidden/.test(code);
  const hasWFull = /w-full\s+max-w-full|max-w-full\s+w-full|w-full/.test(code);
  const hasMinHScreen = /min-h-screen/.test(code);

  return {
    hasOverflowXHidden,
    hasWFull,
    hasMinHScreen,
    isCompliant: hasOverflowXHidden && hasWFull && hasMinHScreen,
  };
}

/**
 * Inspects Header, Time Range Selector, and Tab Navigation Strip
 */
export function inspectHeaderAndNav() {
  const code = getPageSource();

  // Header Sticky & Padding
  const hasStickyHeader = /<header[^>]*sticky\s+top-0/s.test(code);
  const headerMatches = code.match(/<header[^>]*className=["'`]([^"'`]+)["'`]/);
  const headerClass = headerMatches ? headerMatches[1] : '';

  // Time Range Selector
  const hasToday = /'today'/.test(code);
  const has7d = /'7d'/.test(code);
  const has30d = /'30d'/.test(code);
  const hasAll = /'all'/.test(code);
  const hasCompactMobileLabels = /Today|7d|30d|All/.test(code) && /sm:hidden/.test(code);

  // Tab Strip
  const hasMobileTabStrip = /<nav[^>]*Mobile Analytics Navigation/i.test(code) ||
    /aria-label=["']Mobile Analytics Navigation["']/i.test(code) ||
    /flex\s+md:hidden[^>]*overflow-x-auto/.test(code);

  const hasScrollbarHide = /scrollbar-hide/.test(code);
  const hasTouchPanX = /touch-pan-x|overflow-x-auto/.test(code);

  // 6 Tabs presence
  const tabs = ['stream', 'products', 'audience', 'demand', 'visitors', 'restrictions'];
  const missingTabs = tabs.filter(t => !code.includes(`'${t}'`));

  // Touch targets for mobile tab buttons (min-h-[44px] or 44px hit-box)
  const has44pxMobileTabs = /min-h-\[44px\]/.test(code);

  // Desktop Tabs preserved
  const hasDesktopTabStrip = /hidden\s+md:flex[^>]*border-b/.test(code) || /hidden\s+md:flex/.test(code);

  return {
    hasStickyHeader,
    headerClass,
    timeRange: {
      hasAllRanges: hasToday && has7d && has30d && hasAll,
      hasCompactMobileLabels,
    },
    mobileTabStrip: {
      hasMobileTabStrip,
      hasScrollbarHide,
      hasTouchPanX,
      missingTabs,
      hasAll6Tabs: missingTabs.length === 0,
      has44pxTouchTargets: has44pxMobileTabs,
    },
    desktopTabStrip: {
      hasDesktopTabStrip,
    },
  };
}

/**
 * Inspects Tab 1 (stream / Live Activity Feed)
 */
export function inspectTabStream() {
  const code = getPageSource();
  const streamSection = code.slice(code.indexOf("activeTab === 'stream'"));

  // Check for mobile cards view
  const hasMobileCards = /md:hidden/.test(streamSection) &&
    /border\s+border-slate-200/.test(streamSection);

  // Check required mobile card fields
  const hasEventField = /event_type|action/i.test(streamSection);
  const hasPageField = /page_path|page/i.test(streamSection);
  const hasElementField = /element_text|details/i.test(streamSection);
  const hasVisitorField = /visitor_id|buyer|lead/i.test(streamSection);
  const hasIpField = /ip_address|ip/i.test(streamSection);
  const hasLocationField = /city|country|location/i.test(streamSection);
  const hasTimeField = /created_at|time|formatDate/i.test(streamSection);

  // Check desktop table preservation
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(streamSection);
  const hasTableColumns = /Time/.test(streamSection) && /Action/.test(streamSection) && /Page/.test(streamSection);

  return {
    hasMobileCards,
    cardFields: {
      hasEventField,
      hasPageField,
      hasElementField,
      hasVisitorField,
      hasIpField,
      hasLocationField,
      hasTimeField,
    },
    hasDesktopTable,
    hasTableColumns,
  };
}

/**
 * Inspects Tab 2 (products / Product Performance & Catalog Gaps)
 */
export function inspectTabProducts() {
  const code = getPageSource();
  const productsSection = code.slice(code.indexOf("activeTab === 'products'"));

  const hasMobileCards = /md:hidden/.test(productsSection) || /viewMode === 'cards'/.test(productsSection);
  const hasCopyPartButton = /handleCopyPart/.test(productsSection);
  const has44pxCopyButton = /min-h-\[44px\]|py-2\.5|p-2\.5|min-w-\[44px\]|h-11|h-12/.test(productsSection);
  const hasViewSwitcher = /viewMode/.test(productsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(productsSection);

  return {
    hasMobileCards,
    hasCopyPartButton,
    has44pxCopyButton,
    hasViewSwitcher,
    hasDesktopTable,
  };
}

/**
 * Inspects Tab 3 (audience / Geographic Analytics)
 */
export function inspectTabAudience() {
  const code = getPageSource();
  const audienceSection = code.slice(code.indexOf("activeTab === 'audience'"));

  const hasGeoLevels = /geoLevel/.test(audienceSection) &&
    /cities|states|countries/i.test(audienceSection);

  const hasMobileCards = /md:hidden/.test(audienceSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(audienceSection);

  return {
    hasGeoLevels,
    hasMobileCards,
    hasDesktopTable,
  };
}

/**
 * Inspects Tab 4 (demand / Search & Dwell Analytics)
 */
export function inspectTabDemand() {
  const code = getPageSource();
  const demandSection = code.slice(code.indexOf("activeTab === 'demand'"));

  const hasSearchDemandCards = /Search Query|Part Keyword|searchDemand/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasDwellCards = /Dwell|avgDwell/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasSentinelCards = /Sentinel|Heuristic|Surveillance/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(demandSection);

  return {
    hasSearchDemandCards,
    hasDwellCards,
    hasSentinelCards,
    hasDesktopTable,
  };
}

/**
 * Inspects Tab 5 (visitors / Lead Directory)
 */
export function inspectTabVisitors() {
  const code = getPageSource();
  const visitorsSection = code.slice(code.indexOf("activeTab === 'visitors'"));

  const hasMobileLeadCards = /md:hidden/.test(visitorsSection);
  const hasAvatar = /avatar|rounded-full|bg-amber/i.test(visitorsSection);
  const hasLeadName = /name|company|lead/i.test(visitorsSection);
  const hasWhatsAppButton = /wa\.me|whatsapp|api\.whatsapp\.com/i.test(visitorsSection);
  const hasLifecycleActions = /openVisitorJourney/.test(visitorsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(visitorsSection);

  return {
    hasMobileLeadCards,
    hasAvatar,
    hasLeadName,
    hasWhatsAppButton,
    hasLifecycleActions,
    hasDesktopTable,
  };
}

/**
 * Inspects Tab 6 (restrictions / Access Rules)
 */
export function inspectTabRestrictions() {
  const code = getPageSource();
  const restrictionsSection = code.slice(code.indexOf("activeTab === 'restrictions'"));

  const hasMobileCards = /md:hidden/.test(restrictionsSection);
  const hasUnblockAction = /handleRemoveRestriction/.test(restrictionsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(restrictionsSection);

  return {
    hasMobileCards,
    hasUnblockAction,
    hasDesktopTable,
  };
}

/**
 * Inspects Modals & Bottom Sheets (Visitor Journey, Add IP)
 */
export function inspectModals() {
  const code = getPageSource();

  // Visitor Journey Modal
  const hasVisitorJourney = /selectedVisitorId/.test(code);
  const hasJourneyBottomSheet = /items-end/.test(code) &&
    (/rounded-t-3xl|rounded-t-2xl/.test(code) || /max-h-\[88vh\]|max-h-\[90vh\]/.test(code));
  const hasJourneyDesktopCentered = /md:items-center/.test(code) || /md:rounded-2xl/.test(code);
  const hasSlideUpAnimation = /animate-slide-up/.test(code);

  // Add IP Modal
  const hasAddIpModal = /isAddIpModalOpen/.test(code);
  const hasAddIpBottomSheet = hasAddIpModal && /items-end/.test(code);

  return {
    visitorJourney: {
      hasVisitorJourney,
      hasJourneyBottomSheet,
      hasJourneyDesktopCentered,
      hasSlideUpAnimation,
    },
    addIpModal: {
      hasAddIpModal,
      hasAddIpBottomSheet,
    },
  };
}

/**
 * Viewport Geometry & Fixed Width Overflow Scanner
 */
export function scanFixedPixelOverflow(viewportWidth = 375) {
  const code = getPageSource();
  const lines = code.split('\n');
  const violations = [];

  // Look for fixed pixel width classes like min-w-[500px], w-[800px], etc.
  // that do NOT have a responsive prefix (md:, lg:, xl:, 2xl:) and exceed viewportWidth
  const fixedWidthRegex = /(?<![a-zA-Z0-9:_-])(min-w|w)-\[(\d+)px\]/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = fixedWidthRegex.exec(line)) !== null) {
      const prop = match[1];
      const pxValue = parseInt(match[2], 10);
      const fullMatch = match[0];
      const matchIndex = match.index;

      // Check if preceded by a breakpoint prefix like "md:", "lg:", "xl:"
      const prefixSlice = line.slice(Math.max(0, matchIndex - 6), matchIndex);
      const isPrefixed = /(md|lg|xl|2xl):$/.test(prefixSlice);

      if (!isPrefixed && pxValue > (viewportWidth - 32)) {
        // Exclude SVG viewBox or internal fixed widths that are inside overflow-hidden wrappers
        if (!line.includes('viewBox') && !line.includes('hidden md:')) {
          violations.push({
            line: index + 1,
            classFound: fullMatch,
            pxValue,
            text: line.trim(),
          });
        }
      }
    }
  });

  return {
    viewportWidth,
    hasViolations: violations.length > 0,
    violations,
  };
}

/**
 * Validates WhatsApp URL Generator Logic
 */
export function validateWhatsAppUrlGenerator(phone, text = '') {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}${text ? `?text=${encodedText}` : ''}`;
}

/**
 * Inspects Top 6 Global KPI Strip & Grid (R1 Mobile Condensation & R3 Desktop Preservation)
 */
export function inspectGlobalKpis() {
  const code = getPageSource();

  // Slice region containing global KPIs (between dashboardError and Navigation Tabs)
  const kpiSectionMatch = code.match(/dashboardError[\s\S]*?(?:Navigation Tabs)/);
  const kpiSection = kpiSectionMatch ? kpiSectionMatch[0] : code;

  // Mobile checks (< 768px)
  const hasMobileCondensedKpis = /flex\s+md:hidden/.test(kpiSection) &&
    /overflow-x-auto/.test(kpiSection) &&
    /scrollbar-hide/.test(kpiSection) &&
    /snap-x/.test(kpiSection) &&
    /touch-pan-x/.test(kpiSection);

  // Desktop checks (>= 768px)
  const hasDesktopFullKpis = /hidden\s+md:grid/.test(kpiSection) &&
    /lg:grid-cols-6/.test(kpiSection);

  // KPI item coverage in both mobile and desktop views
  const hasUniqueVisitors = /stats\?\.kpis\?\.totalVisitors/.test(kpiSection);
  const hasTotalPageviews = /stats\?\.kpis\?\.totalPageviews/.test(kpiSection);
  const hasWhatsappClicks = /stats\?\.kpis\?\.whatsappClicks/.test(kpiSection);
  const hasPhoneCalls = /stats\?\.kpis\?\.phoneCalls/.test(kpiSection);
  const hasFormLeads = /stats\?\.kpis\?\.formLeads/.test(kpiSection);
  const hasAvgDwellTime = /avgDurationSeconds/.test(kpiSection);

  const allKpisRendered = hasUniqueVisitors && hasTotalPageviews && hasWhatsappClicks &&
    hasPhoneCalls && hasFormLeads && hasAvgDwellTime;

  return {
    hasMobileCondensedKpis,
    hasDesktopFullKpis,
    allKpisRendered,
    metrics: {
      hasUniqueVisitors,
      hasTotalPageviews,
      hasWhatsappClicks,
      hasPhoneCalls,
      hasFormLeads,
      hasAvgDwellTime,
    },
  };
}

/**
 * Inspects Tab-Level Scorecards across Tabs 1-5 (R2 Mobile Condensation & R3 Desktop Preservation)
 */
export function inspectTabScorecards() {
  const code = getPageSource();

  // Tab 1: Stream GSC scorecards
  const streamSection = code.slice(code.indexOf("{activeTab === 'stream' &&"));
  const tab1Stream = {
    hasMobileCondensedStrip: /(?:flex\s+lg:grid|flex\s+md:grid)/.test(streamSection) &&
      /overflow-x-auto/.test(streamSection) &&
      /snap-x/.test(streamSection) &&
      /touch-pan-x/.test(streamSection),
    hasMetricToggles: /toggleMetric\('clicks'\)/.test(streamSection) &&
      /toggleMetric\('pageviews'\)/.test(streamSection) &&
      /toggleMetric\('visitors'\)/.test(streamSection) &&
      /toggleMetric\('leads'\)/.test(streamSection),
    hasDesktopGrid: /lg:grid-cols-4/.test(streamSection),
  };

  // Tab 2: Products scorecards
  const productsSection = code.slice(code.indexOf("{activeTab === 'products' &&"));
  const tab2Products = {
    hasMobileCondensedStrip: /(?:flex\s+lg:grid|flex\s+md:grid)/.test(productsSection) &&
      /overflow-x-auto/.test(productsSection) &&
      /snap-x/.test(productsSection) &&
      /touch-pan-x/.test(productsSection),
    hasProductFilterButtons: /setProductFilter\('all'\)/.test(productsSection) &&
      /setProductFilter\('active'\)/.test(productsSection) &&
      /setProductFilter\('high_demand'\)/.test(productsSection) &&
      /setProductFilter\('opportunity'\)/.test(productsSection) &&
      /setProductFilter\('zero'\)/.test(productsSection),
    hasDesktopGrid: /lg:grid-cols-5/.test(productsSection),
  };

  // Tab 3: Audience geo scorecards
  const audienceSection = code.slice(code.indexOf("{activeTab === 'audience' &&"));
  const tab3Audience = {
    hasMobileCondensedStrip: /flex\s+md:grid/.test(audienceSection) &&
      /overflow-x-auto/.test(audienceSection) &&
      /snap-x/.test(audienceSection) &&
      /touch-pan-x/.test(audienceSection),
    hasDesktopGrid: /(?:md:grid-cols-2|lg:grid-cols-4)/.test(audienceSection),
  };

  // Tab 4: Demand scorecards
  const demandSection = code.slice(code.indexOf("{activeTab === 'demand' &&"));
  const tab4Demand = {
    hasMobileCondensedStrip: /(?:flex\s+md:grid|flex\s+lg:grid)/.test(demandSection) &&
      /overflow-x-auto/.test(demandSection) &&
      /snap-x/.test(demandSection) &&
      /touch-pan-x/.test(demandSection),
    hasDesktopGrid: /lg:grid-cols-4/.test(demandSection),
  };

  // Tab 5: Visitors lead scorecards
  const visitorsSection = code.slice(code.indexOf("{activeTab === 'visitors' &&"));
  const tab5Visitors = {
    hasMobileCondensedStrip: /(?:flex\s+md:grid|flex\s+lg:grid)/.test(visitorsSection) &&
      /overflow-x-auto/.test(visitorsSection) &&
      /snap-x/.test(visitorsSection) &&
      /touch-pan-x/.test(visitorsSection),
    hasDesktopGrid: /lg:grid-cols-4/.test(visitorsSection),
  };

  return {
    tab1Stream,
    tab2Products,
    tab3Audience,
    tab4Demand,
    tab5Visitors,
  };
}
