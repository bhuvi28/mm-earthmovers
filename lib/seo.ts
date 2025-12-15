import { getProducts } from './products';
import { getProductUrlSlug } from './utils';

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

// Helper function to extract all part numbers from a slash-separated string
export function getAllPartNumbers(partNumber?: string): string[] {
    if (!partNumber) return [];
    return partNumber
        .split('/')
        .map((num) => num.trim())
        .filter(Boolean);
}

// Helper function to get the primary (first) part number
export function getPrimaryPartNumber(partNumber?: string): string | undefined {
    const allParts = getAllPartNumbers(partNumber);
    return allParts.length > 0 ? allParts[0] : undefined;
}

// Helper function to format part numbers for display
export function formatPartNumbersForDisplay(partNumber?: string): string {
    if (!partNumber) return '';
    const allParts = getAllPartNumbers(partNumber);
    return allParts.join(' / ');
}

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
            areaServed: ['World', 'IN', 'US', 'IT', 'CO', 'AU', 'MX', 'ID', 'MY', 'GB', 'ES'],
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
    brand?: string | string[];
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
    const productUrl = `${BUSINESS_INFO.url}/products/${categorySlug}/${getProductUrlSlug(product)}`;

    // Use primary part number for SKU, all part numbers for MPN
    const primaryPartNumber = getPrimaryPartNumber(product.part_number);
    const allPartNumbers = getAllPartNumbers(product.part_number);

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.content || `${product.title} spare part for heavy earthmoving machinery`,
        brand: {
            '@type': 'Brand',
            name: Array.isArray(product.brand) ? product.brand[0] : (product.brand || 'Generic'),
        },
        category: product.category,
        sku: primaryPartNumber || product.slug,
        mpn: allPartNumbers.length > 0 ? allPartNumbers : undefined,
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
    brand?: string | string[];
    part_number?: string;
    content: string;
}) {
    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand.join(', ') : product.brand)
        : '';
    const formattedPartNumbers = formatPartNumbersForDisplay(product.part_number);
    const allPartNumbers = getAllPartNumbers(product.part_number);

    // Title format: Part No. [numbers] - [Product] | [Brand] | MM Earthmovers
    // Or: [Product] | [Brand] | [Category] Parts | MM Earthmovers (if no part number)
    let title: string;
    if (formattedPartNumbers) {
        title = `Part No. ${formattedPartNumbers} - ${product.title}${brandText ? ` | ${brandText}` : ''} | MM Earthmovers`;
    } else {
        title = `${product.title}${brandText ? ` | ${brandText}` : ''} | ${product.category} Parts | MM Earthmovers`;
    }

    // Description format: mentions part number(s) prominently
    let description: string;
    if (formattedPartNumbers) {
        description = `Buy genuine ${product.title} (Part No. ${formattedPartNumbers})${brandText ? ` for ${brandText}` : ''} ${product.category.toLowerCase()}. Premium quality spare part for heavy earthmoving machinery. Contact MM Earthmovers Kolkata for pricing and availability.`;
    } else {
        description = product.content ||
            `Buy genuine ${product.title}${brandText ? ` for ${brandText}` : ''} ${product.category.toLowerCase()}. Premium quality spare part for heavy earthmoving machinery. Contact MM Earthmovers Kolkata for pricing and availability.`;
    }

    return {
        title: title,
        description: description,
        keywords: [
            product.title.toLowerCase(),
            ...(Array.isArray(product.brand) ? product.brand.map(b => b.toLowerCase()) : (product.brand ? [product.brand.toLowerCase()] : [])),
            product.category.toLowerCase(),
            ...allPartNumbers, // Include all individual part numbers
            'spare parts',
            'heavy equipment',
            'earthmoving machinery',
            'india',
            'global export',
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
            'Premium loader spare parts for HM, L&T, LiuGong, SDLG and more. Genuine components including gears, brakes, hydraulics, and transmission parts.',
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
