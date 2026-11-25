import { NextRequest, NextResponse } from 'next/server';
import { ingestTelemetryRequest } from '@/lib/analytics/ingestHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  return ingestTelemetryRequest(req, bodyText);
}
