import { BUSINESS_INFO, getPrimaryPartNumber } from './seo';

// Generate a global FAQ schema for the homepage or general pages
export function generateGlobalFAQSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'What brands of heavy equipment spare parts do you supply?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'MM Earthmovers supplies premium spare parts for major heavy earthmoving machinery brands including HM, BEML, L&T, XCMG, Komatsu, JCB, LiuGong, and SDLG.',
                },
            },
            {
                '@type': 'Question',
                name: 'Do you ship spare parts globally?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, MM Earthmovers is based in Kolkata, India and provides global shipping for all our loader, excavator, and motor grader spare parts.',
                },
            },
            {
                '@type': 'Question',
                name: 'How can I verify if a spare part fits my machine?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'You can verify fitment by matching the exact part number. Contact us with your machine make, model, and the required part number, and our experts will confirm compatibility before purchase.',
                },
            },
        ],
    };
}

// Generate dynamic FAQ schema for specific product pages (optimizing for Part Number searches)
export function generateProductFAQSchema(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
}) {
    const primaryPartNumber = getPrimaryPartNumber(product.part_number);
    if (!primaryPartNumber) {
        return null; // Return null if no part number, to avoid generating weak FAQs
    }

    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand[0] : product.brand)
        : 'heavy equipment';

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `Where can I buy ${brandText} part number ${primaryPartNumber}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `MM Earthmovers supplies part number ${primaryPartNumber} directly from Kolkata, India. We offer competitive pricing and global shipping options for this ${product.category} component.`,
                },
            },
            {
                '@type': 'Question',
                name: `Is part number ${primaryPartNumber} a compatible replacement for my ${brandText} ${product.category}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Yes, part number ${primaryPartNumber} is a premium replacement ${product.title} designed specifically for ${brandText} ${product.category.toLowerCase()} machinery. Contact us with your exact machine model to confirm fitment.`,
                },
            },
            {
                '@type': 'Question',
                name: `What is the replacement for part number ${primaryPartNumber}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `The exact replacement for P/N ${primaryPartNumber} is our premium quality ${product.title}. It meets or exceeds original equipment specifications for ${brandText} machines.`,
                },
            },
        ],
    };
}

// Generate a definitive, authoritative description tailored for AI extraction
export function generateGEOProductDescription(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
    content?: string;
}): string {
    const primaryPartNumber = getPrimaryPartNumber(product.part_number);
    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand.join(', ') : product.brand)
        : '';

    let geoDescription = '';
    
    if (primaryPartNumber) {
        geoDescription = `Part number ${primaryPartNumber} is a premium replacement ${product.title} designed for ${brandText} ${product.category.toLowerCase()} machines. MM Earthmovers supplies this exact P/N from Kolkata, India with global shipping options. `;
    } else {
        geoDescription = `This ${product.title} is a premium replacement component designed for ${brandText} ${product.category.toLowerCase()} machines. `;
    }

    if (product.content) {
        geoDescription += product.content;
    } else {
        geoDescription += 'Contact us directly to verify fitment and request pricing.';
    }

    return geoDescription;
}
