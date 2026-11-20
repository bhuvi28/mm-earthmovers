import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRestrictedVisitor } from '@/lib/restrictions';

export function middleware(request: NextRequest) {
  const visitorId = request.cookies.get('mm_vid')?.value;

  if (isRestrictedVisitor(visitorId)) {
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
