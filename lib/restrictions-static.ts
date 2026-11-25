/**
 * Edge-Safe & Client-Safe Visitor Restrictions Helper
 *
 * Must NEVER import `pg`, Node `crypto`, or database modules so it can run safely
 * in Next.js Edge Middleware and browser client components.
 */

import { RESTRICTED_VISITOR_IDS, isRestrictedVisitor } from './restrictions';

export { RESTRICTED_VISITOR_IDS, isRestrictedVisitor };

export function isStaticRestrictedVisitor(visitorId?: string | null): boolean {
  return isRestrictedVisitor(visitorId);
}

const VISITOR_STATUS_CACHE_KEY = 'mm_visitor_status_v1';
const VISITOR_STATUS_TTL_MS = 60_000;

export async function checkClientRestrictionStatus(visitorId?: string | null): Promise<boolean> {
  if (isStaticRestrictedVisitor(visitorId)) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedVid = visitorId?.trim().toLowerCase() || '';

  try {
    const rawCached = sessionStorage.getItem(VISITOR_STATUS_CACHE_KEY);
    if (rawCached) {
      const parsed = JSON.parse(rawCached) as { restricted?: boolean; ts?: number; vid?: string };
      if (
        typeof parsed.restricted === 'boolean' &&
        typeof parsed.ts === 'number' &&
        Date.now() - parsed.ts < VISITOR_STATUS_TTL_MS &&
        (parsed.vid || '') === normalizedVid
      ) {
        return parsed.restricted;
      }
    }
  } catch {
    // Ignore sessionStorage errors
  }

  try {
    const queryStr = normalizedVid ? `?vid=${encodeURIComponent(normalizedVid)}` : '';
    const res = await fetch(`/api/visitor-status${queryStr}`, { cache: 'no-store' });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    const restricted = Boolean(data?.restricted);
    try {
      sessionStorage.setItem(
        VISITOR_STATUS_CACHE_KEY,
        JSON.stringify({ restricted, ts: Date.now(), vid: normalizedVid })
      );
    } catch {
      // Ignore storage quota errors
    }
    return restricted;
  } catch {
    return false;
  }
}
