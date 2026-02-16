import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';

const INDEXNOW_KEY = '7c2e9464632e4bbd9564a710309fe0cf';
const SITE_URL = 'https://www.mmearthmovers.com';

// Category mapping
const categoryMap: Record<string, string> = {
    Loader: 'loader',
    Excavator: 'excavator',
    'Motor Grader': 'grader',
    Grader: 'grader',
};

/**
 * POST /api/indexnow
 * 
 * Submit URLs to IndexNow (Bing, Yandex, etc.) for instant indexing.
 * 
 * Body options:
 *   { "urls": ["https://..."] }           — Submit specific URLs
 *   { "all": true }                       — Submit all pages (home + products + category pages)
 * 
 * Auth: Requires ?secret=<INDEXNOW_KEY> query param to prevent abuse.
 */
export async function POST(request: NextRequest) {
    // Simple auth check
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== INDEXNOW_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        let urlList: string[] = [];

        if (body.all) {
            // Submit all pages
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

        // IndexNow API call
        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: 'www.mmearthmovers.com',
                key: INDEXNOW_KEY,
                keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
                urlList: urlList,
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
        return NextResponse.json(
            { error: 'Failed to submit', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/indexnow?secret=<key>&all=true
 * Quick way to trigger submission from browser.
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== INDEXNOW_KEY) {
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
            urlList: urlList,
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
    ];

    // Add all product pages
    try {
        const products = getProducts();
        products.forEach((product) => {
            const catSlug = categoryMap[product.category] || 'loader';
            const productSlug = getProductUrlSlug(product);
            urls.push(`${SITE_URL}/products/${catSlug}/${productSlug}`);
        });
    } catch {
        // If products can't be loaded at build time, just submit static pages
    }

    return urls;
}
