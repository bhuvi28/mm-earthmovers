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
    image: 'https://www.mmearthmovers.com/og-image.jpg',
};

// Delimiter regex to split multiple part numbers (supports ' / ', ',', '|', or spaced dashes ' - ')
const PART_DELIMITER_REGEX = /\s*,\s*|\s*\|\s*|\s+\/\s*|\s*\/\s+|\s+-\s+/;

/**
 * Sanitizes raw CMS part number input, defends against admin typos,
 * normalizes delimiters, and auto-corrects misplaced hyphens.
 */
export function sanitizeCMSPartNumberInput(rawInput?: string): string[] {
    if (!rawInput) return [];
    const rawParts = String(rawInput)
        .split(PART_DELIMITER_REGEX)
        .map((s) => s.trim())
        .filter(Boolean);

    return rawParts.map((p) => {
        // Strip duplicate hyphens, accidental surrounding slashes/hyphens, extra spaces
        const clean = p.replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/^[-/]+|[-/]+$/g, '').trim();
        const digitsOnly = clean.replace(/[^0-9]/g, '');
        const hasAlpha = /[a-zA-Z]/.test(clean);

        // Auto-correct misplaced hyphens in 7-digit numbers (CAT / HM standard)
        if (!hasAlpha && digitsOnly.length === 7) {
            return digitsOnly;
        }

        // Auto-correct misplaced hyphens in 8-digit numbers starting with 81 (HM / LiuGong standard)
        if (!hasAlpha && digitsOnly.length === 8 && digitsOnly.startsWith('81')) {
            return digitsOnly;
        }

        return clean;
    });
}

/**
 * Conservative OEM Hyphenation: Only apply when 100% verified against standard manufacturer rules.
 * Never guesses or injects fake hyphens into codes that don't use them (e.g. WC00271, 46C0253).
 */
export function getOEMHyphenatedPart(partNumber: string): string {
    const stripped = partNumber.replace(/[^a-zA-Z0-9]/g, '');

    // 1. 7-digit numeric: Standard CAT / HM 3-4 format (123-4567)
    if (/^\d{7}$/.test(stripped)) {
        return stripped.slice(0, 3) + '-' + stripped.slice(3);
    }
    // 2. 6-digit numeric: Standard 3-3 format (123-456)
    if (/^\d{6}$/.test(stripped)) {
        return stripped.slice(0, 3) + '-' + stripped.slice(3);
    }
    // 3. 8-digit numeric starting with 81 (HM / LiuGong 4-4 format: 8100-1599)
    if (/^81\d{6}$/.test(stripped)) {
        return stripped.slice(0, 4) + '-' + stripped.slice(4);
    }
    // 4. JCB prefix: 332/L2841 -> 332-L2841
    if (partNumber.includes('/')) {
        return partNumber.replace(/\//g, '-');
    }
    // 5. Already has a hyphen: respect it
    if (partNumber.includes('-')) {
        return partNumber;
    }

    // Otherwise: Leave code untouched (e.g. WC00271, 46C0253, 275100138)
    return partNumber;
}

// Extract all cleaned part numbers from a product string
export function getAllPartNumbers(partNumber?: string): string[] {
    return sanitizeCMSPartNumberInput(partNumber);
}

// Get the primary (first) part number in clean format
export function getPrimaryPartNumber(partNumber?: string): string | undefined {
    const allParts = getAllPartNumbers(partNumber);
    return allParts.length > 0 ? allParts[0] : undefined;
}

/**
 * Generates all search variations (continuous, hyphenated, space-separated)
 * for search indexing, Schema.org MPN, and typo tolerance.
 */
export function getPartNumberVariations(partNumber?: string): string[] {
    if (!partNumber) return [];
    const parts = getAllPartNumbers(partNumber);
    const variations = new Set<string>();

    for (const p of parts) {
        variations.add(p);
        const stripped = p.replace(/[^a-zA-Z0-9]/g, '');
        if (stripped) variations.add(stripped);

        const oem = getOEMHyphenatedPart(p);
        if (oem) variations.add(oem);

        // Add spaced notation for 7-digit parts (e.g. "522 2835")
        if (/^\d{7}$/.test(stripped)) {
            variations.add(`${stripped.slice(0, 3)} ${stripped.slice(3)}`);
        } else if (/^81\d{6}$/.test(stripped)) {
            variations.add(`${stripped.slice(0, 4)} ${stripped.slice(4)}`);
        }
    }

    return Array.from(variations).filter(Boolean);
}

// Format part numbers for display on UI badges and cards
export function formatPartNumbersForDisplay(partNumber?: string): string {
    if (!partNumber) return '';
    const parts = getAllPartNumbers(partNumber);
    if (parts.length === 0) return '';

    if (parts.length === 1) {
        const p = parts[0];
        const hyp = getOEMHyphenatedPart(p);
        return hyp !== p ? `${p} (${hyp})` : p;
    }

    if (parts.length === 2) {
        const p1 = parts[0];
        const p2 = parts[1];
        const hyp1 = getOEMHyphenatedPart(p1);
        const hyp2 = getOEMHyphenatedPart(p2);
        const p1Str = hyp1 !== p1 ? `${p1} (${hyp1})` : p1;
        const p2Str = hyp2 !== p2 ? `${p2} (${hyp2})` : p2;
        return `${p1Str} / ${p2Str}`;
    }

    return parts.join(' / ');
}

/**
 * Generates SEO-optimized, length-budgeted title tag strictly under 58 characters.
 * Preserves original unhyphenated part number at index 0 to protect existing rankings,
 * while appending hyphenated notations to capture new queries.
 */
export function generateSEOTitle(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
}): string {
    const parts = getAllPartNumbers(product.part_number);
    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand.join(', ') : product.brand)
        : '';

    if (parts.length === 0) {
        return `${product.title}${brandText ? ` | ${brandText}` : ''} | ${product.category} Parts`;
    }

    if (parts.length === 1) {
        const p = parts[0];
        const hyp = getOEMHyphenatedPart(p);
        if (hyp !== p) {
            const dualTitle = `${p} / ${hyp} - ${product.title}`;
            if (dualTitle.length <= 58) return dualTitle;
        }
        return `${p} - ${product.title}`;
    }

    if (parts.length === 2) {
        const p1 = parts[0];
        const p2 = parts[1];
        const hyp1 = getOEMHyphenatedPart(p1);
        const hyp2 = getOEMHyphenatedPart(p2);
        const p1Disp = hyp1 !== p1 ? `${p1} (${hyp1})` : p1;
        const p2Disp = hyp2 !== p2 ? `${p2} (${hyp2})` : p2;

        const fullDual = `${p1Disp} / ${p2Disp} - ${product.title}`;
        if (fullDual.length <= 58) return fullDual;

        const p1Only = `${p1Disp} / ${p2} - ${product.title}`;
        if (p1Only.length <= 58) return p1Only;

        return `${p1} / ${p2} - ${product.title}`;
    }

    // 3 or more parts: keep original parts to protect character limit
    const multiTitle = `${parts.join(' / ')} - ${product.title}`;
    if (multiTitle.length <= 58) return multiTitle;

    // Safety fallback if product title is extraordinarily long
    return `${parts.slice(0, 2).join(' / ')} - ${product.title}`.slice(0, 58);
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

