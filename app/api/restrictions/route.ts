import { NextRequest, NextResponse } from 'next/server';
import { getRestrictions, addRestriction, removeRestriction } from '@/lib/analytics/db';
import { isAuthorized } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const list = await getRestrictions();
    const visitorIds = list
      .filter((r) => r.type === 'visitor_id')
      .map((r) => r.value.toLowerCase().trim());
    const ips = list
      .filter((r) => r.type === 'ip')
      .map((r) => r.value.trim());

    return NextResponse.json(
      {
        visitorIds,
        ips,
        records: list,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('[Restrictions API Error]', err);
    return NextResponse.json(
      {
        visitorIds: ['b1747b10-0ca4-4db3-9d58-eecc3cfe6479'],
        ips: [],
        records: [],
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, type, value, note, id } = body;

    if (action === 'add') {
      if (!value || typeof value !== 'string') {
        return NextResponse.json({ error: 'Value is required' }, { status: 400 });
      }
      const trimmed = value.trim();
      const targetType = type || (trimmed.includes('.') || trimmed.includes(':') ? 'ip' : 'visitor_id');
      const record = await addRestriction(targetType, trimmed, note);
      return NextResponse.json({ success: true, record });
    }

    if (action === 'remove') {
      await removeRestriction(id || value);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update restrictions' }, { status: 500 });
  }
}
