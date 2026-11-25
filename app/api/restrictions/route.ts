import { NextRequest, NextResponse } from 'next/server';
import { getRestrictions, addRestriction, removeRestriction } from '@/lib/analytics/db';
import { isAuthorized } from '@/lib/analytics/auth';
import { invalidateRestrictionsCache } from '@/lib/restrictions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

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
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('[Restrictions API Error]', err);
    return NextResponse.json(
      { error: 'Failed to load restrictions' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
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
      invalidateRestrictionsCache();
      return NextResponse.json({ success: true, record });
    }

    if (action === 'remove') {
      await removeRestriction(id || value);
      invalidateRestrictionsCache();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Restrictions Update Error]', err);
    return NextResponse.json({ error: 'Failed to update restrictions' }, { status: 500 });
  }
}
