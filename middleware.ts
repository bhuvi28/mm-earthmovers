import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRestrictedVisitor } from '@/lib/restrictions';

let cachedRestrictions: {
  visitorIds: Set<string>;
  ips: Set<string>;
  timestamp: number;
} | null = null;

async function getRestrictions(origin: string): Promise<{ visitorIds: Set<string>; ips: Set<string> }> {
  const now = Date.now();
  if (cachedRestrictions && now - cachedRestrictions.timestamp < 15000) {
    return cachedRestrictions;
  }

  try {
    const res = await fetch(`${origin}/api/restrictions`, {
      next: { revalidate: 15 },
    });
    if (res.ok) {
      const data = await res.json();
      cachedRestrictions = {
        visitorIds: new Set((data.visitorIds || []).map((v: string) => v.toLowerCase().trim())),
        ips: new Set((data.ips || []).map((ip: string) => ip.trim())),
        timestamp: now,
      };
      return cachedRestrictions;
    }
  } catch {}

  return (
    cachedRestrictions || {
      visitorIds: new Set(['b1747b10-0ca4-4db3-9d58-eecc3cfe6479']),
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
    (visitorId && (visitorIds.has(visitorId.trim().toLowerCase()) || isRestrictedVisitor(visitorId))) ||
    (clientIp && ips.has(clientIp.trim()));

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
