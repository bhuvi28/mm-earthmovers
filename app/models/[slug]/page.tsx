import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/products';
import {
  MACHINE_MODELS,
  getMachineBySlug,
  getAllMachineSlugs,
} from '@/lib/machines';
import { generateBreadcrumbSchema } from '@/lib/seo';
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper';
import Footer from '@/components/Footer';
import ModelProductGrid from '@/components/ModelProductGrid';

interface ModelPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllMachineSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ModelPageProps): Promise<Metadata> {
  // Handle combined variant aliases
  if (params.slug === 'hm-2021d' || params.slug === 'hm-2021b' || params.slug === 'hm-2021e') {
    return {
      title: 'HM 2021, 2021D, 2021B, 2021E Loader Spare Parts | MM Earthmovers',
      description: 'Redirecting to HM 2021 series parts hub.',
    };
  }
  if (params.slug === 'beml-bg511') {
    return {
      title: 'BEML BG 605 & BG 511 Grader Parts | MM Earthmovers',
      description: 'Redirecting to BEML BG 605 / 511 parts hub.',
    };
  }
  if (params.slug === 'xcmg' || params.slug === 'sdlg') {
    return {
      title: 'XCMG & SDLG Loader Spare Parts | MM Earthmovers',
      description: 'Redirecting to XCMG & SDLG loader parts hub.',
    };
  }

  const model = getMachineBySlug(params.slug);
  if (!model) return {};

  return {
    title: {
      absolute: model.metaTitle,
    },
    description: model.metaDescription,
    alternates: {
      canonical: `https://www.mmearthmovers.com/models/${params.slug}`,
    },
    openGraph: {
      title: model.metaTitle,
      description: model.metaDescription,
      url: `https://www.mmearthmovers.com/models/${params.slug}`,
      siteName: 'MM Earthmovers',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: model.metaTitle,
      description: model.metaDescription,
    },
  };
}

