import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalSecret } from '@/lib/analytics/auth';
import { getAllRestrictedSets } from '@/lib/restrictions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!verifyInternalSecret(secret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  try {
    const { visitorIds, ips } = await getAllRestrictedSets();
    return NextResponse.json(
      {
        visitorIds: Array.from(visitorIds),
        ips: Array.from(ips),
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (err) {
    console.error('[Internal Restrictions API Error]', err);
    return NextResponse.json(
      { error: 'Failed to load internal restrictions' },
      {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }
}
