/**
 * Node.js Server-Only Visitor & IP Restrictions Helper
 *
 * Queries PostgreSQL `analytics_restrictions` with a 15s in-memory cache
 * combined with the static baseline in `lib/restrictions-static.ts`.
 * Never import this module into Edge Middleware or `'use client'` files.
 */

import { getRestrictions } from './analytics/db';
import { RESTRICTED_VISITOR_IDS, isStaticRestrictedVisitor } from './restrictions-static';

interface CachedRestrictionSets {
  visitorIds: Set<string>;
  ips: Set<string>;
  timestamp: number;
}

const CACHE_TTL_MS = 15_000;
let cachedSets: CachedRestrictionSets | null = null;

export function invalidateRestrictionsCache(): void {
  cachedSets = null;
}

export function extractClientIp(headers: Headers): string | undefined {
  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}

export async function getAllRestrictedSets(): Promise<{
  visitorIds: Set<string>;
  ips: Set<string>;
}> {
  const now = Date.now();
  if (cachedSets && now - cachedSets.timestamp < CACHE_TTL_MS) {
    return { visitorIds: cachedSets.visitorIds, ips: cachedSets.ips };
  }

  const visitorIds = new Set<string>(
    Array.from(RESTRICTED_VISITOR_IDS).map((v) => v.trim().toLowerCase())
  );
  const ips = new Set<string>();

  try {
    const records = await getRestrictions();
    for (const r of records) {
      const val = r.value?.trim().toLowerCase();
      if (!val) continue;
      if (r.type === 'ip') {
        ips.add(val);
      } else {
        visitorIds.add(val);
      }
    }
  } catch (err) {
    console.error('[Restrictions Server] Failed loading DB restrictions:', err);
    if (cachedSets) {
      return { visitorIds: cachedSets.visitorIds, ips: cachedSets.ips };
    }
  }

  cachedSets = { visitorIds, ips, timestamp: now };
  return { visitorIds, ips };
}

export async function isVisitorOrIpRestricted(
  visitorId?: string | null,
  ip?: string | null
): Promise<boolean> {
  if (isStaticRestrictedVisitor(visitorId)) {
    return true;
  }

  const normVid = visitorId?.trim().toLowerCase();
  const normIp = ip?.trim().toLowerCase();
  if (!normVid && !normIp) {
    return false;
  }

  const { visitorIds, ips } = await getAllRestrictedSets();
  if (normVid && visitorIds.has(normVid)) {
    return true;
  }
  if (normIp && ips.has(normIp)) {
    return true;
  }
  return false;
}