// Generate a rich product description from structured data (used in JSON-LD and meta)
export function generateProductDescription(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
}): string {
    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand.join(', ') : product.brand)
        : '';
    const allParts = getAllPartNumbers(product.part_number);
    const partText = allParts.length > 0 ? ` (Part No. ${allParts.join(' / ')})` : '';

    let desc = `Quality replacement ${product.title}${partText}`;
    if (brandText) {
        desc += ` for ${brandText} ${product.category.toLowerCase()} machines`;
    }
    desc += `. ${product.category} spare part available from MM Earthmovers, Kolkata. Contact for pricing and availability. India and worldwide shipping.`;
    return desc;
}

// Generate Product Schema
export function generateProductSchema(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
    image?: string;
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

    // Use primary part number for SKU, all variations for MPN and alternateName
    const primaryPartNumber = getPrimaryPartNumber(product.part_number);
    const allVariations = getPartNumberVariations(product.part_number);

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.content || generateProductDescription(product),
        brand: {
            '@type': 'Brand',
            name: Array.isArray(product.brand) ? product.brand[0] : (product.brand || 'Generic'),
        },
        category: product.category,
        sku: primaryPartNumber ? primaryPartNumber.replace(/[^a-zA-Z0-9]/g, '') : product.slug,
        mpn: allVariations.length > 0 ? allVariations : undefined,
        alternateName: allVariations.length > 0 ? allVariations : undefined,
        itemCondition: 'https://schema.org/NewCondition',
        image: product.image
            ? (product.image.startsWith('http') ? product.image : `${BUSINESS_INFO.url}${product.image}`)
            : BUSINESS_INFO.image,
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
            priceValidUntil: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],

            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
            },
            shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingDestination: {
                    '@type': 'DefinedRegion',
                    addressCountry: ['IN', 'US', 'GB', 'DE', 'FR', 'IT', 'AU', 'CA', 'JP', 'CN'],
                },
                deliveryTime: {
                    '@type': 'ShippingDeliveryTime',
                    handlingTime: {
                        '@type': 'QuantitativeValue',
                        minValue: 0,
                        maxValue: 2,
                        unitCode: 'd',
                    },
                    transitTime: {
                        '@type': 'QuantitativeValue',
                        minValue: 3,
                        maxValue: 14,
                        unitCode: 'd',
                    },
                },
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
    const allParts = getAllPartNumbers(product.part_number);
    const oemParts = allParts.map(getOEMHyphenatedPart);
    const allVariations = getPartNumberVariations(product.part_number);

    // Title format: strict length-budgeted title preserving original at index 0
    const title = generateSEOTitle(product);

    // Description format: mentions both unhyphenated and OEM hyphenated part numbers
    let description: string;
    if (allParts.length > 0) {
        const dualNotations = allParts.map((p, i) => {
            const oem = oemParts[i];
            return oem !== p ? `${p} / ${oem}` : p;
        }).join(', ');
        description = `Buy quality replacement ${product.title} (Part No. ${dualNotations})${brandText ? ` for ${brandText}` : ''} ${product.category.toLowerCase()}. Premium quality spare part for heavy earthmoving machinery. Contact MM Earthmovers Kolkata for pricing and availability.`;
    } else {
        description = product.content ||
            `Buy quality replacement ${product.title}${brandText ? ` for ${brandText}` : ''} ${product.category.toLowerCase()}. Premium quality spare part for heavy earthmoving machinery. Contact MM Earthmovers Kolkata for pricing and availability.`;
    }

    return {
        title: title,
        description: description,
        keywords: [
            product.title.toLowerCase(),
            ...(Array.isArray(product.brand) ? product.brand.map(b => b.toLowerCase()) : (product.brand ? [product.brand.toLowerCase()] : [])),
            product.category.toLowerCase(),
            ...allVariations, // Include all variations (continuous, hyphenated, space-separated)
            'spare parts',
            'heavy equipment',
            'earthmoving machinery',
            'india',
            'global export',
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
            'Premium loader spare parts for HM, L&T, LiuGong, SDLG and more. Quality replacement components including gears, brakes, hydraulics, and transmission parts.',
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
