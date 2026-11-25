import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { getAllMachineSlugs } from '@/lib/machines';
import { isAuthorized } from '@/lib/analytics/auth';

export const runtime = 'nodejs';

const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '7c2e9464632e4bbd9564a710309fe0cf')
  .replace(/^["']|["']$/g, '')
  .trim();
const SITE_URL = 'https://www.mmearthmovers.com';

const categoryMap: Record<string, string> = {
  Loader: 'loader',
  Excavator: 'excavator',
  'Motor Grader': 'grader',
  Grader: 'grader',
};

function isIndexNowAuthorized(request: NextRequest): boolean {
  if (isAuthorized(request)) {
    return true;
  }
  const secret = (request.nextUrl.searchParams.get('secret') || '').trim();
  if (!secret || !INDEXNOW_KEY) {
    return false;
  }
  const a = Buffer.from(secret, 'utf8');
  const b = Buffer.from(INDEXNOW_KEY, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/indexnow
 *
 * Submit URLs to IndexNow (Bing, Yandex, etc.) for instant indexing.
 */
export async function POST(request: NextRequest) {
  if (!isIndexNowAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let urlList: string[] = [];

    if (body.all) {
      urlList = getAllUrls();
    } else if (body.urls && Array.isArray(body.urls)) {
      urlList = body.urls;
    } else {
      return NextResponse.json(
        { error: 'Provide { "urls": [...] } or { "all": true }' },
        { status: 400 }
      );
    }

    if (urlList.length === 0) {
      return NextResponse.json({ error: 'No URLs to submit' }, { status: 400 });
    }

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'www.mmearthmovers.com',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    const status = response.status;
    const statusText = response.statusText;

    return NextResponse.json({
      success: status === 200 || status === 202,
      submitted: urlList.length,
      indexNowStatus: status,
      indexNowStatusText: statusText,
      urls: urlList,
    });
  } catch (error) {
    console.error('[IndexNow Error]', error);
    return NextResponse.json(
      { error: 'Failed to submit' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/indexnow?secret=<key>&all=true
 */
export async function GET(request: NextRequest) {
  if (!isIndexNowAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = request.nextUrl.searchParams.get('all');
  const urlList = all === 'true' ? getAllUrls() : [SITE_URL];

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'www.mmearthmovers.com',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  return NextResponse.json({
    success: response.status === 200 || response.status === 202,
    submitted: urlList.length,
    indexNowStatus: response.status,
    urls: urlList,
  });
}

function getAllUrls(): string[] {
  const urls: string[] = [
    SITE_URL,
    `${SITE_URL}/products`,
    `${SITE_URL}/products?category=loader`,
    `${SITE_URL}/products?category=excavator`,
    `${SITE_URL}/products?category=grader`,
    `${SITE_URL}/models`,
  ];

  try {
    const machineSlugs = getAllMachineSlugs();
    machineSlugs.forEach((slug) => {
      urls.push(`${SITE_URL}/models/${slug}`);
    });
  } catch {
    // Fallback
  }

  try {
    const products = getProducts();
    products.forEach((product) => {
      const catSlug = categoryMap[product.category] || 'loader';
      const productSlug = getProductUrlSlug(product);
      urls.push(`${SITE_URL}/products/${catSlug}/${productSlug}`);
    });
  } catch {
    // If products can't be loaded at build time, submit static pages only
  }

  return urls;
}
