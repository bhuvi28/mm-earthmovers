/**
 * Visitor Restrictions Configuration
 * 
 * Controls access restrictions for specific visitor IDs.
 * Restricted visitors are blocked from viewing products, catalog listings,
 * and machine models, and are redirected to the main landing page and contact section.
 */

export const RESTRICTED_VISITOR_IDS: ReadonlySet<string> = new Set([
  'b1747b10-0ca4-4db3-9d58-eecc3cfe6479',
]);

/**
 * Checks whether a given visitor ID is restricted.
 */
export function isRestrictedVisitor(visitorId?: string | null): boolean {
  if (!visitorId) return false;
  return RESTRICTED_VISITOR_IDS.has(visitorId.trim().toLowerCase());
}
