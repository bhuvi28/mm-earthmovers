import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ANALYTICS_DIR = path.resolve('app/admin/analytics');
const PAGE_PATH = path.resolve(ANALYTICS_DIR, 'page.tsx');
const MODULAR_SUBDIRS = ['_components', '_hooks', '_types', '_utils'];

/**
 * Returns deterministically sorted list of all `.ts` / `.tsx` files under `app/admin/analytics/`.
 */
export function getAnalyticsSourceFiles() {
  const files = [PAGE_PATH];
  for (const sub of MODULAR_SUBDIRS) {
    const dirPath = path.resolve(ANALYTICS_DIR, sub);
    if (!fs.existsSync(dirPath)) continue;
    const entries = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    for (const name of entries) {
      files.push(path.resolve(dirPath, name));
    }
  }
  return files;
}

/**
 * Reads a modular component file if present, falling back to slicing `page.tsx` at `fallbackMarker`.
 */
function readComponentOrSlice(relPath, fallbackMarker) {
  const targetPath = path.resolve(ANALYTICS_DIR, relPath);
  if (fs.existsSync(targetPath)) {
    return fs.readFileSync(targetPath, 'utf8');
  }
  const pageRaw = fs.readFileSync(PAGE_PATH, 'utf8');
  if (!fallbackMarker) return pageRaw;
  const idx = pageRaw.indexOf(fallbackMarker);
  return idx >= 0 ? pageRaw.slice(idx) : '';
}

/**
 * Reads aggregated source code across `app/admin/analytics/` (page.tsx + modular sub-modules)
 */
export function getPageSource() {
  return getAnalyticsSourceFiles()
    .map((filePath) => {
      const relPath = path.relative(ANALYTICS_DIR, filePath).replace(/\\/g, '/');
      return `// === FILE: ${relPath} ===\n${fs.readFileSync(filePath, 'utf8')}`;
    })
    .join('\n');
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
  if (className.includes('md:hidden')) {
    return false;
  }
  return true;
}

/**
 * Inspects Root Page Layout on `app/admin/analytics/page.tsx`
 */
