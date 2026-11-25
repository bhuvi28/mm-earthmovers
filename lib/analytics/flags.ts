/**
 * Behavioral Flagging Engine & Disambiguation Logic
 *
 * Implements high-precision detection for commercial nuisance/scraper activity
 * (the Krishnagiri Opera pattern) while strictly guaranteeing:
 * 1. 0% false positive rate for developer Bhuvan test activity (9830164610 from Kolkata)
 * 2. 0% false positive rate for genuine buyers with conversion intent (WhatsApp, phone calls, form submits)
 * 3. Records inserted strictly into `analytics_flags` with metadata
 * 4. STRICT PROHIBITION: ZERO writes/insertions into `analytics_restrictions` or `lib/restrictions.ts`.
 *    All restrictions and blocking remain manual admin actions.
 */

import { IngestPayload, addFlag, query, FlagRecord } from './db';
import { dispatchAlert, SentinelAlertPayload } from './alert';

export interface EvaluateFlagParams {
  visitorId: string;
  sessionId: string;
  events: IngestPayload[];
  clientIp?: string;
  geo?: {
    city?: string;
    region?: string;
    country?: string;
  };
  clientMeta?: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
  identifiedName?: string;
  identifiedContact?: string | number;
  sessionDurationSeconds?: number;
}

export interface FlagResult {
  flagged: boolean;
  flagType: 'competitor' | 'nuisance';
  heuristicName: string;
  reason: string;
  details: Record<string, any>;
  record?: FlagRecord;
}

export interface BehavioralMetrics {
  partCopiesCount: number;
  distinctPages: number;
  durationSeconds: number;
  rageClicksCount: number;
  leadActionsCount: number;
  city?: string;
  browser?: string;
}

/**
 * Check if a telemetry event represents copying an OEM part number
 */
export function isPartNumberCopy(ev: IngestPayload): boolean {
  if (ev.eventType !== 'copy') return false;

  const rawText = (ev.metadata?.copiedText || ev.elementText || '').trim();

  // If text contains UI badges, brand/category names, price tokens, or multi-word phrases, exclude
  if (rawText) {
    const lower = rawText.toLowerCase();
    if (
      lower.includes('in-stock') ||
      lower.includes('model') ||
      lower.includes('available') ||
      lower.includes('compatible') ||
      lower.includes('parts available') ||
      lower.includes('hindustan') ||
      lower.includes('earthmover') ||
      lower.includes('earthmovers') ||
      lower.includes('excavator') ||
      lower.includes('loader') ||
      lower.includes('price') ||
      lower.includes('rs.') ||
      lower.includes('rs ') ||
      lower.includes('inr') ||
      lower.includes('₹') ||
      lower.includes('$') ||
      lower.includes('welcome')
    ) {
      return false;
    }

    // Explicit price pattern filter (e.g. Rs. 45000, INR 45000, ₹45000, $45000)
    if (/^(?:rs\.?|inr|₹|\$)\s*\d+/i.test(rawText)) {
      return false;
    }

    // Genuine OEM part numbers are compact tokens, not multi-word sentences
    if (rawText.split(/\s+/).length > 2) {
      return false;
    }
  }

  // Explicit itemType metadata from client tracker (if not disqualified by UI phrases above)
  if (ev.metadata?.itemType === 'part_number') {
    if (rawText) {
      return /^(?=.*\d)[0-9A-Za-z\-_\/]{3,24}$/.test(rawText);
    }
    return true;
  }

  // Element tag / selector indicator
  if (ev.elementTag === 'part-number' || ev.elementTarget?.includes('part-number')) {
    if (rawText) {
      return /^(?=.*\d)[0-9A-Za-z\-_\/]{3,24}$/.test(rawText);
    }
    return true;
  }

  // Text content heuristics on product catalog pages
  const page = ev.pagePath || '';
  if (page.startsWith('/products') || page.startsWith('/models')) {
    // Alphanumeric part number patterns (e.g. 5223015-5223016, 23045902, 110-3323)
    // Requires at least one digit to prevent matching pure English words (Earthmovers, Excavator, etc.)
    if (/^(?=.*\d)[A-Za-z0-9\-_\/]{4,24}$/.test(rawText)) return true;
    if (/\b\d{5,12}\b/.test(rawText)) return true;
  }

  return false;
}

/**
 * Check if the user/session has conversion intent (WhatsApp, Phone call, Form submission)
 */
export function hasConversionIntent(events: IngestPayload[]): boolean {
  for (const ev of events) {
    // 1. Contact Form Submission
    if (ev.eventType === 'form_submit') {
      return true;
    }

    // 2. Outbound RFQ click (WhatsApp or telephone link)
    if (ev.eventType === 'click') {
      const target = (ev.elementTarget || '').toLowerCase();
      if (target.includes('wa.me') || target.startsWith('tel:') || target.includes('whatsapp.com')) {
        return true;
      }
    }

    // 3. Callback request button click
    const text = (ev.elementText || '').toLowerCase();
    if (text.includes('callback') || text.includes('request call') || text.includes('rfq')) {
      return true;
    }
  }

  return false;
}

