import { NextRequest, NextResponse } from 'next/server';
import { getFlags, addFlag, removeFlag } from '@/lib/analytics/db';
import { isAuthorized } from '@/lib/analytics/auth';
import { recordAuditLog } from '@/lib/analytics/audit';
import { extractClientIp } from '@/lib/restrictions-server';

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
    const list = await getFlags();
    return NextResponse.json(
      {
        flags: list,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('[Flags API Error]', err);
    return NextResponse.json(
      { error: 'Failed to load flags' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientIp = extractClientIp(req.headers);

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
      await recordAuditLog({
        actorIp: clientIp,
        action: 'add_flag',
        targetType: detectedType,
        targetValue: trimmedVal,
        success: true,
        metadata: { via: '/api/flags', flagType: detectedFlag, note: note || null, id: record?.id ?? null },
      });
      return NextResponse.json({ success: true, record });
    }

    if (action === 'remove') {
      await removeFlag(id || targetValue, flagType);
      await recordAuditLog({
        actorIp: clientIp,
        action: 'remove_flag',
        targetType: id ? 'id' : 'target_value',
        targetValue: String(id || targetValue || ''),
        success: true,
        metadata: { via: '/api/flags', flagType: flagType || null },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Flags Update Error]', err);
    return NextResponse.json({ error: 'Failed to update flags' }, { status: 500 });
  }
}