export function inspectRootLayout() {
  const code = fs.readFileSync(PAGE_PATH, 'utf8');
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
  const headerPath = path.resolve(ANALYTICS_DIR, '_components/DashboardHeader.tsx');
  const pageCode = fs.readFileSync(PAGE_PATH, 'utf8');
  const headerCode = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : pageCode;
  const combinedCode = `${headerCode}\n${pageCode}`;

  // Header Sticky & Padding
  const hasStickyHeader = /<header[^>]*sticky\s+top-0/s.test(headerCode);
  const headerMatches = headerCode.match(/<header[^>]*className=["'`]([^"'`]+)["'`]/);
  const headerClass = headerMatches ? headerMatches[1] : '';

  // Time Range Selector
  const hasToday = /'today'/.test(headerCode);
  const has7d = /'7d'/.test(headerCode);
  const has30d = /'30d'/.test(headerCode);
  const hasAll = /'all'/.test(headerCode);
  const hasCompactMobileLabels = /Today|7d|30d|All/.test(headerCode) && /sm:hidden/.test(headerCode);

  // Tab Strip
  const hasMobileTabStrip =
    /<nav[^>]*Mobile Analytics Navigation/i.test(headerCode) ||
    /aria-label=["']Mobile Analytics Navigation["']/i.test(headerCode) ||
    /flex\s+md:hidden[^>]*overflow-x-auto/.test(headerCode);

  const hasScrollbarHide = /scrollbar-hide/.test(headerCode);
  const hasTouchPanX = /touch-pan-x|overflow-x-auto/.test(headerCode);

  // 6 Core Tabs presence (plus optional 7th 'ops' tab)
  const tabs = ['stream', 'products', 'audience', 'demand', 'visitors', 'restrictions'];
  const missingTabs = tabs.filter((t) => !combinedCode.includes(`'${t}'`));
  const hasOpsTab = headerCode.includes("'ops'") && pageCode.includes("'ops'");
  const hasAll7Tabs = missingTabs.length === 0 && hasOpsTab;

  // Touch targets for mobile tab buttons (min-h-[44px] or 44px hit-box)
  const has44pxMobileTabs = /min-h-\[44px\]/.test(headerCode);

  // Desktop Tabs preserved
  const hasDesktopTabStrip =
    /hidden\s+md:flex[^>]*border-b/.test(pageCode) || /hidden\s+md:flex/.test(pageCode);
  const hasNavAnchorComment = /Navigation Tabs/.test(pageCode);

  return {
    hasStickyHeader,
    headerClass,
    hasOpsTab,
    hasAll7Tabs,
    hasNavAnchorComment,
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
      hasOpsTab,
      hasAll7Tabs,
      has44pxTouchTargets: has44pxMobileTabs,
    },
    desktopTabStrip: {
      hasDesktopTabStrip,
      hasNavAnchorComment,
    },
  };
}

/**
 * Inspects Tab 1 (stream / Live Activity Feed)
 */
export function inspectTabStream() {
  const streamSection = readComponentOrSlice(
    '_components/LiveStreamTab.tsx',
    "activeTab === 'stream'"
  );

  // Check for mobile cards view
  const hasMobileCards =
    /md:hidden/.test(streamSection) && /border\s+border-slate-200/.test(streamSection);

  // Check required mobile card fields
  const hasEventField = /event_type|action/i.test(streamSection);
  const hasPageField = /page_path|page/i.test(streamSection);
  const hasElementField = /element_text|details/i.test(streamSection);
  const hasVisitorField = /visitor_id|buyer|lead/i.test(streamSection);
  const hasIpField = /ip_address|ip/i.test(streamSection);
  const hasLocationField = /city|country|location/i.test(streamSection);
  const hasTimeField = /created_at|time|formatDate/i.test(streamSection);

  // Check desktop table preservation
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    streamSection
  );
  const hasTableColumns =
    /Time/.test(streamSection) && /Action/.test(streamSection) && /Page/.test(streamSection);

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
  const productsSection = readComponentOrSlice(
    '_components/ProductDemandTab.tsx',
    "activeTab === 'products'"
  );

  const hasMobileCards =
    /md:hidden/.test(productsSection) || /viewMode === 'cards'/.test(productsSection);
  const hasCopyPartButton = /handleCopyPart/.test(productsSection);
  const has44pxCopyButton = /min-h-\[44px\]|py-2\.5|p-2\.5|min-w-\[44px\]|h-11|h-12/.test(
    productsSection
  );
  const hasViewSwitcher = /viewMode/.test(productsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    productsSection
  );

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
  const audienceSection = readComponentOrSlice(
    '_components/AudienceGeoTab.tsx',
    "activeTab === 'audience'"
  );

  const hasGeoLevels =
    /geoLevel/.test(audienceSection) && /cities|states|countries/i.test(audienceSection);

  const hasMobileCards = /md:hidden/.test(audienceSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    audienceSection
  );

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
  const demandSection = readComponentOrSlice(
    '_components/SearchDwellTab.tsx',
    "activeTab === 'demand'"
  );

  const hasSearchDemandCards =
    /Search Query|Part Keyword|searchDemand/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasDwellCards = /Dwell|avgDwell/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasSentinelCards =
    /Sentinel|Heuristic|Surveillance/i.test(demandSection) && /md:hidden/.test(demandSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    demandSection
  );

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
  const visitorsSection = readComponentOrSlice(
    '_components/VisitorsTab.tsx',
    "activeTab === 'visitors'"
  );

  const hasMobileLeadCards = /md:hidden/.test(visitorsSection);
  const hasAvatar = /avatar|rounded-full|bg-amber/i.test(visitorsSection);
  const hasLeadName = /name|company|lead/i.test(visitorsSection);
  const hasWhatsAppButton = /wa\.me|whatsapp|api\.whatsapp\.com/i.test(visitorsSection);
  const hasLifecycleActions = /openVisitorJourney/.test(visitorsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    visitorsSection
  );

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
  const restrictionsSection = readComponentOrSlice(
    '_components/RestrictionsTab.tsx',
    "activeTab === 'restrictions'"
  );

  const hasMobileCards = /md:hidden/.test(restrictionsSection);
  const hasUnblockAction = /handleRemoveRestriction/.test(restrictionsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(
    restrictionsSection
  );

  return {
    hasMobileCards,
    hasUnblockAction,
    hasDesktopTable,
  };
}

/**
 * Inspects Tab 7 (ops / Ops & Audit)
 */
export function inspectTabOps() {
  const opsSection = readComponentOrSlice('_components/OpsHealthTab.tsx', "activeTab === 'ops'");

  const hasMobileCards = /md:hidden/.test(opsSection);
  const hasDesktopTable = /hidden\s+md:table|hidden\s+md:block|table\s+className/.test(opsSection);
  const has44pxControls = /min-h-\[44px\]/.test(opsSection);
  const hasOpsPanels =
    /ingestStats/.test(opsSection) &&
    /apiSla/.test(opsSection) &&
    /dbPoolAndCache|dbPool/.test(opsSection) &&
    /externalSlas/.test(opsSection) &&
    /alertDeliveries|alerts/.test(opsSection) &&
    /notFoundPaths/.test(opsSection) &&
    /loadingScreen/.test(opsSection) &&
    /clientErrors/.test(opsSection) &&
    /middlewareBlocks/.test(opsSection) &&
    /auditLogs/.test(opsSection);

  return {
    hasMobileCards,
    hasDesktopTable,
    has44pxControls,
    hasOpsPanels,
  };
}

/**
 * Inspects Modals & Bottom Sheets (Visitor Journey, Add IP)
 */
export function inspectModals() {
  const journeyPath = path.resolve(ANALYTICS_DIR, '_components/VisitorJourneyModal.tsx');
  const restrictionsPath = path.resolve(ANALYTICS_DIR, '_components/RestrictionsTab.tsx');
  const pageCode = fs.readFileSync(PAGE_PATH, 'utf8');

  const journeyCode = fs.existsSync(journeyPath)
    ? fs.readFileSync(journeyPath, 'utf8')
    : pageCode;
  const restrictionsCode = fs.existsSync(restrictionsPath)
    ? fs.readFileSync(restrictionsPath, 'utf8')
    : pageCode;
  const combinedModals = `${journeyCode}\n${restrictionsCode}\n${pageCode}`;

  // Visitor Journey Modal
  const hasVisitorJourney = /selectedVisitorId/.test(combinedModals);
  const hasJourneyBottomSheet =
    /items-end/.test(journeyCode) &&
    (/rounded-t-3xl|rounded-t-2xl/.test(journeyCode) ||
      /max-h-\[88vh\]|max-h-\[90vh\]|max-h-\[92vh\]/.test(journeyCode));
  const hasJourneyDesktopCentered =
    /md:items-center/.test(journeyCode) || /md:rounded-2xl/.test(journeyCode);
  const hasSlideUpAnimation = /animate-slide-up/.test(journeyCode);

  // Add IP Modal
  const hasAddIpModal = /isAddIpModalOpen/.test(combinedModals);
  const hasAddIpBottomSheet =
    hasAddIpModal && (/items-end/.test(restrictionsCode) || /items-end/.test(pageCode));

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
 * Viewport Geometry & Fixed Width Overflow Scanner across all modular analytics files
 */
export function scanFixedPixelOverflow(viewportWidth = 375) {
  const files = getAnalyticsSourceFiles();
  const violations = [];

  // Look for fixed pixel width classes like min-w-[500px], w-[800px], etc.
  // that do NOT have a responsive prefix (md:, lg:, xl:, 2xl:) and exceed viewportWidth
  const fixedWidthRegex = /(?<![a-zA-Z0-9:_-])(min-w|w)-\[(\d+)px\]/g;

  for (const filePath of files) {
    const relPath = path.relative(ANALYTICS_DIR, filePath).replace(/\\/g, '/');
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');

    lines.forEach((line, index) => {
      fixedWidthRegex.lastIndex = 0;
      let match;
      while ((match = fixedWidthRegex.exec(line)) !== null) {
        const pxValue = parseInt(match[2], 10);
        const fullMatch = match[0];
        const matchIndex = match.index;

        // Check if preceded by a breakpoint prefix like "sm:", "md:", "lg:", "xl:"
        const prefixSlice = line.slice(Math.max(0, matchIndex - 6), matchIndex);
        const isPrefixed = /(sm|md|lg|xl|2xl):$/.test(prefixSlice);

        if (!isPrefixed && pxValue > viewportWidth - 32) {
          if (!line.includes('viewBox') && !line.includes('hidden md:')) {
            violations.push({
              file: relPath,
              line: index + 1,
              classFound: fullMatch,
              pxValue,
              text: line.trim(),
            });
          }
        }
      }
    });
  }

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
  const kpiPath = path.resolve(ANALYTICS_DIR, '_components/KpiStrip.tsx');
  let kpiSection;
  if (fs.existsSync(kpiPath)) {
    kpiSection = fs.readFileSync(kpiPath, 'utf8');
  } else {
    const code = fs.readFileSync(PAGE_PATH, 'utf8');
    const kpiSectionMatch = code.match(/dashboardError[\s\S]*?(?:Navigation Tabs)/);
    kpiSection = kpiSectionMatch ? kpiSectionMatch[0] : code;
  }

  // Mobile checks (< 768px)
  const hasMobileCondensedKpis =
    /flex\s+md:hidden/.test(kpiSection) &&
    /overflow-x-auto/.test(kpiSection) &&
    /scrollbar-hide/.test(kpiSection) &&
    /snap-x/.test(kpiSection) &&
    /touch-pan-x/.test(kpiSection);

  // Desktop checks (>= 768px)
  const hasDesktopFullKpis =
    /hidden\s+md:grid/.test(kpiSection) && /lg:grid-cols-6/.test(kpiSection);

  // KPI item coverage in both mobile and desktop views
  const hasUniqueVisitors = /stats\?\.kpis\?\.totalVisitors/.test(kpiSection);
  const hasTotalPageviews = /stats\?\.kpis\?\.totalPageviews/.test(kpiSection);
  const hasWhatsappClicks = /stats\?\.kpis\?\.whatsappClicks/.test(kpiSection);
  const hasPhoneCalls = /stats\?\.kpis\?\.phoneCalls/.test(kpiSection);
  const hasFormLeads = /stats\?\.kpis\?\.formLeads/.test(kpiSection);
  const hasAvgDwellTime = /avgDurationSeconds/.test(kpiSection);

  const allKpisRendered =
    hasUniqueVisitors &&
    hasTotalPageviews &&
    hasWhatsappClicks &&
    hasPhoneCalls &&
    hasFormLeads &&
    hasAvgDwellTime;

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
  // Tab 1: Stream GSC scorecards
  const streamSection = readComponentOrSlice(
    '_components/LiveStreamTab.tsx',
    "{activeTab === 'stream' &&"
  );
  const tab1Stream = {
    hasMobileCondensedStrip:
      /(?:flex\s+lg:grid|flex\s+md:grid)/.test(streamSection) &&
      /overflow-x-auto/.test(streamSection) &&
      /snap-x/.test(streamSection) &&
      /touch-pan-x/.test(streamSection),
    hasMetricToggles:
      /toggleMetric\('clicks'\)/.test(streamSection) &&
      /toggleMetric\('pageviews'\)/.test(streamSection) &&
      /toggleMetric\('visitors'\)/.test(streamSection) &&
      /toggleMetric\('leads'\)/.test(streamSection),
    hasDesktopGrid: /lg:grid-cols-4/.test(streamSection),
  };

  // Tab 2: Products scorecards
  const productsSection = readComponentOrSlice(
    '_components/ProductDemandTab.tsx',
    "{activeTab === 'products' &&"
  );
  const tab2Products = {
    hasMobileCondensedStrip:
      /(?:flex\s+lg:grid|flex\s+md:grid)/.test(productsSection) &&
      /overflow-x-auto/.test(productsSection) &&
      /snap-x/.test(productsSection) &&
      /touch-pan-x/.test(productsSection),
    hasProductFilterButtons:
      /setProductFilter\('all'\)/.test(productsSection) &&
      /setProductFilter\('active'\)/.test(productsSection) &&
      /setProductFilter\('high_demand'\)/.test(productsSection) &&
      /setProductFilter\('opportunity'\)/.test(productsSection) &&
      /setProductFilter\('zero'\)/.test(productsSection),
    hasDesktopGrid: /lg:grid-cols-5/.test(productsSection),
  };

  // Tab 3: Audience geo scorecards
  const audienceSection = readComponentOrSlice(
    '_components/AudienceGeoTab.tsx',
    "{activeTab === 'audience' &&"
  );
  const tab3Audience = {
    hasMobileCondensedStrip:
      /flex\s+md:grid/.test(audienceSection) &&
      /overflow-x-auto/.test(audienceSection) &&
      /snap-x/.test(audienceSection) &&
      /touch-pan-x/.test(audienceSection),
    hasDesktopGrid: /(?:md:grid-cols-2|lg:grid-cols-4)/.test(audienceSection),
  };

  // Tab 4: Demand scorecards
  const demandSection = readComponentOrSlice(
    '_components/SearchDwellTab.tsx',
    "{activeTab === 'demand' &&"
  );
  const tab4Demand = {
    hasMobileCondensedStrip:
      /(?:flex\s+md:grid|flex\s+lg:grid)/.test(demandSection) &&
      /overflow-x-auto/.test(demandSection) &&
      /snap-x/.test(demandSection) &&
      /touch-pan-x/.test(demandSection),
    hasDesktopGrid: /lg:grid-cols-4/.test(demandSection),
  };

  // Tab 5: Visitors lead scorecards
  const visitorsSection = readComponentOrSlice(
    '_components/VisitorsTab.tsx',
    "{activeTab === 'visitors' &&"
  );
  const tab5Visitors = {
    hasMobileCondensedStrip:
      /(?:flex\s+md:grid|flex\s+lg:grid)/.test(visitorsSection) &&
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

/**
 * Inspects ProductInspectorDrawer (`PROD-08`, `BI-05`)
 */
export function inspectProductInspectorDrawer() {
  const drawerPath = path.resolve(ANALYTICS_DIR, '_components/ProductInspectorDrawer.tsx');
  const code = fs.existsSync(drawerPath) ? fs.readFileSync(drawerPath, 'utf8') : '';

  const hasBottomSheet =
    /rounded-t-3xl/.test(code) && /max-h-\[88vh\]/.test(code) && /animate-slide-up/.test(code);
  const hasDesktopDrawer = /md:max-w-xl/.test(code) && /md:h-full/.test(code);
  const has44pxTargets = /min-h-\[44px\]/.test(code);
  const hasDirectProductEventsQuery = /view:\s*['"]product_events['"]/.test(code);
  const hasBi05Signals =
    /productEngagementStats/.test(code) &&
    /itemEngagement\.zoomOpens/.test(code) &&
    /itemEngagement\.specToggles/.test(code) &&
    /itemEngagement\.relatedClicks/.test(code) &&
    /itemEngagement\.placeholderImpressions/.test(code);
  const hasRelatedTransitions = /topRelatedTransitions/.test(code);

  return {
    exists: code.length > 0,
    hasBottomSheet,
    hasDesktopDrawer,
    has44pxTargets,
    hasDirectProductEventsQuery,
    hasBi05Signals,
    hasRelatedTransitions,
    isCompliant:
      code.length > 0 &&
      hasBottomSheet &&
      hasDesktopDrawer &&
      has44pxTargets &&
      hasDirectProductEventsQuery &&
      hasBi05Signals,
  };
}

/**
 * Inspects responsive paired `md:hidden` + `hidden md:block` / `<table` layouts on all P2 BI panels
 * plus unified `clusters.ts` imports (`BI-04`, `BI-05`, `BI-07`, `BI-08`, `BI-09`, `BUG-13`).
 */
export function inspectBiPanelsResponsive() {
  const checkBoundedPanel = (code, { propName, startMarker, endMarker }) => {
    if (!code.includes(propName)) {
      return { found: false, hasMobileCards: false, hasDesktopTable: false };
    }
    const startIdx = code.indexOf(startMarker);
    if (startIdx < 0) {
      return { found: false, hasMobileCards: false, hasDesktopTable: false };
    }
    let endIdx = code.length;
    if (endMarker) {
      endIdx = code.indexOf(endMarker, startIdx + startMarker.length);
      if (endIdx <= startIdx) {
        return { found: false, hasMobileCards: false, hasDesktopTable: false };
      }
    }
    const slice = code.slice(startIdx, endIdx);
    const mobileMatches = slice.match(/\bblock\s+md:hidden\b/g) || [];
    const desktopMatches = slice.match(/\bhidden\s+md:block\b/g) || [];
    const tableMatches = slice.match(/<table\b/g) || [];
    const hasMobileCards = mobileMatches.length > 0;
    const hasDesktopTable =
      desktopMatches.length > 0 &&
      tableMatches.length > 0 &&
      mobileMatches.length === desktopMatches.length &&
      desktopMatches.length === tableMatches.length;
    return { found: true, hasMobileCards, hasDesktopTable };
  };

  const productsCode = readComponentOrSlice('_components/ProductDemandTab.tsx');
  const audienceCode = readComponentOrSlice('_components/AudienceGeoTab.tsx');
  const demandCode = readComponentOrSlice('_components/SearchDwellTab.tsx');
  const visitorsCode = readComponentOrSlice('_components/VisitorsTab.tsx');

  const catalogHealthGaps = checkBoundedPanel(productsCode, {
    propName: 'catalogHealthGaps',
    startMarker: '{/* 5C. CATALOG HEALTH GAPS:',
    endMarker: '{/* 5D. SITE-WIDE PRODUCT ENGAGEMENT',
  });
  const productEngagementStats = checkBoundedPanel(productsCode, {
    propName: 'productEngagementStats',
    startMarker: '{/* 5D. SITE-WIDE PRODUCT ENGAGEMENT',
    endMarker: null,
  });
  const exportFunnelStats = checkBoundedPanel(audienceCode, {
    propName: 'exportFunnelStats',
    startMarker: '{/* 2B. EXPORT CORRIDOR FUNNEL',
    endMarker: '{/* 3. ACQUISITION CHANNELS',
  });
  const modelHubStats = checkBoundedPanel(demandCode, {
    propName: 'modelHubStats',
    startMarker: '{/* 2C. MACHINE MODEL HUBS',
    endMarker: '{/* 3. SECTION B: DWELL TIME',
  });
  const cohortRetentionStats = checkBoundedPanel(visitorsCode, {
    propName: 'cohortRetentionStats',
    startMarker: '{/* COHORT RETENTION',
    endMarker: null,
  });

  const clustersUnified =
    /from\s+['"]@\/lib\/analytics\/clusters['"]/.test(audienceCode) &&
    /getIndustrialClusterTag/.test(audienceCode) &&
    /from\s+['"]@\/lib\/analytics\/clusters['"]/.test(visitorsCode) &&
    /getIndustrialBadge/.test(visitorsCode);

  const panels = {
    catalogHealthGaps,
    productEngagementStats,
    exportFunnelStats,
    modelHubStats,
    cohortRetentionStats,
  };

  const allPanelsCompliant = Object.values(panels).every(
    (p) => p.found && p.hasMobileCards && p.hasDesktopTable
  );

  return {
    panels,
    clustersUnified,
    isCompliant: allPanelsCompliant && clustersUnified,
  };
}

/**
 * Inspects Admin Dashboard Modularization (`PROD-08`), visibility-paused active-tab polling,
 * `ProductEnquiryStat.enquire_clicks` preservation, and zero CRM artifacts.
 */
export function inspectAdminModularization() {
  const pageCode = fs.readFileSync(PAGE_PATH, 'utf8');
  const pageLineCount = pageCode.split(/\r?\n/).length;

  const expectedComponents = [
    'DashboardHeader.tsx',
    'KpiStrip.tsx',
    'LiveStreamTab.tsx',
    'ProductDemandTab.tsx',
    'ProductInspectorDrawer.tsx',
    'AudienceGeoTab.tsx',
    'SearchDwellTab.tsx',
    'VisitorsTab.tsx',
    'OpsHealthTab.tsx',
    'RestrictionsTab.tsx',
    'VisitorJourneyModal.tsx',
  ];
  const missingComponents = expectedComponents.filter(
    (name) => !fs.existsSync(path.resolve(ANALYTICS_DIR, '_components', name))
  );

  const typesCode = readComponentOrSlice('_types/analytics.ts');
  const pollingCode = readComponentOrSlice('_hooks/useAnalyticsPolling.ts');
  const actionsCode = readComponentOrSlice('_hooks/useAnalyticsActions.ts');

  const hasTypesEnquireClicks = /enquire_clicks:\s*number/.test(typesCode);
  const hasVisibilityPause = /document\.visibilityState\s*!==\s*['"]visible['"]/.test(pollingCode);
  const hasActiveTabScopedPolling =
    /refreshActiveTab/.test(pollingCode) &&
    /activeTab\s*===\s*['"]stream['"]/.test(pollingCode) &&
    /activeTab\s*===\s*['"]products['"]/.test(pollingCode) &&
    /activeTab\s*===\s*['"]visitors['"]/.test(pollingCode) &&
    /activeTab\s*===\s*['"]restrictions['"]/.test(pollingCode) &&
    /activeTab\s*===\s*['"]ops['"]/.test(pollingCode);

  const allSource = getPageSource();
  const forbiddenCrmTokens = [
    'analytics_lead_events',
    'PATCH /api/leads',
    'estimated_value_inr',
    'first_responded_at',
  ];
  const crmHits = forbiddenCrmTokens.filter((token) => allSource.includes(token));

  return {
    pageLineCount,
    isPageModularized: pageLineCount <= 400 && missingComponents.length === 0,
    missingComponents,
    hasTypesAndHooks:
      typesCode.length > 0 && pollingCode.length > 0 && actionsCode.length > 0,
    hasTypesEnquireClicks,
    hasVisibilityPause,
    hasActiveTabScopedPolling,
    zeroCrm: crmHits.length === 0 && !/['"]crm['"]/.test(allSource),
    crmHits,
  };
}

/**
 * Inspects Storefront & Splash Telemetry Contracts (`BI-04`, `BI-05`, `BI-07`, `BI-08`, `OBS-06`, `OBS-07`)
 * and verifies `PROD-02` & `PROD-04` UI/timers remain untouched.
 */
export function inspectStorefrontAndSplashTelemetry() {
  const readRel = (rel) => {
    const abs = path.resolve(rel);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  };

  const productsPage = readRel('components/ProductsPage.tsx');
  const modelGrid = readRel('components/ModelProductGrid.tsx');
  const imageZoom = readRel('components/ProductImageZoom.tsx');
  const detailsAccordion = readRel('components/ProductDetailsAccordion.tsx');
  const productDetailPage = readRel('app/products/[category]/[slug]/page.tsx');
  const exportInfo = readRel('components/ExportInfo.tsx');
  const useGeo = readRel('hooks/useGeoLocation.ts');
  const modelFaq = readRel('components/ModelFaqAccordion.tsx');
  const modelPage = readRel('app/models/[slug]/page.tsx');
  const videoCarousel = readRel('components/VideoCarousel.tsx');
  const homeClient = readRel('components/HomeClient.tsx');
  const analyticsProvider = readRel('components/AnalyticsProvider.tsx');
  const errorPage = readRel('app/error.tsx');
  const notFoundPage = readRel('app/not-found.tsx');
  const tracker = readRel('lib/analytics/tracker.ts');

  const prod02Untouched =
    /bg-gray-900/.test(productsPage) &&
    /Coming Soon/.test(productsPage) &&
    /bg-gray-900/.test(modelGrid) &&
    /Coming Soon/.test(modelGrid) &&
    /bg-gray-900/.test(imageZoom) &&
    /Coming Soon/.test(imageZoom);

  const prod04Untouched =
    /3000/.test(homeClient) &&
    /12000/.test(homeClient) &&
    /loading_screen_timing/.test(homeClient) &&
    /waitDurationMs/.test(homeClient) &&
    /hitFallback12s/.test(homeClient) &&
    /dismissedNormally/.test(homeClient) &&
    /bouncedBeforeDismiss/.test(homeClient) &&
    /isMobile/.test(homeClient) &&
    /visibilitychange/.test(homeClient) &&
    /pagehide/.test(homeClient);

  const bi04Compliant =
    /mm_ph_imp:catalog_card:/.test(productsPage) &&
    /placeholder_impression/.test(productsPage) &&
    /mm_ph_imp:catalog_card:/.test(modelGrid) &&
    /placeholder_impression/.test(modelGrid) &&
    /mm_ph_imp:detail_hero:/.test(imageZoom) &&
    /placeholder_impression/.test(imageZoom);

  const bi05Compliant =
    /image_zoom/.test(imageZoom) &&
    /durationMs/.test(imageZoom) &&
    /spec_toggle/.test(detailsAccordion) &&
    /ProductDetailsAccordion/.test(productDetailPage) &&
    /data-track="related_product_click"/.test(productDetailPage) &&
    /data-source-slug/.test(productDetailPage) &&
    /data-product-slug/.test(productDetailPage) &&
    /data-position/.test(productDetailPage);

  const bi07Compliant =
    /mm_export_banner_view:/.test(exportInfo) &&
    /export_banner_view/.test(exportInfo) &&
    /mm_ipapi_client_ops_sent/.test(useGeo) &&
    /client_ops/.test(useGeo) &&
    /ipapi_co/.test(useGeo);

  const bi08Compliant =
    /model_faq_accordion_toggle/.test(modelFaq) &&
    /ModelFaqAccordion/.test(modelPage) &&
    /data-track="model_sibling_switcher_card"/.test(modelPage) &&
    /data-source-machine-slug/.test(modelPage) &&
    /data-target-machine-slug/.test(modelPage) &&
    /data-position/.test(modelPage) &&
    /trackLabel === 'model_faq_accordion_toggle' \|\| trackLabel === 'spec_toggle'/.test(tracker);

  const obs07Compliant =
    /video_play/.test(videoCarousel) &&
    /video_switch/.test(videoCarousel) &&
    /video_complete/.test(videoCarousel);

  const obs06Compliant =
    /mm_client_error_count/.test(analyticsProvider) &&
    /MAX_ERRORS_PER_SESSION\s*=\s*5/.test(analyticsProvider) &&
    /client_error/.test(analyticsProvider) &&
    /client_error/.test(errorPage) &&
    /react_boundary/.test(errorPage) &&
    /not_found/.test(notFoundPage) &&
    /inferPartNumberFromPath/.test(notFoundPage);

  return {
    prod02Untouched,
    prod04Untouched,
    bi04Compliant,
    bi05Compliant,
    bi07Compliant,
    bi08Compliant,
    obs07Compliant,
    obs06Compliant,
    allCompliant:
      prod02Untouched &&
      prod04Untouched &&
      bi04Compliant &&
      bi05Compliant &&
      bi07Compliant &&
      bi08Compliant &&
      obs07Compliant &&
      obs06Compliant,
  };
}
