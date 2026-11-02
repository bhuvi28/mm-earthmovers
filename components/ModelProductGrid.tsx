'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/products';
import { getProductUrlSlug, compareProductsByPriority } from '@/lib/utils';
import { formatPartNumbersForDisplay, getPartNumberVariations } from '@/lib/seo';
import { getTracker } from '@/lib/analytics/tracker';

interface ModelProductGridProps {
  products: Product[];
  machineName: string;
  machineSlug: string;
  category?: string;
}

const getCategorySlug = (category: string) => {
  const map: Record<string, string> = {
    Loader: 'loader',
    Excavator: 'excavator',
    'Motor Grader': 'grader',
    Grader: 'grader',
  };
  return map[category] || 'loader';
};

export default function ModelProductGrid({
  products,
  machineName,
  machineSlug,
  category,
}: ModelProductGridProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtered products based on search query
  const filteredProducts = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const searchAlphanumeric = cleanSearch.replace(/[^a-z0-9]/g, '');

    return products.filter((product) => {
      const brandStr = Array.isArray(product.brand) ? product.brand.join(' ') : (product.brand || '');

      // Search match (Title, Part Number, Brand)
      if (cleanSearch) {
        const titleMatch = product.title.toLowerCase().includes(cleanSearch);
        if (titleMatch) return true;

        // Brand match (e.g. typing "2021D", "2021 D", "2021B", "HM 2021D")
        if (brandStr.toLowerCase().includes(cleanSearch)) return true;
        if (searchAlphanumeric.length >= 3) {
          const brandStripped = brandStr.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (brandStripped.includes(searchAlphanumeric)) return true;
        }

        if (product.part_number) {
          const variations = getPartNumberVariations(product.part_number);
          const pnMatch = variations.some((v) =>
            v.toLowerCase().includes(cleanSearch)
          );
          if (pnMatch) return true;

          if (searchAlphanumeric.length >= 3) {
            const rawStripped = product.part_number
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            if (rawStripped.includes(searchAlphanumeric)) return true;
          }
        }

        return false;
      }

      return true;
    }).sort(compareProductsByPriority);
  }, [products, searchTerm]);

  // Analytics: Track search queries inside the model page (feeds Admin "Unsatisfied Demand" analytics)
  useEffect(() => {
    const clean = searchTerm.trim();
    if (!clean || clean.length < 2) return;

    const timer = setTimeout(() => {
      const tracker = getTracker();
      tracker.track('search', {
        metadata: {
          query: clean,
          machineSlug,
          machineName,
          resultsCount: filteredProducts.length,
          zeroResults: filteredProducts.length === 0,
        },
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchTerm, machineSlug, machineName, filteredProducts.length]);

  const handleEnquire = (product: Product) => {
    const brandLabel = Array.isArray(product.brand) ? product.brand.join(' / ') : (product.brand || machineName);
    const pnDisplay = product.part_number
      ? ` (Part #: ${formatPartNumbersForDisplay(product.part_number)})`
      : '';
    const message = `Hi MM Earthmovers, I am looking for ${brandLabel} ${product.title}${pnDisplay}. Could you please assist me with availability and price?`;
    const waUrl = `https://wa.me/+918334887009?text=${encodeURIComponent(message)}`;
    const prodSlug = getProductUrlSlug(product);
    const catSlug = getCategorySlug(product.category);

    // Analytics: Explicit high-priority enquiry conversion dispatch
    const tracker = getTracker();
    tracker.track('click', {
      elementText: `Enquire: ${product.title}`,
      elementTarget: waUrl,
      elementTag: 'button',
      metadata: {
        trackLabel: 'model_page_enquire_button',
        productTitle: product.title,
        partNumber: product.part_number || '',
        productSlug: prodSlug,
        category: product.category,
        categorySlug: catSlug,
        brand: brandLabel,
        machineSlug,
        machineName,
      },
    });

    window.open(waUrl, '_blank');
  };

  const unlistedPartWhatsAppUrl = `https://wa.me/+918334887009?text=${encodeURIComponent(
    `Hi MM Earthmovers, I am looking for a part for my ${machineName} that is not listed on your website. Could you please assist me?`
  )}`;

  if (products.length === 0) {
    const isExcavator = machineSlug === 'excavators' || category === 'Excavator';
    const categoryLabel = isExcavator ? 'Excavator' : 'Wheel Loader';
    const bannerWhatsAppUrl = isExcavator
      ? 'https://wa.me/+918334887009?text=Hi%2C%20I%20am%20looking%20for%20excavator%20spare%20parts.%20Please%20assist%20me.'
      : 'https://wa.me/+918334887009?text=Hi%2C%20I%20am%20looking%20for%20wheel%20loader%20spare%20parts.%20Please%20assist%20me.';

    return (
      <div className="w-full">
        {/* Category Update Alert Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-1">
                We&apos;re Currently Updating Our {categoryLabel} Products
              </h3>
              <p className="text-amber-700">
                We&apos;re working on adding more {categoryLabel.toLowerCase()} spare parts to our catalog. Please reach out to us directly for any {categoryLabel.toLowerCase()} parts requirements.
              </p>
            </div>
            <div className="flex-shrink-0">
              <a
                href={bannerWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Contact Us on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Dashed Empty State Box */}
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mb-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-gray-500">We couldn&apos;t find any products matching your criteria.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 cursor-pointer"
            >
              Clear all filters
            </Link>
          </div>
        </div>

        {/* "Can't Find Your Part?" Sourcing Assistance Card */}
        <div className="dark-banner bg-slate-900 rounded-2xl p-8 md:p-10 mb-12 border border-slate-700 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl text-center md:text-left">
              <div className="badge-amber inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <span>Direct Warehouse Sourcing</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight text-white">
                Need an unlisted part for your {machineName}?
              </h3>
              <p className="text-slate-100 text-sm md:text-base leading-relaxed">
                Heavy earthmoving machinery parts catalogs contain thousands of specialized seals, shims, shafts, and hardware not listed online. Send us your required part number or a photo of your broken component via WhatsApp.
              </p>
            </div>

            <div className="flex-shrink-0">
              <a
                href={unlistedPartWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-track="model_unlisted_part_whatsapp"
                data-machine-slug={machineSlug}
                data-machine-name={machineName}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-sm cursor-pointer"
              >
                <svg className="w-5 h-5 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Send Part Photo / Number</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
        {/* Search Bar + Parts Count */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search within ${machineName} (by part #, name, or model e.g. 2021D)...`}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500 font-medium whitespace-nowrap self-center md:self-auto">
            Showing <span className="font-bold text-gray-900">{filteredProducts.length}</span> of {products.length} parts
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredProducts.map((product) => {
            const catSlug = getCategorySlug(product.category);
            const prodSlug = getProductUrlSlug(product);
            const productHref = `/products/${catSlug}/${prodSlug}`;
            const cardBrand = Array.isArray(product.brand)
              ? product.brand.join(' / ')
              : (product.brand || machineName);

            return (
              <div
                key={prodSlug}
                data-product-title={product.title}
                data-part-number={product.part_number || ''}
                data-category={product.category}
                data-product-slug={prodSlug}
                data-machine-slug={machineSlug}
                data-machine-name={machineName}
                data-brand={cardBrand}
                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-amber-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Clickable Card Link to canonical product page */}
                <Link
                  href={productHref}
                  data-track="model_product_card_link"
                  data-product-title={product.title}
                  data-part-number={product.part_number || ''}
                  data-product-slug={prodSlug}
                  data-machine-slug={machineSlug}
                  className="absolute inset-0 z-10 cursor-pointer"
                  aria-label={`View details for ${product.title}`}
                />

                {/* Image Container */}
                <div className="relative w-full aspect-square bg-gray-50 overflow-hidden border-b border-gray-100">
                  {product.image ? (
                    <div className="w-full h-full p-4 flex items-center justify-center">
                      <img
                        src={product.image}
                        alt={`${product.title} for ${cardBrand}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center bg-gray-900 overflow-hidden group-hover:bg-gray-800 transition-colors duration-300">
                      <div 
                        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ 
                          backgroundImage: `url(${
                            product.category.toLowerCase().includes('loader') ? '/loader-image.png' :
                            (product.category.toLowerCase().includes('grader') ? '/motor-grader-image.png' :
                            (product.category.toLowerCase().includes('excavator') ? '/excavator-image.png' : 
                            '/logo.png'))
                          })` 
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent z-10" />
                      
                      <div className="relative z-20 flex flex-col items-center justify-center text-center p-4 transform transition-transform duration-500 group-hover:-translate-y-1">
                        <div className="text-3xl mb-2 drop-shadow-md">📦</div>
                        <h4 className="text-amber-400 font-bold text-lg tracking-widest uppercase drop-shadow-lg shadow-black mb-1">Coming Soon</h4>
                        <p className="text-gray-100 font-medium text-[11px] drop-shadow-md shadow-black">Product photo will be added shortly</p>
                        <div className="w-8 h-1 bg-amber-500/80 mt-2 rounded-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-grow">
                  {/* Exact Compatible Variant Tag */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    {cardBrand}
                  </div>

                  <h3
                    className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2 text-base leading-snug mb-2"
                    title={product.title}
                  >
                    {product.title}
                  </h3>

                  {product.part_number && (
                    <div className="text-xs font-mono text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 mb-4 inline-block w-fit">
                      <span className="text-gray-400 mr-1">P/N:</span>
                      <span className="font-semibold text-gray-900">
                        {formatPartNumbersForDisplay(product.part_number)}
                      </span>
                    </div>
                  )}

                  {/* WhatsApp Enquiry Button */}
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      data-track="model_page_enquire_button"
                      data-product-title={product.title}
                      data-part-number={product.part_number || ''}
                      data-product-slug={prodSlug}
                      data-machine-slug={machineSlug}
                      data-brand={cardBrand}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleEnquire(product);
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm relative z-20 group-hover:shadow cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>Enquire Price</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center mb-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No parts matching &ldquo;{searchTerm}&rdquo; in {machineName}
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            We stock many uncataloged components directly in our Kolkata warehouse. Send us your part number or a photo of your required part on WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
            >
              Reset Filters
            </button>
            <a
              href={`https://wa.me/+918334887009?text=${encodeURIComponent(
                `Hi MM Earthmovers, I am looking for part "${searchTerm}" for my ${machineName}. Do you have this part?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              data-track="model_zero_results_whatsapp"
              data-machine-slug={machineSlug}
              data-search-query={searchTerm}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* "Can't Find Your Part?" Sourcing Assistance Card with High Contrast WCAG AAA */}
      <div className="dark-banner bg-slate-900 rounded-2xl p-8 md:p-10 mb-12 border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <div className="badge-amber inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <span>Direct Warehouse Sourcing</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight text-white">
              Need an unlisted part for your {machineName}?
            </h3>
            <p className="text-slate-100 text-sm md:text-base leading-relaxed">
              Heavy earthmoving machinery parts catalogs contain thousands of specialized seals, shims, shafts, and hardware not listed online. Send us your required part number or a photo of your broken component via WhatsApp.
            </p>
          </div>

          <div className="flex-shrink-0">
            <a
              href={unlistedPartWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="model_unlisted_part_whatsapp"
              data-machine-slug={machineSlug}
              data-machine-name={machineName}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-sm cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>Send Part Photo / Number</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
