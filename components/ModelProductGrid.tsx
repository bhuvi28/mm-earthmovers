'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { getProductUrlSlug } from '@/lib/utils';
import { formatPartNumbersForDisplay, getPartNumberVariations } from '@/lib/seo';
import { getProductSubsystem, SUBSYSTEMS } from '@/lib/recommendations';
import { getTracker } from '@/lib/analytics/tracker';

interface ModelProductGridProps {
  products: Product[];
  machineName: string;
  machineSlug: string;
}

const SUBSYSTEM_LABELS: Record<string, string> = {
  ALL: 'All Parts',
  HYDRAULIC: 'Hydraulics & Valves',
  TRANSMISSION: 'Transmission & Drivetrain',
  BRAKE: 'Brakes & Axles',
  ENGINE_COOLING_EXHAUST: 'Engine & Filtration',
  CHASSIS_GET: 'Pins, Hardware & G.E.T.',
  OTHER: 'General Components',
};

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
}: ModelProductGridProps) {
  const isHM2021 = machineSlug === 'hm-2021';
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // HM 2021 series variant counts for quick pills
  const variantCounts = useMemo(() => {
    if (!isHM2021) return { ALL: products.length, 'HM 2021': 0, 'HM 2021D': 0, 'HM 2021B': 0 };
    const counts = { ALL: products.length, 'HM 2021': 0, 'HM 2021D': 0, 'HM 2021B': 0 };
    products.forEach((p) => {
      const bStr = Array.isArray(p.brand) ? p.brand.join(' ') : (p.brand || '');
      if (/HM\s*2021\s*D/i.test(bStr)) counts['HM 2021D']++;
      else if (/HM\s*2021\s*B/i.test(bStr)) counts['HM 2021B']++;
      else if (/HM\s*2021/i.test(bStr)) counts['HM 2021']++;
    });
    return counts;
  }, [products, isHM2021]);

  // Count items per subsystem for badge counters (filtered by selected variant if applicable)
  const subsystemCounts = useMemo(() => {
    const baseList = isHM2021 && selectedVariant !== 'ALL'
      ? products.filter((p) => {
          const bStr = Array.isArray(p.brand) ? p.brand.join(' ') : (p.brand || '');
          if (selectedVariant === 'HM 2021D') return /HM\s*2021\s*D/i.test(bStr);
          if (selectedVariant === 'HM 2021B') return /HM\s*2021\s*B/i.test(bStr);
          if (selectedVariant === 'HM 2021') return /HM\s*2021(?!\s*[BD])/i.test(bStr);
          return true;
        })
      : products;

    const counts: Record<string, number> = { ALL: baseList.length };
    baseList.forEach((p) => {
      const sub = getProductSubsystem(p.title);
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return counts;
  }, [products, isHM2021, selectedVariant]);

  // Available subsystems with at least 1 product
  const availableSubsystems = useMemo(() => {
    const subs = ['ALL'];
    Object.keys(SUBSYSTEMS).forEach((s) => {
      if ((subsystemCounts[s] || 0) > 0) {
        subs.push(s);
      }
    });
    if ((subsystemCounts['OTHER'] || 0) > 0) {
      subs.push('OTHER');
    }
    return subs;
  }, [subsystemCounts]);

  // Filtered products based on active tab, variant filter, and search query
  const filteredProducts = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const searchAlphanumeric = cleanSearch.replace(/[^a-z0-9]/g, '');

    return products.filter((product) => {
      const brandStr = Array.isArray(product.brand) ? product.brand.join(' ') : (product.brand || '');

      // 1. Variant filter (for HM 2021 Series)
      if (isHM2021 && selectedVariant !== 'ALL') {
        if (selectedVariant === 'HM 2021D' && !/HM\s*2021\s*D/i.test(brandStr)) return false;
        if (selectedVariant === 'HM 2021B' && !/HM\s*2021\s*B/i.test(brandStr)) return false;
        if (selectedVariant === 'HM 2021' && (/HM\s*2021\s*[BD]/i.test(brandStr) || !/HM\s*2021/i.test(brandStr))) return false;
      }

      // 2. Subsystem match
      if (selectedSubsystem !== 'ALL') {
        const prodSub = getProductSubsystem(product.title);
        if (prodSub !== selectedSubsystem) return false;
      }

      // 3. Search match (Title, Part Number, Brand)
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
    });
  }, [products, isHM2021, selectedVariant, selectedSubsystem, searchTerm]);

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
          selectedVariant,
          selectedSubsystem,
          resultsCount: filteredProducts.length,
          zeroResults: filteredProducts.length === 0,
        },
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchTerm, machineSlug, machineName, selectedVariant, selectedSubsystem, filteredProducts.length]);

  const handleSubsystemSelect = (sub: string) => {
    const tracker = getTracker();
    tracker.track('click', {
      elementText: `Subsystem: ${SUBSYSTEM_LABELS[sub] || sub}`,
      elementTag: 'button',
      metadata: {
        trackLabel: 'model_subsystem_filter',
        action: 'filter_subsystem',
        subsystem: sub,
        subsystemLabel: SUBSYSTEM_LABELS[sub] || sub,
        selectedVariant,
        machineSlug,
        machineName,
        itemCount: subsystemCounts[sub] || 0,
      },
    });
    setSelectedSubsystem(sub);
  };

  const handleVariantSelect = (variantId: string, label: string, count: number) => {
    const tracker = getTracker();
    tracker.track('click', {
      elementText: `Variant Filter: ${label}`,
      elementTag: 'button',
      metadata: {
        trackLabel: 'model_variant_filter',
        variant: variantId,
        machineSlug,
        itemCount: count,
      },
    });
    setSelectedVariant(variantId);
    setSelectedSubsystem('ALL'); // Reset subsystem to ALL when changing variant
  };

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

  return (
    <div className="w-full">
      {/* Search and Subsystem Filters Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
        {/* Search Bar + Parts Count */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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

        {/* HM 2021 Series Model Variant Quick Selector */}
        {isHM2021 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
              Filter by Variant:
            </span>
            {[
              { id: 'ALL', label: 'All 2021 Series', count: variantCounts.ALL },
              { id: 'HM 2021', label: 'HM 2021 Standard', count: variantCounts['HM 2021'] },
              { id: 'HM 2021D', label: 'HM 2021D (Pilot)', count: variantCounts['HM 2021D'] },
              { id: 'HM 2021B', label: 'HM 2021B', count: variantCounts['HM 2021B'] },
            ].map((v) => {
              const isActive = selectedVariant === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  data-track="model_variant_filter"
                  data-variant={v.id}
                  data-machine-slug={machineSlug}
                  onClick={() => handleVariantSelect(v.id, v.label, v.count)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span>{v.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {v.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Subsystem Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider self-center mr-2 hidden sm:inline-block">
            Filter by Subsystem:
          </span>
          {availableSubsystems.map((sub) => {
            const isActive = selectedSubsystem === sub;
            const count = subsystemCounts[sub] || 0;
            return (
              <button
                key={sub}
                type="button"
                data-track="model_subsystem_filter"
                data-subsystem={sub}
                data-machine-slug={machineSlug}
                onClick={() => handleSubsystemSelect(sub)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-amber-300'
                }`}
              >
                <span>{SUBSYSTEM_LABELS[sub] || sub}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
                <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center p-4 border-b border-gray-100 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={`${product.title} for ${cardBrand}`}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 text-gray-400">
                      <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
                        Photo on WhatsApp
                      </span>
                    </div>
                  )}

                  <span className="absolute top-3 right-3 text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready Stock
                  </span>
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
                setSelectedVariant('ALL');
                setSelectedSubsystem('ALL');
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

      {/* "Can't Find Your Part?" Sourcing Assistance Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-8 mb-12 border border-gray-700 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Direct Warehouse Sourcing</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              Need an unlisted part for your {machineName}?
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
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
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-sm cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
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
