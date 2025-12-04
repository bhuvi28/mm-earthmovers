import { getProducts } from './products';

// Business information
export const BUSINESS_INFO = {
    name: 'MM Earthmovers',
    legalName: 'MM Earthmovers',
    phone: '+918334887009',
    email: 'hm.mmearthmovers@gmail.com', // Update if you have a business email
    address: {
        streetAddress: '1, Metcalf Lane, Esplanade',
        addressLocality: 'Kolkata',
        addressRegion: 'West Bengal',
        postalCode: '700072', // Add if available
        addressCountry: 'IN',
    },
    hours: 'Mo-Sa 10:00-20:00',
    url: 'https://www.mmearthmovers.com',
    logo: 'https://www.mmearthmovers.com/logo.png',
    image: 'https://www.mmearthmovers.com/og-image.png',
};

// Generate Organization Schema
export function generateOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: BUSINESS_INFO.name,
        legalName: BUSINESS_INFO.legalName,
        url: BUSINESS_INFO.url,
        logo: BUSINESS_INFO.logo,
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: BUSINESS_INFO.phone,
            contactType: 'Customer Service',
            areaServed: 'IN',
            availableLanguage: ['en', 'hi'],
        },
        address: {
            '@type': 'PostalAddress',
            ...BUSINESS_INFO.address,
        },
    };
}

// Generate LocalBusiness Schema
export function generateLocalBusinessSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'HardwareStore',
        name: BUSINESS_INFO.name,
        image: BUSINESS_INFO.image,
        telephone: BUSINESS_INFO.phone,
        address: {
            '@type': 'PostalAddress',
            ...BUSINESS_INFO.address,
        },
        openingHours: BUSINESS_INFO.hours,
        url: BUSINESS_INFO.url,
        priceRange: 'Contact for pricing',
        description:
            'Premium supplier of heavy earthmoving machinery spare parts including loader parts, excavator parts, and motor grader components for major brands like HM, BEML, L&T, XCMG, and more.',
    };
}

// Generate Website Schema with SearchAction
export function generateWebsiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BUSINESS_INFO.name,
        url: BUSINESS_INFO.url,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BUSINESS_INFO.url}/products?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

// Generate Product Schema
export function generateProductSchema(product: {
    title: string;
    category: string;
    brand?: string;
    part_number?: string;
    image: string;
    content: string;
    slug: string;
}) {
    const categoryMap: Record<string, string> = {
        Loader: 'loader',
        Excavator: 'excavator',
        'Motor Grader': 'grader',
        Grader: 'grader',
    };

    const categorySlug = categoryMap[product.category] || 'loader';
    const productUrl = `${BUSINESS_INFO.url}/products/${categorySlug}/${product.slug}`;

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.content || `${product.title} spare part for heavy earthmoving machinery`,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Generic',
        },
        category: product.category,
        sku: product.part_number || product.slug,
        mpn: product.part_number,
        image: product.image.startsWith('http')
            ? product.image
            : `${BUSINESS_INFO.url}${product.image}`,
        url: productUrl,
        offers: {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            price: '0',
            priceCurrency: 'INR',
            seller: {
                '@type': 'Organization',
                name: BUSINESS_INFO.name,
            },
            priceSpecification: {
                '@type': 'PriceSpecification',
                price: 'Contact for pricing',
            },
        },
    };
}

// Generate BreadcrumbList Schema
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// Generate metadata for product pages
export function generateProductMetadata(product: {
    title: string;
    category: string;
    brand?: string;
    part_number?: string;
    content: string;
}) {
    const brandText = product.brand ? `${product.brand} ` : '';
    const partText = product.part_number ? ` (Part No: ${product.part_number})` : '';

    return {
        title: `${brandText}${product.title}${partText} - ${product.category} Parts | MM Earthmovers`,
        description:
            product.content ||
            `Buy ${brandText}${product.title} spare parts for ${product.category.toLowerCase()}. Genuine and aftermarket heavy equipment parts. Contact MM Earthmovers for pricing and availability.`,
        keywords: [
            product.title.toLowerCase(),
            product.brand?.toLowerCase(),
            product.category.toLowerCase(),
            product.part_number,
            'spare parts',
            'heavy equipment',
            'earthmoving machinery',
            'india',
            'kolkata',
        ]
            .filter(Boolean)
            .join(', '),
    };
}

// Generate metadata for category pages
export function generateCategoryMetadata(category: string) {
    const categoryTitles: Record<string, string> = {
        loader: 'Loader Spare Parts',
        excavator: 'Excavator Spare Parts',
        grader: 'Motor Grader Spare Parts',
    };

    const categoryDescriptions: Record<string, string> = {
        loader:
            'Premium loader spare parts for HM, L&T, LiuGong, SDLG and more. Genuine and aftermarket components including gears, brakes, hydraulics, and transmission parts.',
        excavator:
            'Quality excavator spare parts for Komatsu, Hyundai, Tata Hitachi, Volvo and other major brands. Wide range of attachments, wear items, and replacement parts.',
        grader:
            'Motor grader spare parts for BEML, CAT and other brands. Durable components for blades, hydraulics, transmissions and more.',
    };

    const title = categoryTitles[category] || 'Heavy Equipment Parts';
    const description = categoryDescriptions[category] || 'Quality spare parts for heavy earthmoving machinery';

    return {
        title: `${title} - Contact for pricing | MM Earthmovers Kolkata`,
        description: description,
        keywords: `${category} parts, ${category} spare parts, heavy equipment parts, earthmoving machinery, ${category} components, kolkata, india`,
    };
}
