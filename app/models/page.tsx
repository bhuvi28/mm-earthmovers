import Link from 'next/link';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/products';
import { MACHINE_MODELS } from '@/lib/machines';
import { generateBreadcrumbSchema } from '@/lib/seo';
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Heavy Equipment Spare Parts by Machine Model | MM Earthmovers',
  description:
    'Browse replacement spare parts by machine model: HM 2021, L&T 9020, BEML BG 605, TATA TWL 3036, JCB, LiuGong & XCMG. MM Earthmovers Kolkata.',
  alternates: {
    canonical: 'https://www.mmearthmovers.com/models',
  },
  openGraph: {
    title: 'Equipment Models Spare Parts Directory | MM Earthmovers',
    description:
      'Browse replacement spare parts by machine model: HM 2021, L&T 9020, BEML BG 605, TATA TWL 3036, JCB, LiuGong & XCMG. MM Earthmovers Kolkata.',
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

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Equipment Models', url: 'https://www.mmearthmovers.com/models' },
  ]);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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
            <span className="text-gray-900 font-medium">Equipment Models</span>
          </nav>

          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-4">
              <span>Verified Machine Compatibility</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
              Browse Spare Parts by <span className="text-amber-600">Machine Model</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Find exact-fit replacement parts engineered for your specific earthmoving equipment. Select your machine make and model below to view all compatible components.
            </p>
          </div>

          {/* Unified Equipment Models Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Equipment Models
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {modelsWithCount.length} Models
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelsWithCount.map((model) => (
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

                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-2">
                    {model.fullName}
                  </h3>

                  <p className="text-xs text-gray-500 font-medium mb-4">
                    {model.classRating}
                  </p>

                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-6 flex-grow">
                    {model.overview}
                  </p>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-amber-600 group-hover:text-amber-700">
                    <span>Explore {model.name} Parts</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
