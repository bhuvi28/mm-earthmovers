import { NextRequest, NextResponse } from 'next/server';
import { getFlags, addFlag, removeFlag } from '@/lib/analytics/db';
import { isAuthorized } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const list = await getFlags();
    return NextResponse.json(
      {
        flags: list,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    );
  } catch (err: any) {
    console.error('[Flags API Error]', err);
    return NextResponse.json({ flags: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, targetType, targetValue, flagType, note, id } = body;

    if (action === 'add') {
      if (!targetValue || typeof targetValue !== 'string') {
        return NextResponse.json({ error: 'targetValue is required' }, { status: 400 });
      }
      const trimmedVal = targetValue.trim();
      const detectedType =
        targetType || (trimmedVal.includes('.') || trimmedVal.includes(':') ? 'ip' : 'visitor_id');
      const detectedFlag = flagType || 'competitor';
      const record = await addFlag(detectedType, trimmedVal, detectedFlag, note);
      return NextResponse.json({ success: true, record });
    }

    if (action === 'remove') {
      await removeFlag(id || targetValue, flagType);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Flags Update Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to update flags' }, { status: 500 });
  }
}
