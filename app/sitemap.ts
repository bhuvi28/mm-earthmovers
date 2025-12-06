import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/products';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.mmearthmovers.com';
    const products = getProducts();

    // Category mapping
    const categoryMap: Record<string, string> = {
        Loader: 'loader',
        Excavator: 'excavator',
        'Motor Grader': 'grader',
        Grader: 'grader',
    };

    // Homepage
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
    ];

    // Category pages
    const categories = ['loader', 'excavator', 'grader'];
    categories.forEach((category) => {
        routes.push({
            url: `${baseUrl}/products?category=${category}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        });
    });

    // Individual product pages
    products.forEach((product) => {
        const categorySlug = categoryMap[product.category] || 'loader';
        routes.push({
            url: `${baseUrl}/products/${categorySlug}/${product.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        });
    });

    return routes;
}
