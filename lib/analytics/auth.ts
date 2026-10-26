import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'mm_analytics_auth';

export function isAuthorized(req: NextRequest): boolean {
  const rawKey = process.env.ADMIN_ANALYTICS_KEY || 'mmearth@2026';
  const cleanKey = rawKey.replace(/^["']|["']$/g, '').trim();

  // 1. Check Bearer Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    if (token === cleanKey || token === rawKey) return true;
  }

  // 2. Check HTTP Cookie
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieVal) {
    const cleanCookie = cookieVal.replace(/^["']|["']$/g, '').trim();
    if (cleanCookie === cleanKey || cleanCookie === rawKey) return true;
  }

  // 3. Localhost or query parameter fallback
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get('key')?.replace(/^["']|["']$/g, '').trim();
    if (keyParam && (keyParam === cleanKey || keyParam === rawKey)) {
      return true;
    }
  }

  return false;
}
