/**
 * E2E Test Suite Type Definitions
 * Admin Analytics Dashboard Mobile Overhaul
 */

export type ViewportName = 'mobile-375' | 'mobile-390' | 'mobile-414' | 'tablet-768' | 'desktop-1024' | 'desktop-1280';

export interface ViewportConfig {
  name: ViewportName;
  width: number;
  height: number;
  isMobile: boolean; // < 768px
}

export type AnalyticsTab = 'stream' | 'products' | 'audience' | 'demand' | 'visitors' | 'restrictions';

export type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | 'all';

export interface TouchTargetSpec {
  elementDescription: string;
  minWidth: number;
  minHeight: number;
  selectorOrFinder: string;
}

export interface ResponsiveSeparationCheck {
  featureName: string;
  tabOrComponent: string;
  mobileSelector: string;
  desktopSelector: string;
  hasMobileCardView: boolean;
  hasDesktopTableView: boolean;
}

export interface ModalBottomSheetCheck {
  modalName: string;
  stateTrigger: string;
  hasBottomSheetClasses: boolean;
  hasDesktopCenteredClasses: boolean;
  hasSlideUpAnimation: boolean;
}

export interface TestResult {
  tier: 1 | 2 | 3 | 4;
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tierBreakdown: Record<number, { total: number; passed: number; failed: number }>;
  results: TestResult[];
}
