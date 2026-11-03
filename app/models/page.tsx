import Link from 'next/link';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/products';
import { MACHINE_MODELS } from '@/lib/machines';
import { generateBreadcrumbSchema } from '@/lib/seo';
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Heavy Equipment Spare Parts by Machine | MM Earthmovers',
  description:
    'Browse replacement spare parts by machine: HM 2021, L&T 9020, BEML BG 605, TATA TWL 3036, JCB, LiuGong & XCMG. MM Earthmovers Kolkata.',
  keywords: [
    'heavy equipment spare parts by machine',
    'earthmoving machinery model parts catalog',
    'wheel loader models spare parts list',
    'motor grader models spare parts',
    'hydraulic excavator models replacement parts',
    'hm 2021 parts catalog',
    'hm 2021d spare parts list',
    'lt 9020 parts catalog',
    'beml bg 605 parts list',
    'beml bg 511 spare parts catalog',
    'tata twl 3036 parts list',
    'jcb 430zx loader parts',
    'jcb 432zx parts catalog',
    'liugong wheel loader catalog',
    'xcmg sdlg loader spares',
    'equipment model parts directory kolkata india',
    'replacement parts by equipment model',
    'earthmoving machine spares stockist directory',
  ].join(', '),
  alternates: {
    canonical: 'https://www.mmearthmovers.com/models',
  },
  openGraph: {
    title: 'Equipment Machines Spare Parts Directory | MM Earthmovers',
    description:
      'Browse replacement spare parts by machine: HM 2021, L&T 9020, BEML BG 605, TATA TWL 3036, JCB, LiuGong & XCMG. MM Earthmovers Kolkata.',
    url: 'https://www.mmearthmovers.com/models',
    siteName: 'MM Earthmovers',
    type: 'website',
  },
};

export default function ModelsDirectoryPage() {
  const allProducts = getProducts();

  // Compute parts count for each machine model
  const modelsWithCount = MACHINE_MODELS.map((model) => {
    const matchingProducts = allProducts.filter((p) => model.matchProduct(p));
    return {
      ...model,
      count: matchingProducts.length,
    };
  });

  // Filter out generic inquiry models from the primary machine grid
  const primaryModels = modelsWithCount.filter(
    (model) => model.slug !== 'other-wheel-loaders' && model.slug !== 'excavators'
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Equipment Machines', url: 'https://www.mmearthmovers.com/models' },
  ]);

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Heavy Equipment Machine Spare Parts Directory',
    description: 'Master equipment model directory for heavy earthmoving machinery spare parts in Kolkata, India.',
    numberOfItems: MACHINE_MODELS.length,
    itemListElement: MACHINE_MODELS.map((m, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: `${m.fullName} Spare Parts`,
      url: `https://www.mmearthmovers.com/models/${m.slug}`,
    })),
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
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
            <span className="text-gray-900 font-medium">Equipment Machines</span>
          </nav>

          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-4">
              <span>Verified Machine Compatibility</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
              Browse Spare Parts by <span className="text-amber-600">Equipment Machine</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Find exact-fit replacement parts engineered for your specific earthmoving equipment. Select your machine make and model below to view all compatible components.
            </p>
          </div>

          {/* Unified Equipment Models Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Equipment Machines
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {primaryModels.map((model) => (
                <Link
                  key={model.slug}
                  href={`/models/${model.slug}`}
                  data-track="model_directory_card"
                  data-machine-slug={model.slug}
                  data-machine-name={model.name}
                  data-parts-count={model.count}
                  className="group bg-white rounded-2xl border border-gray-200 hover:border-amber-400 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                >
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-100">
                      {model.brandName}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-6">
                    {model.fullName}
                  </h3>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-amber-600 group-hover:text-amber-700 mt-auto">
                    <span>Explore {model.name} Parts</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Other Equipment Section (Supplied on Inquiry) */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Other Machines (Supplied on Inquiry)
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Other Wheel Loaders */}
              <Link
                href="/models/other-wheel-loaders"
                data-track="other_wheel_loaders_card"
                className="group bg-white rounded-2xl border border-gray-200 hover:border-amber-400 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
              >
                <div className="mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-100">
                    Wheel Loaders
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-6">
                  Other Wheel Loaders
                </h3>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-amber-600 group-hover:text-amber-700 mt-auto">
                  <span>Explore Other Wheel Loader Parts</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>

              {/* Card 2: Hydraulic Excavators */}
              <Link
                href="/models/excavators"
                data-track="excavators_card"
                className="group bg-white rounded-2xl border border-gray-200 hover:border-amber-400 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
              >
                <div className="mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-100">
                    Excavators
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-6">
                  Hydraulic Excavators
                </h3>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-amber-600 group-hover:text-amber-700 mt-auto">
                  <span>Explore Excavator Parts</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
