import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { withOpsMetric, flushOpsMetrics } from '@/lib/analytics/ops';
import { extractClientIp, isVisitorOrIpRestricted } from '@/lib/restrictions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface SearchProductItem {
  slug: string;
  urlSlug: string;
  title: string;
  category: string;
  brand?: string | string[];
  part_number?: string;
  image: string;
}

function apiOutcomeMeta(res?: NextResponse, err?: unknown) {
  if (err) {
    return {
      statusCode: 500,
      outcome: 'error' as const,
      errorCode: err instanceof Error ? err.name.slice(0, 64) : 'Exception',
    };
  }
  if (res) {
    return {
      statusCode: res.status,
      outcome:
        res.status >= 500
          ? ('error' as const)
          : res.status >= 400
          ? ('rejected' as const)
          : ('ok' as const),
    };
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    return await withOpsMetric(
      'api_request',
      '/api/products/search',
      async () => {
        try {
          const visitorId = req.cookies.get('mm_vid')?.value;
          const clientIp = extractClientIp(req.headers);
          if (await isVisitorOrIpRestricted(visitorId, clientIp)) {
            return NextResponse.json([], {
              headers: {
                'Cache-Control': 'no-store, max-age=0',
              },
            });
          }

          const raw = getProducts();
          const items: SearchProductItem[] = raw.map((p) => ({
            slug: p.slug,
            urlSlug: getProductUrlSlug(p),
            title: p.title,
            category: p.category,
            brand: p.brand,
            part_number: p.part_number,
            image: p.image,
          }));

          return NextResponse.json(items, {
            headers: {
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        } catch (err) {
          console.error('[Search API Error] Failed to generate search index:', err);
          return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
        }
      },
      apiOutcomeMeta
    );
  } finally {
    await flushOpsMetrics();
  }
}
