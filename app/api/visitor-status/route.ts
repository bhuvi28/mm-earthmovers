import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp, isVisitorOrIpRestricted } from '@/lib/restrictions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.cookies.get('mm_vid')?.value || req.nextUrl.searchParams.get('vid');
    const clientIp = extractClientIp(req.headers);
    const restricted = await isVisitorOrIpRestricted(visitorId, clientIp);

    return NextResponse.json(
      { restricted },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (err) {
    console.error('[Visitor Status API Error]', err);
    return NextResponse.json(
      { restricted: false },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }
}
