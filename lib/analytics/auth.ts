import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'mm_analytics_auth';

export function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_ANALYTICS_KEY || 'mmearth@2026';

  // 1. Check Bearer Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === adminKey) return true;
  }

  // 2. Check HTTP Cookie
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieVal && cookieVal === adminKey) {
    return true;
  }

  // 3. Optional localhost fallback for local testing
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const url = new URL(req.url);
    if (url.searchParams.get('key') === adminKey) {
      return true;
    }
  }

  return false;
}
