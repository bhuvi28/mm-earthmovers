import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'mm_analytics_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function cleanEnvSecret(raw?: string): string {
  return (raw || '').replace(/^["']|["']$/g, '').trim();
}

export function getAdminKey(): string | null {
  const configured = cleanEnvSecret(process.env.ADMIN_ANALYTICS_KEY);
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return 'mmearth@2026';
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function timingSafeEqualSecret(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function verifyAdminKey(input?: string | null): boolean {
  const adminKey = getAdminKey();
  const cleanInput = cleanEnvSecret(input || '');
  if (!adminKey || !cleanInput) {
    return false;
  }
  return timingSafeEqualSecret(cleanInput, adminKey);
}

export function createSignedSessionToken(): string | null {
  const adminKey = getAdminKey();
  if (!adminKey) {
    return null;
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHmac('sha256', adminKey).update(`${exp}.${nonce}`).digest('hex');
  return `${exp}.${nonce}.${sig}`;
}

export function verifySignedSessionToken(token?: string | null): boolean {
  const adminKey = getAdminKey();
  const clean = cleanEnvSecret(token || '');
  if (!adminKey || !clean) {
    return false;
  }

  const parts = clean.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [expStr, nonce, sig] = parts;
  if (!/^\d+$/.test(expStr) || !/^[a-f0-9]+$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(sig)) {
    return false;
  }

  const exp = Number(expStr);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSig = crypto.createHmac('sha256', adminKey).update(`${expStr}.${nonce}`).digest('hex');
  return timingSafeEqualUtf8(sig.toLowerCase(), expectedSig);
}

export function getInternalApiSecret(): string | null {
  const explicit = cleanEnvSecret(process.env.INTERNAL_API_SECRET);
  if (explicit) {
    return explicit;
  }
  const adminKey = getAdminKey();
  if (!adminKey) {
    return null;
  }
  return crypto.createHmac('sha256', adminKey).update('mm-internal').digest('hex');
}

export function verifyInternalSecret(provided?: string | null): boolean {
  const expected = getInternalApiSecret();
  const cleanProvided = cleanEnvSecret(provided || '');
  if (!expected || !cleanProvided) {
    return false;
  }
  return timingSafeEqualUtf8(cleanProvided, expected);
}

export function isAuthorized(req: NextRequest): boolean {
  // 1. Check Bearer Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = cleanEnvSecret(authHeader.replace(/^Bearer\s+/i, ''));
    if (token && (verifyAdminKey(token) || verifySignedSessionToken(token))) {
      return true;
    }
  }

  // 2. Check HMAC-signed HTTP Cookie
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieVal && verifySignedSessionToken(cookieVal)) {
    return true;
  }

  // 3. Localhost query parameter fallback
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get('key');
    if (keyParam && verifyAdminKey(keyParam)) {
      return true;
    }
  }

  return false;
}
