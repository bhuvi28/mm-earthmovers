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

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Equipment Machines', url: 'https://www.mmearthmovers.com/models' },
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

          {/* Other Wheel Loaders & Excavators Section (Supplied on Inquiry) */}
          <div className="mb-16 border-t border-gray-100 pt-16">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-3">
                Direct Sourcing on Inquiry
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Other Wheel Loaders &amp; Excavators
              </h2>
              <p className="text-gray-600 text-base leading-relaxed">
                Operating equipment not listed above? We maintain direct warehouse sourcing and global procurement networks for all major heavy machinery makes. Send us your required part number or component photo for ready availability.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Card 1: Other Wheel Loaders */}
              <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
                      Wheel Loaders
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Available on Inquiry
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                    Other Wheel Loader Makes &amp; Models
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    In addition to our primary machine hubs, we supply OEM-grade and aftermarket replacement components for prominent loader fleets across India:
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <div className="font-semibold text-xs text-gray-900 uppercase tracking-wide mb-1">
                        Supported Makes &amp; Series
                      </div>
                      <div className="text-sm text-gray-700">
                        Komatsu (WA series), Caterpillar / CAT (924, 938, 950, 966), Volvo (L series), Hyundai (HL series), BEML (BL series), Kawasaki, and Furukawa.
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <div className="font-semibold text-xs text-gray-900 uppercase tracking-wide mb-1">
                        Key Assemblies Supplied
                      </div>
                      <div className="text-sm text-gray-700">
                        ZF transmission friction discs &amp; steel plates, hydraulic gear pumps, torque converter kits, Husco/Rexroth control valves, bucket teeth, and cylinder seal kits.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://wa.me/+918334887009?text=Hi%20MM%20Earthmovers%2C%20I%20am%20looking%20for%20spare%20parts%20for%20my%20Wheel%20Loader%20(Make%2FModel%3A%20____).%20Please%20let%20me%20know%20availability%20and%20pricing."
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track="other_wheel_loaders_whatsapp"
                    className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>Enquire Loader Parts</span>
                  </a>
                  <Link
                    href="/products?category=loader"
                    className="py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors text-center inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse Catalog</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card 2: Hydraulic Excavators */}
              <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
                      Hydraulic Excavators
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Available on Inquiry
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                    Excavators &amp; Heavy Earthmovers
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    We source specialized hydraulic, undercarriage, and mechanical spares for leading tracked and wheeled excavator models in Indian operations:
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <div className="font-semibold text-xs text-gray-900 uppercase tracking-wide mb-1">
                        Supported Makes &amp; Series
                      </div>
                      <div className="text-sm text-gray-700">
                        Tata Hitachi (EX 70/110/200/210, ZAXIS), Komatsu (PC 71/130/200/210/300), JCB (JS 81/140/205), Hyundai (Robex R210/R215), Volvo (EC 210/240), Kobelco &amp; Sany.
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <div className="font-semibold text-xs text-gray-900 uppercase tracking-wide mb-1">
                        Key Assemblies Supplied
                      </div>
                      <div className="text-sm text-gray-700">
                        Main hydraulic pumps (Kawasaki K3V/K5V), swing &amp; travel motors, track rollers &amp; idlers, bucket pins, hardened bushings, rock teeth, and cylinder seal kits.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://wa.me/+918334887009?text=Hi%20MM%20Earthmovers%2C%20I%20am%20looking%20for%20spare%20parts%20for%20my%20Excavator%20(Make%2FModel%3A%20____).%20Please%20let%20me%20know%20availability%20and%20pricing."
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track="excavators_inquiry_whatsapp"
                    className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>Enquire Excavator Parts</span>
                  </a>
                  <Link
                    href="/products?category=excavator"
                    className="py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors text-center inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse Catalog</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Direct Sourcing Banner at the bottom */}
            <div className="dark-banner bg-slate-900 rounded-2xl p-8 md:p-10 mt-8 border border-slate-700 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="max-w-2xl text-center md:text-left">
                  <div className="badge-amber inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                    <span>Custom Machinery Sourcing</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight text-white">
                    Need an unlisted part for any earthmoving machine?
                  </h3>
                  <p className="text-slate-100 text-sm md:text-base leading-relaxed">
                    Heavy earthmoving catalogs encompass tens of thousands of specialized gears, pumps, seals, and structural pins not listed online. Send us your part number or a photo of your required component via WhatsApp.
                  </p>
                </div>

                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://wa.me/+918334887009?text=Hi%20MM%20Earthmovers%2C%20I%20have%20an%20unlisted%20part%20enquiry%20for%20my%20earthmoving%20machine.%20Here%20are%20the%20details%3A"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track="models_directory_sourcing_whatsapp"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-sm cursor-pointer justify-center"
                  >
                    <svg className="w-5 h-5 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>WhatsApp Part Photo / Number</span>
                  </a>
                  <a
                    href="tel:+918334887009"
                    data-track="models_directory_sourcing_call"
                    className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-600 transition-colors text-sm cursor-pointer justify-center"
                  >
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>+91 8334887009</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
