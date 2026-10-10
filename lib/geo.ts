import { BUSINESS_INFO, getOEMHyphenatedPart, getAllPartNumbers } from './seo';

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
    const allParts = getAllPartNumbers(product.part_number);
    if (allParts.length === 0) {
        return null; // Return null if no part number, to avoid generating weak FAQs
    }

    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand[0] : product.brand)
        : 'heavy equipment';

    if (allParts.length === 1) {
        const primaryPartNumber = allParts[0];
        const oemPrimary = getOEMHyphenatedPart(primaryPartNumber);
        const shortDual = oemPrimary !== primaryPartNumber
            ? `${primaryPartNumber} / ${oemPrimary}`
            : primaryPartNumber;
        const dualDisplay = oemPrimary !== primaryPartNumber
            ? `${primaryPartNumber} (also referenced as ${oemPrimary})`
            : primaryPartNumber;

        return {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: `Where can I buy ${brandText} part number ${shortDual}?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `MM Earthmovers supplies part number ${dualDisplay} directly from Kolkata, India. We offer competitive pricing and global shipping options for this ${product.category} component.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: `Is part number ${shortDual} a compatible replacement for my ${brandText} ${product.category}?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `Yes, part number ${dualDisplay} is a premium replacement ${product.title} designed specifically for ${brandText} ${product.category.toLowerCase()} machinery. Contact us with your exact machine model to confirm fitment.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: `What is the replacement for part number ${shortDual}?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `The exact replacement for P/N ${dualDisplay} is our premium quality ${product.title}. It meets or exceeds original equipment specifications for ${brandText} machines.`,
                    },
                },
            ],
        };
    }

    // For products with multiple interchangeable part numbers
    const formattedParts = allParts.map(p => {
        const oem = getOEMHyphenatedPart(p);
        return oem !== p ? `${p} (OEM: ${oem})` : p;
    });
    const partsSummary = formattedParts.join(', ');
    const primaryPart = allParts[0];
    const primaryOem = getOEMHyphenatedPart(primaryPart);
    const primaryDisplay = primaryOem !== primaryPart ? `${primaryPart} / ${primaryOem}` : primaryPart;

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `Where can I buy ${brandText} part number ${primaryDisplay} or compatible replacements?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `MM Earthmovers supplies interchangeable part numbers ${partsSummary} directly from Kolkata, India with worldwide shipping options for this ${product.category} component.`,
                },
            },
            {
                '@type': 'Question',
                name: `Are part numbers ${allParts.join(', ')} interchangeable for this ${product.title}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Yes, part numbers ${partsSummary} are interchangeable replacement part numbers for ${product.title} on ${brandText} ${product.category.toLowerCase()} machines. Contact us to verify exact fitment.`,
                },
            },
            {
                '@type': 'Question',
                name: `What is the replacement for part number ${primaryDisplay}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `The exact replacement is our premium quality ${product.title}, matching interchangeable part numbers ${partsSummary}.`,
                },
            },
        ],
    };
}

// Generate a definitive, authoritative description tailored for AI extraction and on-page readers
export function generateGEOProductDescription(product: {
    title: string;
    category: string;
    brand?: string | string[];
    part_number?: string;
    content?: string;
}): string {
    const allParts = getAllPartNumbers(product.part_number);
    const brandText = product.brand
        ? (Array.isArray(product.brand) ? product.brand.join(', ') : product.brand)
        : '';

    let geoDescription = '';
    
    if (allParts.length === 1) {
        const p = allParts[0];
        const oemPrimary = getOEMHyphenatedPart(p);
        const pnText = oemPrimary !== p
            ? `${p} (OEM notation: ${oemPrimary})`
            : p;
        geoDescription = `Part number ${pnText} is a premium replacement ${product.title} designed for ${brandText} ${product.category.toLowerCase()} machines. MM Earthmovers supplies this exact P/N from Kolkata, India with global shipping options. `;
    } else if (allParts.length > 1) {
        const formattedParts = allParts.map(p => {
            const oem = getOEMHyphenatedPart(p);
            return oem !== p ? `${p} (OEM notation: ${oem})` : p;
        });
        const partsList = formattedParts.slice(0, -1).join(', ') + ' and ' + formattedParts[formattedParts.length - 1];
        geoDescription = `Part numbers ${partsList} are interchangeable premium replacement part numbers for ${product.title} designed for ${brandText} ${product.category.toLowerCase()} machines. MM Earthmovers supplies these exact components from Kolkata, India with global shipping options. `;
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
