import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RESTRICTED_VISITOR_IDS, isStaticRestrictedVisitor } from '@/lib/restrictions-static';

let cachedRestrictions: {
  visitorIds: Set<string>;
  ips: Set<string>;
  timestamp: number;
} | null = null;

function cleanSecret(raw?: string): string {
  return (raw || '').replace(/^["']|["']$/g, '').trim();
}

async function deriveEdgeInternalSecret(): Promise<string | null> {
  const explicit = cleanSecret(process.env.INTERNAL_API_SECRET);
  if (explicit) {
    return explicit;
  }

  const configuredAdminKey = cleanSecret(process.env.ADMIN_ANALYTICS_KEY);
  const signingKey =
    configuredAdminKey || (process.env.NODE_ENV !== 'production' ? 'mmearth@2026' : '');
  if (!signingKey || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('mm-internal'));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getRestrictions(origin: string): Promise<{ visitorIds: Set<string>; ips: Set<string> }> {
  const now = Date.now();
  if (cachedRestrictions && now - cachedRestrictions.timestamp < 15000) {
    return cachedRestrictions;
  }

  try {
    const internalSecret = await deriveEdgeInternalSecret();
    if (internalSecret) {
      const res = await fetch(`${origin}/api/internal/restrictions`, {
        headers: {
          'x-internal-secret': internalSecret,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        cachedRestrictions = {
          visitorIds: new Set((data.visitorIds || []).map((v: string) => v.toLowerCase().trim())),
          ips: new Set((data.ips || []).map((ip: string) => ip.toLowerCase().trim())),
          timestamp: now,
        };
        return cachedRestrictions;
      }
    }
  } catch {}

  return (
    cachedRestrictions || {
      visitorIds: new Set(Array.from(RESTRICTED_VISITOR_IDS)),
      ips: new Set(),
      timestamp: now,
    }
  );
}

export async function middleware(request: NextRequest) {
  const visitorId = request.cookies.get('mm_vid')?.value;
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip');

  const { visitorIds, ips } = await getRestrictions(request.nextUrl.origin);

  const isRestricted =
    (visitorId && (visitorIds.has(visitorId.trim().toLowerCase()) || isStaticRestrictedVisitor(visitorId))) ||
    (clientIp && ips.has(clientIp.trim().toLowerCase()));

  if (isRestricted) {
    const { pathname } = request.nextUrl;

    // Block product pages and machine models, redirect to the contact section on the main page
    if (pathname.startsWith('/products') || pathname.startsWith('/models')) {
      const redirectUrl = new URL('/#contact', request.url);
      return NextResponse.redirect(redirectUrl, 307);
    }

    // Block product catalog search API
    if (pathname.startsWith('/api/products')) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/products',
    '/products/:path*',
    '/models',
    '/models/:path*',
    '/api/products/:path*',
  ],
};
