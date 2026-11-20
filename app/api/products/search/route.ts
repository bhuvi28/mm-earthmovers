import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { isRestrictedVisitor } from '@/lib/restrictions';

export const dynamic = 'force-dynamic';

export interface SearchProductItem {
  slug: string;
  urlSlug: string;
  title: string;
  category: string;
  brand?: string | string[];
  part_number?: string;
  image: string;
}

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.cookies.get('mm_vid')?.value;
    if (isRestrictedVisitor(visitorId)) {
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
}