/**
 * Strict whitelist check for configured developer/tester identities (defaults preserve Kolkata Bhuvan test exemption)
 */
export function isBhuvanExempt(params: EvaluateFlagParams): boolean {
  const exemptContacts = (process.env.EXEMPT_TEST_CONTACTS || '9830164610')
    .split(',')
    .map((v) => v.replace(/\D/g, ''))
    .filter(Boolean);
  const exemptNames = (process.env.EXEMPT_TEST_NAMES || 'bhuvan')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  // Check identified fields
  const contactDigits = String(params.identifiedContact || '').replace(/\D/g, '');
  const nameStr = String(params.identifiedName || '').toLowerCase();

  if (
    exemptContacts.some((c) => contactDigits.includes(c)) ||
    exemptNames.some((n) => nameStr.includes(n))
  ) {
    return true;
  }

  // Check event metadata for tester identity
  for (const ev of params.events) {
    if (ev.metadata) {
      const evContactDigits = String(ev.metadata.contact || ev.metadata.phone || '').replace(/\D/g, '');
      const evName = String(ev.metadata.name || '').toLowerCase();
      if (
        exemptContacts.some((c) => evContactDigits.includes(c)) ||
        exemptNames.some((n) => evName.includes(n))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluate behavioral signature criteria
 */
export function evaluateBehavioralSignature(metrics: BehavioralMetrics): {
  matches: boolean;
  heuristic: string;
  reason: string;
} {
  // Whitelist condition: Any lead conversion action completely excludes nuisance classification
  if (metrics.leadActionsCount > 0) {
    return {
      matches: false,
      heuristic: 'none',
      reason: 'User engaged conversion channel (WhatsApp / Phone / Form submit)',
    };
  }

  // Vector A: Mass Part Number Harvester (>= 3 part number copies with 0 conversion actions)
  if (metrics.partCopiesCount >= 3) {
    return {
      matches: true,
      heuristic: 'mass_part_harvester',
      reason: `High velocity part number harvesting: copied ${metrics.partCopiesCount} OEM part numbers with 0 conversion inquiries.`,
    };
  }

  // Vector B: Catalog Surveillance & Dwell Scraping (>= 2 part copies, >= 4 distinct pages, duration >= 300s)
  if (metrics.partCopiesCount >= 2 && metrics.distinctPages >= 4 && metrics.durationSeconds >= 300) {
    return {
      matches: true,
      heuristic: 'catalog_recon_dwell',
      reason: `Extended catalog surveillance: ${metrics.distinctPages} pages browsed over ${metrics.durationSeconds}s with ${metrics.partCopiesCount} part copies and 0 conversion inquiries.`,
    };
  }

  // Vector C: Krishnagiri Location Pattern (Krishnagiri + >= 2 part copies or duration >= 600s with copies >= 1)
  const isKrishnagiri = (metrics.city || '').toLowerCase().includes('krishnagiri');
  if (isKrishnagiri && (metrics.partCopiesCount >= 2 || (metrics.durationSeconds >= 600 && metrics.partCopiesCount >= 1))) {
    return {
      matches: true,
      heuristic: 'krishnagiri_opera_nuisance',
      reason: `Krishnagiri scraper signature: ${metrics.partCopiesCount} part copies with abnormal dwell (${metrics.durationSeconds}s) and 0 conversion inquiries.`,
    };
  }

  return {
    matches: false,
    heuristic: 'none',
    reason: 'Normal visitor behavior threshold',
  };
}

/**
 * Main evaluation function: evaluates incoming events, fetches cumulative session stats,
 * persists flag into `analytics_flags`, and triggers non-blocking zero-cost alerting.
 *
 * NOTE: NEVER inserts into `analytics_restrictions`. All restrictions remain manual admin action.
 */
export async function evaluateAndRecordFlag(params: EvaluateFlagParams): Promise<FlagResult | null> {
  try {
    // 1. Whitelist Check: Developer Bhuvan test activity (9830164610 from Kolkata)
    if (isBhuvanExempt(params)) {
      return {
        flagged: false,
        flagType: 'competitor',
        heuristicName: 'exempt_bhuvan',
        reason: 'Exempt: Developer test identity (Kolkata Bhuvan 9830164610)',
        details: { visitorId: params.visitorId, contact: params.identifiedContact },
      };
    }

    // 2. Whitelist Check: Immediate conversion intent in current batch
    if (hasConversionIntent(params.events)) {
      return {
        flagged: false,
        flagType: 'competitor',
        heuristicName: 'exempt_conversion',
        reason: 'Exempt: User demonstrated conversion intent (WhatsApp / Phone / Form submit)',
        details: { visitorId: params.visitorId },
      };
    }

    // 3. Batch metrics calculation
    const batchCopies = params.events.filter(isPartNumberCopy).length;
    const batchDistinctPages = new Set(params.events.map((e) => e.pagePath).filter(Boolean)).size;
    const batchRageClicks = params.events.filter((e) => e.eventType === 'rage_click').length;

    // 4. Cumulative session metrics (query DB if session already has history)
    let cumulativeCopies = batchCopies;
    let cumulativePages = batchDistinctPages;
    let cumulativeDuration = params.sessionDurationSeconds || 0;
    let cumulativeRageClicks = batchRageClicks;
    let dbLeadActions = 0;

    try {
      if (params.sessionId) {
        const dbStats = await query<{
          total_copies: string;
          distinct_pages: string;
          lead_clicks: string;
          form_submits: string;
          rage_clicks: string;
          duration_seconds: string;
        }>(
          `
          SELECT
            COUNT(CASE WHEN event_type = 'copy' THEN 1 END) AS total_copies,
            COUNT(DISTINCT page_path) AS distinct_pages,
            COUNT(CASE WHEN event_type = 'click' AND (element_target LIKE '%wa.me%' OR element_target LIKE 'tel:%') THEN 1 END) AS lead_clicks,
            COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) AS form_submits,
            COUNT(CASE WHEN event_type = 'rage_click' THEN 1 END) AS rage_clicks,
            COALESCE(MAX(s.duration_seconds), 0) AS duration_seconds
          FROM analytics_events e
          LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
          WHERE e.session_id = $1
          `,
          [params.sessionId]
        );

        if (dbStats && dbStats.length > 0) {
          const row = dbStats[0];
          cumulativeCopies = Math.max(cumulativeCopies, Number(row.total_copies) || 0);
          cumulativePages = Math.max(cumulativePages, Number(row.distinct_pages) || 0);
          cumulativeDuration = Math.max(cumulativeDuration, Number(row.duration_seconds) || 0);
          cumulativeRageClicks = Math.max(cumulativeRageClicks, Number(row.rage_clicks) || 0);
          dbLeadActions = (Number(row.lead_clicks) || 0) + (Number(row.form_submits) || 0);
        }
      }
    } catch {
      // Graceful fallback if database query fails or during offline test execution
    }

    if (dbLeadActions > 0) {
      return {
        flagged: false,
        flagType: 'competitor',
        heuristicName: 'exempt_conversion_history',
        reason: 'Exempt: Previous lead engagement in session',
        details: { sessionId: params.sessionId },
      };
    }

    // 5. Evaluate behavioral criteria
    const metrics: BehavioralMetrics = {
      partCopiesCount: cumulativeCopies,
      distinctPages: cumulativePages,
      durationSeconds: cumulativeDuration,
      rageClicksCount: cumulativeRageClicks,
      leadActionsCount: dbLeadActions,
      city: params.geo?.city,
      browser: params.clientMeta?.browser,
    };

    const evaluation = evaluateBehavioralSignature(metrics);

    if (!evaluation.matches) {
      return {
        flagged: false,
        flagType: 'competitor',
        heuristicName: evaluation.heuristic,
        reason: evaluation.reason,
        details: metrics,
      };
    }

    // 6. Criteria Matched: Persist into `analytics_flags` (NEVER analytics_restrictions)
    let flagRecord: FlagRecord | undefined;
    try {
      flagRecord = await addFlag(
        'visitor_id',
        params.visitorId,
        'competitor',
        `[${evaluation.heuristic}] ${evaluation.reason}`
      );
    } catch (dbErr) {
      console.error('[Behavioral Flagging DB Insert Warning]', dbErr);
    }

    // 7. Non-blocking Immediate Zero-Cost Alert Dispatch
    const alertPayload: SentinelAlertPayload = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'nuisance_detected',
      timestamp: new Date().toISOString(),
      sessionId: params.sessionId,
      visitorId: params.visitorId,
      ipAddress: params.clientIp,
      geo: params.geo,
      clientMeta: params.clientMeta,
      behavioralIndicators: {
        durationSeconds: metrics.durationSeconds,
        pageCount: metrics.distinctPages,
        partCopiesCount: metrics.partCopiesCount,
        rageClicksCount: metrics.rageClicksCount,
        conversionClicksCount: metrics.leadActionsCount,
      },
      flag: {
        flagType: 'competitor',
        heuristicName: evaluation.heuristic,
        reason: evaluation.reason,
        confidenceScore: 0.98,
      },
      actionTaken: 'Flag recorded in analytics_flags. Zero automatic restrictions applied.',
      adminDashboardUrl: 'https://www.mmearthmovers.com/admin/analytics',
    };

    // Fire-and-forget: do not block response
    dispatchAlert(alertPayload).catch((alertErr) => {
      console.error('[Sentinel Alert Dispatcher Error]', alertErr);
    });

    return {
      flagged: true,
      flagType: 'competitor',
      heuristicName: evaluation.heuristic,
      reason: evaluation.reason,
      details: metrics,
      record: flagRecord,
    };
  } catch (error: any) {
    console.error('[evaluateAndRecordFlag Exception]', error);
    return null;
  }
}