export default function MachineModelPage({ params }: ModelPageProps) {
  // 301 Permanent Redirect for combined variants into single authority hubs
  if (params.slug === 'hm-2021d' || params.slug === 'hm-2021b' || params.slug === 'hm-2021e') {
    redirect('/models/hm-2021');
  }
  if (params.slug === 'beml-bg511') {
    redirect('/models/beml-bg605');
  }
  if (params.slug === 'xcmg' || params.slug === 'sdlg') {
    redirect('/models/xcmg-sdlg');
  }

  const model = getMachineBySlug(params.slug);
  if (!model) {
    notFound();
  }

  const allProducts = getProducts();
  const compatibleProducts = allProducts.filter((p) => model.matchProduct(p));

  // Sibling models (in the same category, excluding current and generic inquiry models)
  const siblingModels = MACHINE_MODELS.filter(
    (m) =>
      m.category === model.category &&
      m.slug !== model.slug &&
      m.slug !== 'other-wheel-loaders' &&
      m.slug !== 'excavators'
  ).slice(0, 4);

  // Schema: BreadcrumbList
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Equipment Machines', url: 'https://www.mmearthmovers.com/models' },
    {
      name: `${model.name} Parts`,
      url: `https://www.mmearthmovers.com/models/${model.slug}`,
    },
  ]);

  // Schema: FAQPage (supported by Bing, DuckDuckGo & parsed by AI Overviews)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: model.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  // Schema: CollectionPage with multi-variant GEO registration for HM 2021 series
  const isHM2021 = model.slug === 'hm-2021';
  const collectionAbout = isHM2021
    ? [
        {
          '@type': 'Product',
          name: 'HM 2021 Wheel Loader Spare Parts',
          alternateName: [
            'HM 2021 Spare Parts',
            'HM 2021 Loader Parts',
            'Hindustan 2021 Loader Spares',
            'HM 2021 Transmission Parts',
          ],
          category: 'Wheel Loader Spare Parts',
          brand: { '@type': 'Brand', name: 'Hindustan Motors' },
        },
        {
          '@type': 'Product',
          name: 'HM 2021D Wheel Loader Spare Parts',
          alternateName: [
            'HM 2021D Spare Parts',
            'HM 2021 D Spare Parts',
            'HM 2021D Loader Parts',
            '2021D Control Manifold',
          ],
          category: 'Wheel Loader Spare Parts',
          brand: { '@type': 'Brand', name: 'Hindustan Motors' },
        },
        {
          '@type': 'Product',
          name: 'HM 2021B Wheel Loader Spare Parts',
          alternateName: [
            'HM 2021B Spare Parts',
            'HM 2021 B Spare Parts',
            'HM 2021B Loader Parts',
            '2021B Cooling Fan Parts',
          ],
          category: 'Wheel Loader Spare Parts',
          brand: { '@type': 'Brand', name: 'Hindustan Motors' },
        },
        {
          '@type': 'Product',
          name: 'HM 2021E Wheel Loader Spare Parts',
          alternateName: [
            'HM 2021E Spare Parts',
            'HM 2021 E Spare Parts',
            'HM 2021E Loader Parts',
          ],
          category: 'Wheel Loader Spare Parts',
          brand: { '@type': 'Brand', name: 'Hindustan Motors' },
        },
      ]
    : {
        '@type': 'Product',
        name: model.fullName,
        category: `${model.category} Spare Parts`,
        brand: {
          '@type': 'Brand',
          name: model.brandName,
        },
      };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: model.metaTitle,
    description: model.metaDescription,
    url: `https://www.mmearthmovers.com/models/${model.slug}`,
    about: collectionAbout,
  };

  const heroWhatsAppMessage = `Hi MM Earthmovers, I am looking for spare parts for my ${model.name} that you deal in. Could you please assist me with availability and other details?`;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <ClientHeaderWrapper />

      <div className="flex-grow py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Breadcrumbs */}
          <nav className="flex mb-8 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2">
            <Link href="/" className="hover:text-amber-600 transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link
              href="/models"
              className="hover:text-amber-600 transition-colors"
            >
              Equipment Machines
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">
              {model.name} Spare Parts
            </span>
          </nav>

          {/* Hero Section */}
          <div className="bg-gradient-to-br from-gray-50 via-white to-amber-50/40 border border-gray-200 rounded-3xl p-8 md:p-12 mb-12 shadow-sm">
            <div className="max-w-4xl">
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                {model.slug === 'other-wheel-loaders' ? (
                  <>
                    Other Wheel Loaders{' '}
                    <span className="text-amber-600">Spare Parts</span>
                  </>
                ) : model.slug === 'excavators' ? (
                  <>
                    Hydraulic Excavators{' '}
                    <span className="text-amber-600">Spare Parts</span>
                  </>
                ) : (
                  <>
                    {model.name.replace(/\s+(loaders?|graders?|excavators?)$/i, '')}{' '}
                    <span className="text-amber-600">
                      {model.category === 'Motor Grader' ? 'Grader' : 'Loader'}
                    </span>{' '}
                    Spare Parts
                  </>
                )}
              </h1>

              {/* Conversion Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={`https://wa.me/+918334887009?text=${encodeURIComponent(
                    heroWhatsAppMessage
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="model_hero_whatsapp_quote_button"
                  data-machine-slug={model.slug}
                  data-machine-name={model.name}
                  className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Enquire {model.name} Parts on WhatsApp</span>
                </a>

                <a
                  href="tel:+918334887009"
                  data-track="model_hero_call_button"
                  data-machine-slug={model.slug}
                  className="px-6 py-3.5 bg-white border border-gray-300 hover:border-gray-900 text-gray-800 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call: +91 8334887009</span>
                </a>
              </div>
            </div>
          </div>

          {/* Products & Subsystem Filter Grid Component */}
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              {model.name} Spare Parts Catalog
            </h2>
            <ModelProductGrid
              products={compatibleProducts}
              machineName={model.name}
              machineSlug={model.slug}
              category={model.category}
            />
          </div>

          {/* Sibling Models Navigation */}
          {siblingModels.length > 0 && (
            <div className="mb-16 border-t border-gray-100 pt-12">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                Explore Other {model.category === 'Motor Grader' ? 'Motor Grader' : 'Loader'} Machines
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {siblingModels.map((sibling) => (
                  <Link
                    key={sibling.slug}
                    href={`/models/${sibling.slug}`}
                    data-track="model_sibling_switcher_card"
                    data-machine-slug={sibling.slug}
                    data-machine-name={sibling.name}
                    className="group bg-white border border-gray-200 hover:border-amber-400 rounded-xl p-4 transition-all hover:shadow-md flex flex-col cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                      {sibling.brandName}
                    </span>
                    <h3 className="font-bold text-gray-900 group-hover:text-amber-600 text-sm mb-1">
                      {sibling.name} Parts
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                      {sibling.classRating}
                    </p>
                    <span className="mt-auto text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      View parts &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions (GEO & Bing) */}
          <div className="border-t border-gray-100 pt-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Frequently Asked Questions about {model.name} Parts
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                Common questions regarding procurement, fitment verification, and dispatch for {model.fullName} components.
              </p>

              <div className="space-y-4">
                {model.faqs.map((faq, index) => (
                  <details
                    key={index}
                    data-track="model_faq_accordion_toggle"
                    data-faq-question={faq.question}
                    data-machine-slug={model.slug}
                    className="group border border-gray-200 rounded-xl overflow-hidden bg-white"
                  >
                    <summary className="flex items-center justify-between cursor-pointer px-6 py-4 bg-gray-50/60 hover:bg-gray-100 transition-colors text-gray-900 font-semibold text-sm">
                      <span>{faq.question}</span>
                      <svg
                        className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
