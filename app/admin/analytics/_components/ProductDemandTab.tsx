'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  DashboardStats,
  ProductEnquiryData,
  ProductEnquiryStat,
  ProductFilterPreset,
  ProductSortField,
  ProductViewMode,
} from '../_types/analytics';
import { formatTimeAgo, getProductUrl, triggerCsvDownload } from '../_utils/formatters';

interface ProductDemandTabProps {
  stats: DashboardStats | null;
  productData: ProductEnquiryData | null;
  productSearch: string;
  setProductSearch: (val: string) => void;
  copiedPart: string | null;
  handleCopyPart: (partNumber: string, e?: React.MouseEvent) => void;
  setInspectedProduct: (product: ProductEnquiryStat | null) => void;
}

export default function ProductDemandTab({
  stats,
  productData,
  productSearch,
  setProductSearch,
  copiedPart,
  handleCopyPart,
  setInspectedProduct,
}: ProductDemandTabProps) {
  const [productFilter, setProductFilter] = useState<ProductFilterPreset>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productBrandFilter, setProductBrandFilter] = useState<string>('all');
  const [copiedPartNumbersFeedback, setCopiedPartNumbersFeedback] = useState(false);

  const [sortField, setSortField] = useState<ProductSortField>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ProductViewMode>('auto');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const availableCategories = useMemo(() => {
    if (!productData?.products) return [];
    const set = new Set<string>();
    productData.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [productData]);

  const availableBrands = useMemo(() => {
    if (!productData?.products) return [];
    const set = new Set<string>();
    productData.products.forEach((p) => {
      if (p.brand) {
        p.brand.split(',').forEach((b) => {
          const trimmed = b.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [productData]);

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'title' || field === 'category' || field === 'part_number') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
    setCurrentPage(1);
  };

  const filteredProducts = useMemo(() => {
    return (productData?.products || []).filter((p) => {
      if (productFilter === 'active' && p.enquire_clicks === 0) return false;
      if (productFilter === 'high_demand' && p.enquire_clicks < 2) return false;
      if (productFilter === 'opportunity' && !(p.views > 0 && p.enquire_clicks === 0)) return false;
      if (productFilter === 'zero' && p.enquire_clicks > 0) return false;

      if (
        productCategoryFilter !== 'all' &&
        (p.category || '').toLowerCase() !== productCategoryFilter.toLowerCase()
      ) {
        return false;
      }

      if (productBrandFilter !== 'all') {
        const brandStr = (p.brand || '').toLowerCase();
        if (!brandStr.includes(productBrandFilter.toLowerCase())) return false;
      }

      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.part_number || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.slug || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [productData, productFilter, productCategoryFilter, productBrandFilter, productSearch]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'clicks':
          comparison = a.enquire_clicks - b.enquire_clicks;
          if (comparison === 0) comparison = a.views - b.views;
          break;
        case 'views':
          comparison = a.views - b.views;
          if (comparison === 0) comparison = a.enquire_clicks - b.enquire_clicks;
          break;
        case 'conversion':
          comparison = a.conversion_rate - b.conversion_rate;
          if (comparison === 0) comparison = a.enquire_clicks - b.enquire_clicks;
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'part_number':
          comparison = (a.part_number || '').localeCompare(b.part_number || '');
          break;
        case 'last_enquired': {
          const timeA = a.last_enquired_at ? new Date(a.last_enquired_at).getTime() : 0;
          const timeB = b.last_enquired_at ? new Date(b.last_enquired_at).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredProducts, sortField, sortOrder]);

  const totalPages = useMemo(() => {
    if (pageSize === -1) return 1;
    return Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  }, [sortedProducts.length, pageSize]);

  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return sortedProducts;
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const handleCopyFilteredPartNumbers = () => {
    if (!filteredProducts || filteredProducts.length === 0) return;
    const parts = filteredProducts
      .map((p) => p.part_number)
      .filter((p) => p && p !== '-')
      .filter((v, i, a) => a.indexOf(v) === i);

    if (parts.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(parts.join(', '));
      setCopiedPartNumbersFeedback(true);
      setTimeout(() => setCopiedPartNumbersFeedback(false), 2500);
    }
  };

  const handleExportCSV = () => {
    if (!sortedProducts || sortedProducts.length === 0) return;
    const headers = [
      'Product Title',
      'Category',
      'Brand',
      'Part Number',
      'Page Views',
      'Enquire Clicks',
      'Conversion Rate (%)',
      'Demand Status',
      'Last Enquired (UTC)',
    ];
    const rows = sortedProducts.map((p) => [
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${(p.part_number || '').replace(/"/g, '""')}"`,
      p.views,
      p.enquire_clicks,
      `${p.conversion_rate}%`,
      p.enquire_clicks > 0 ? 'Active Demand' : 'Zero Enquiries',
      p.last_enquired_at ? `"${new Date(p.last_enquired_at).toISOString()}"` : 'Never',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    triggerCsvDownload(`mm-earthmovers-enquiries-${dateStr}.csv`, csvContent);
  };

  const gaps = productData?.catalogHealthGaps;
  const engagement = stats?.productEngagementStats;

  return (
    <div className="space-y-6">
      {/* 1. INTERACTIVE KPI SUMMARY SCORECARD CARDS */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 md:grid-cols-3 lg:grid-cols-5 md:gap-4 md:mx-0 md:px-0">
        <button
          type="button"
          onClick={() => {
            setProductFilter('all');
            setCurrentPage(1);
          }}
          className={`shrink-0 snap-start w-[140px] md:w-auto min-h-[44px] bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
            productFilter === 'all'
              ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30'
              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Click to view all catalog items"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Catalog
              </span>
              <span className="text-xs">📦</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-sans">
              {productData?.summary?.totalCatalogProducts || 144}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 hidden sm:block font-medium">
            All parts in catalog
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">
            All catalog parts
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProductFilter('active');
            setCurrentPage(1);
          }}
          className={`shrink-0 snap-start w-[140px] md:w-auto min-h-[44px] bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
            productFilter === 'active'
              ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/30'
              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Click to filter parts with active buyer inquiries"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Active Inquiries
              </span>
              {productData?.summary?.totalCatalogProducts ? (
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {Math.round(
                    ((productData.summary.withEnquiriesCount || 0) /
                      productData.summary.totalCatalogProducts) *
                      100
                  )}
                  %
                </span>
              ) : null}
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1 font-sans">
              {productData?.summary?.withEnquiriesCount || 0}
            </div>
          </div>
          <span className="text-[11px] text-emerald-800/80 mt-2 hidden sm:block font-medium">
            Direct buyer demand ⚡
          </span>
          <span className="text-[10px] text-emerald-700/80 mt-0.5 block sm:hidden truncate">
            Buyer demand ⚡
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProductFilter('high_demand');
            setCurrentPage(1);
          }}
          className={`shrink-0 snap-start w-[140px] md:w-auto min-h-[44px] bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
            productFilter === 'high_demand'
              ? 'border-green-600 ring-2 ring-green-500/40 bg-green-50/30'
              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Click to filter high demand parts (2+ inquiries)"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-green-700 uppercase tracking-wider block">
                High Demand
              </span>
              <span className="text-xs">🔥</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-green-700 mt-1 font-sans">
              {productData?.summary?.highDemandCount || 0}
            </div>
          </div>
          <span className="text-[11px] text-green-800/80 mt-2 hidden sm:block font-medium">
            2+ quote inquiries
          </span>
          <span className="text-[10px] text-green-700/80 mt-0.5 block sm:hidden truncate">
            2+ quotes
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProductFilter('opportunity');
            setCurrentPage(1);
          }}
          className={`shrink-0 snap-start w-[140px] md:w-auto min-h-[44px] bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
            productFilter === 'opportunity'
              ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30'
              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Click to view high-traffic parts that need pricing/photo attention"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                Opportunity
              </span>
              <span className="text-xs">👀</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-sans">
              {productData?.summary?.opportunityCount || 0}
            </div>
          </div>
          <span className="text-[11px] text-amber-800/80 mt-2 hidden sm:block font-medium">
            Viewed, no inquiry yet
          </span>
          <span className="text-[10px] text-amber-700/80 mt-0.5 block sm:hidden truncate">
            No inquiry yet
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProductFilter('zero');
            setCurrentPage(1);
          }}
          className={`shrink-0 snap-start w-[140px] md:w-auto min-h-[44px] bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group ${
            productFilter === 'zero'
              ? 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/30'
              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Click to filter cold inventory with zero inquiries"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                Cold Inventory
              </span>
              <span className="text-xs">❄️</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1 font-sans">
              {productData?.summary?.zeroEnquiriesCount || 0}
            </div>
          </div>
          <span className="text-[11px] text-rose-700/80 mt-2 hidden sm:block font-medium">
            0 buyer inquiries
          </span>
          <span className="text-[10px] text-rose-600/80 mt-0.5 block sm:hidden truncate">
            0 inquiries
          </span>
        </button>
      </div>

      {/* 2. MAIN REPORT CONTAINER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Toolbar Row 1: Heading & Status Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Product Enquiry Demand Report</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {sortedProducts.length} items
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                🇮🇳 IST
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {productFilter === 'all' &&
                'Showing all catalog products with demand metrics, views, and enquiries.'}
              {productFilter === 'active' &&
                'Showing products that received verified WhatsApp enquiries or calls.'}
              {productFilter === 'high_demand' &&
                'Showing fast-moving products with 2 or more buyer enquiries.'}
              {productFilter === 'opportunity' &&
                'High-traffic products viewed by buyers that have zero enquiries — prime targets for price/photo updates!'}
              {productFilter === 'zero' &&
                'Showing catalog products with zero buyer enquiries in this period.'}
            </p>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-slate-200/80 text-xs self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                setProductFilter('all');
                setCurrentPage(1);
              }}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                productFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({productData?.products?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('active');
                setCurrentPage(1);
              }}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                productFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ color: productFilter === 'active' ? '#ffffff' : undefined }}
            >
              ⚡ Active ({productData?.summary?.withEnquiriesCount || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('high_demand');
                setCurrentPage(1);
              }}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                productFilter === 'high_demand'
                  ? 'bg-green-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ color: productFilter === 'high_demand' ? '#ffffff' : undefined }}
            >
              🔥 High Demand ({productData?.summary?.highDemandCount || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('opportunity');
                setCurrentPage(1);
              }}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                productFilter === 'opportunity'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ color: productFilter === 'opportunity' ? '#ffffff' : undefined }}
            >
              👀 Opportunity ({productData?.summary?.opportunityCount || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setProductFilter('zero');
                setCurrentPage(1);
              }}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                productFilter === 'zero'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ color: productFilter === 'zero' ? '#ffffff' : undefined }}
            >
              ❄️ Cold ({productData?.summary?.zeroEnquiriesCount || 0})
            </button>
          </div>
        </div>

        {/* Toolbar Row 2 */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl mb-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search title, part #, brand, OEM..."
                className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 pl-8 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-xs"
              />
              <span className="absolute left-2.5 top-3 sm:top-2 text-xs text-slate-400">🔍</span>
              {productSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-3 sm:top-1.5 text-xs text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={productCategoryFilter}
              onChange={(e) => {
                setProductCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto min-w-0 sm:min-w-[160px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer min-h-[44px]"
            >
              <option value="all">All Categories ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={productBrandFilter}
              onChange={(e) => {
                setProductBrandFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto min-w-0 sm:min-w-[150px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer min-h-[44px]"
            >
              <option value="all">All Brands ({availableBrands.length})</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-end">
            <div className="bg-white p-0.5 rounded-xl flex items-center border border-slate-200 shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setViewMode('auto')}
                title="Responsive (Cards on mobile, Table on desktop)"
                style={{ color: viewMode === 'auto' ? '#ffffff' : undefined }}
                className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'auto'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Grid Card View"
                style={{ color: viewMode === 'cards' ? '#ffffff' : undefined }}
                className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⊞</span>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Compact Table View"
                style={{ color: viewMode === 'table' ? '#ffffff' : undefined }}
                className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>☰</span>
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="min-h-[38px] px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleCopyFilteredPartNumbers}
              title="Copy unique part numbers of visible products to clipboard"
              className="min-h-[44px] sm:min-h-[38px] px-2.5 sm:px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>{copiedPartNumbersFeedback ? '✓' : '📋'}</span>
              <span>{copiedPartNumbersFeedback ? 'Copied!' : 'Copy Part #s'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export current filtered list to CSV"
              className="min-h-[44px] sm:min-h-[38px] px-2.5 sm:px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 3. MOBILE & GRID CARD VIEW */}
        <div
          className={`${
            viewMode === 'cards' ? 'block' : viewMode === 'table' ? 'hidden' : 'block md:hidden'
          }`}
        >
          {paginatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {paginatedProducts.map((p) => {
                const isHighDemand = p.enquire_clicks >= 2;
                const isActive = p.enquire_clicks > 0;
                const isOpportunity = p.views > 0 && p.enquire_clicks === 0;

                return (
                  <div
                    key={p.slug}
                    className="bg-white border border-slate-200/90 hover:border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium truncate max-w-[140px]">
                          {p.category}
                        </span>
                        {isHighDemand ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                            <span>🔥</span>
                            <span>High Demand</span>
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Active Demand</span>
                          </span>
                        ) : isOpportunity ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span>👀</span>
                            <span>Opportunity</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>Zero Enquiries</span>
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => setInspectedProduct(p)}
                          className="font-bold text-slate-900 hover:text-amber-600 transition text-sm leading-snug line-clamp-2 text-left cursor-pointer"
                          title="Click to inspect demand details"
                        >
                          {p.title}
                        </button>
                        {p.brand && (
                          <span className="block text-xs text-slate-500 mt-0.5 truncate">
                            {p.brand}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3.5">
                        <span className="text-[11px] text-slate-400 font-medium">Part #:</span>
                        {p.part_number && p.part_number !== '-' ? (
                          <button
                            type="button"
                            onClick={(e) => handleCopyPart(p.part_number, e)}
                            title="Click to copy part number"
                            className={`inline-flex items-center justify-center gap-1.5 font-mono text-xs px-3.5 py-2.5 min-h-[44px] rounded-xl transition cursor-pointer active:scale-95 ${
                              copiedPart === p.part_number
                                ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 border border-slate-200'
                            }`}
                          >
                            {copiedPart === p.part_number ? (
                              <>
                                <span>✓</span>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <span>📋</span>
                                <span className="font-semibold break-all">{p.part_number}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 mb-3 text-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Views
                          </span>
                          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                            {p.views}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Enquiries
                          </span>
                          <span
                            className={`text-base font-extrabold mt-0.5 block ${
                              p.enquire_clicks > 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {p.enquire_clicks}
                          </span>
                          {p.enquire_clicks > 0 &&
                            (p.detail_enquiries !== undefined ||
                              p.listing_enquiries !== undefined) && (
                              <span className="text-[9px] text-slate-500 block font-mono">
                                {p.detail_enquiries ?? 0}d · {p.listing_enquiries ?? 0}g
                              </span>
                            )}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Conv. %
                          </span>
                          <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
                            {p.conversion_rate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span title={p.last_enquired_at ? `${p.last_enquired_at}` : undefined}>
                        Last:{' '}
                        <strong className="text-slate-700 font-mono font-medium">
                          {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                        </strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectedProduct(p)}
                          className="min-h-[44px] px-3 py-2 rounded-xl font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center justify-center cursor-pointer"
                        >
                          ⚡ Inspect
                        </button>
                        <Link
                          href={getProductUrl(p)}
                          target="_blank"
                          className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 transition flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200"
                          title="Open Live Page"
                        >
                          ↗
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-200/80">
              <p className="text-sm font-medium">No products match your current search or filters.</p>
              <button
                type="button"
                onClick={() => {
                  setProductFilter('all');
                  setProductCategoryFilter('all');
                  setProductBrandFilter('all');
                  setProductSearch('');
                  setCurrentPage(1);
                }}
                className="mt-3 min-h-[44px] px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* 4. COMPACT DESKTOP TABLE VIEW */}
        <div
          className={`${
            viewMode === 'table' ? 'block' : viewMode === 'cards' ? 'hidden' : 'hidden md:block'
          }`}
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('title')}
                    className="py-3 px-4 sticky left-0 bg-slate-50 z-20 cursor-pointer hover:bg-slate-100/90 transition shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product Name</span>
                      <span
                        className={`text-xs ${
                          sortField === 'title' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <span
                        className={`text-xs ${
                          sortField === 'category' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('part_number')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Part Number</span>
                      <span
                        className={`text-xs ${
                          sortField === 'part_number' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'part_number' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('views')}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Page Views</span>
                      <span
                        className={`text-xs ${
                          sortField === 'views' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'views' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('clicks')}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Enquiries</span>
                      <span
                        className={`text-xs ${
                          sortField === 'clicks' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'clicks' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('conversion')}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Conversion</span>
                      <span
                        className={`text-xs ${
                          sortField === 'conversion' ? 'text-amber-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'conversion' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Demand Status</th>
                  <th
                    onClick={() => handleSort('last_enquired')}
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/90 transition"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Last Enquired</span>
                      <span
                        className={`text-xs ${
                          sortField === 'last_enquired'
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        {sortField === 'last_enquired' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((p, idx) => {
                    const isHighDemand = p.enquire_clicks >= 2;
                    const isActive = p.enquire_clicks > 0;
                    const isOpportunity = p.views > 0 && p.enquire_clicks === 0;

                    return (
                      <tr
                        key={p.slug || idx}
                        onClick={() => setInspectedProduct(p)}
                        className="group hover:bg-amber-50/40 transition-colors cursor-pointer"
                        title="Click row to inspect demand details"
                      >
                        <td
                          className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate sticky left-0 bg-white group-hover:bg-amber-50/40 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                          title={p.title}
                        >
                          <span className="hover:text-amber-600 font-bold transition">{p.title}</span>
                          {p.brand && (
                            <span className="block text-[11px] text-slate-500 font-normal mt-0.5 truncate">
                              {p.brand}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {p.part_number && p.part_number !== '-' ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopyPart(p.part_number, e)}
                              title="Click to copy part number"
                              className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded transition cursor-pointer ${
                                copiedPart === p.part_number
                                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                  : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200/80'
                              }`}
                            >
                              {copiedPart === p.part_number ? (
                                <>
                                  <span>✓</span>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <span className="opacity-50">📋</span>
                                  <span>{p.part_number}</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="font-mono text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{p.views}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-block shadow-2xs ${
                              isHighDemand
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'text-slate-400 bg-slate-100'
                            }`}
                          >
                            {p.enquire_clicks}
                          </span>
                          {p.enquire_clicks > 0 &&
                            (p.detail_enquiries !== undefined ||
                              p.listing_enquiries !== undefined) && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {p.detail_enquiries ?? 0} detail · {p.listing_enquiries ?? 0} grid
                              </div>
                            )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-1.5 rounded-full ${
                                  p.conversion_rate >= 10
                                    ? 'bg-emerald-500'
                                    : p.conversion_rate > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(p.conversion_rate, 100)}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-600 font-medium">
                              {p.conversion_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isHighDemand ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
                              <span>🔥</span>
                              <span>High Demand</span>
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Active Demand</span>
                            </span>
                          ) : isOpportunity ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span>👀</span>
                              <span>Opportunity</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>Zero Inquiries</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono">
                          {p.last_enquired_at ? formatTimeAgo(p.last_enquired_at) : 'Never'}
                        </td>
                        <td
                          className="py-3 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectedProduct(p)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                              title="Open Demand Inspector"
                            >
                              ⚡ Inspect
                            </button>
                            <Link
                              href={getProductUrl(p)}
                              target="_blank"
                              className="p-1 text-slate-400 hover:text-slate-700 transition font-bold"
                              title="Open Live Product Page"
                            >
                              ↗
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <p className="text-sm font-medium">
                        No products match your current search or filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setProductFilter('all');
                          setProductCategoryFilter('all');
                          setProductBrandFilter('all');
                          setProductSearch('');
                          setCurrentPage(1);
                        }}
                        className="mt-3 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. PAGINATION BAR */}
        {sortedProducts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="text-slate-900 font-semibold">
                  {pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900 font-semibold">
                  {pageSize === -1
                    ? sortedProducts.length
                    : Math.min(currentPage * pageSize, sortedProducts.length)}
                </strong>{' '}
                of <strong className="text-slate-900 font-semibold">{sortedProducts.length}</strong>{' '}
                products
              </span>
              {pageSize !== -1 && (
                <span className="text-slate-400 hidden sm:inline">
                  • Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition cursor-pointer"
                >
                  ← Prev
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                    )
                    .map((item, i, arr) => {
                      const prev = arr[i - 1];
                      const showEllipsis = prev && item - prev > 1;
                      return (
                        <React.Fragment key={item}>
                          {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            style={{ color: currentPage === item ? '#ffffff' : undefined }}
                            className={`w-8 h-8 rounded-lg font-medium transition text-xs cursor-pointer ${
                              currentPage === item
                                ? 'bg-amber-600 text-white font-bold shadow-xs'
                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {item}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-xs transition cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5B. CTA PLACEMENT ATTRIBUTION (`BI-02`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📍 CTA Placement Attribution</span>
            </h3>
            <p className="text-xs text-slate-500">
              Which storefront WhatsApp, Phone, and Form slots generate the most high-intent enquiries
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {stats?.placementAttribution?.length || 0} active placements
          </span>
        </div>

        {stats?.placementAttribution && stats.placementAttribution.length > 0 ? (
          <>
            <div className="block md:hidden space-y-2.5">
              {stats.placementAttribution.slice(0, 12).map((row) => (
                <div
                  key={row.placement}
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate">
                      {row.placement}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold shrink-0">
                      {row.total_clicks} actions
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block text-[10px]">WhatsApp</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {row.whatsapp_clicks}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Calls / Form</span>
                      <span className="font-bold text-blue-700 font-mono">
                        {row.phone_clicks + row.form_submits}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Visitors</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {row.unique_visitors}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Placement ID</th>
                    <th className="py-3 px-4 text-center">Total Actions</th>
                    <th className="py-3 px-4 text-center">WhatsApp</th>
                    <th className="py-3 px-4 text-center">Phone Calls</th>
                    <th className="py-3 px-4 text-center">Forms</th>
                    <th className="py-3 px-4 text-center">Unique Visitors</th>
                    <th className="py-3 px-4 text-right">Last Triggered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.placementAttribution.slice(0, 15).map((row) => (
                    <tr key={row.placement} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        {row.placement}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                        {row.total_clicks}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-emerald-700 font-semibold">
                        {row.whatsapp_clicks}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-blue-700 font-semibold">
                        {row.phone_clicks}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-purple-700 font-semibold">
                        {row.form_submits}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {row.unique_visitors}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                        {row.last_clicked_at ? formatTimeAgo(row.last_clicked_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            No placement CTA interactions recorded in this time window yet.
          </div>
        )}
      </div>

      {/* 5C. CATALOG HEALTH GAPS: MISSING-PHOTO SKUS & EXCAVATOR DEMAND (`BI-04`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📷 Catalog Health Gaps &amp; Excavator Demand (BI-04)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Silent placeholder impressions on imageless SKUs and unstocked Excavator demand signals
            </p>
          </div>
          <span className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {gaps?.missingPhotoSkuCount ?? 0} imageless SKUs
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Imageless SKUs
            </span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {gaps?.missingPhotoSkuCount ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Photo Impressions
            </span>
            <span className="text-lg font-extrabold text-amber-700 font-mono">
              {gaps?.missingPhotoImpressions ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Photo WA Clicks
            </span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono">
              {gaps?.missingPhotoClicks ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Excavator Views
            </span>
            <span className="text-lg font-extrabold text-blue-700 font-mono">
              {gaps?.excavatorViews ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Excavator Searches
            </span>
            <span className="text-lg font-extrabold text-indigo-700 font-mono">
              {gaps?.excavatorSearches ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Excavator Banner WA
            </span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono">
              {gaps?.excavatorBannerClicks ?? 0}
            </span>
          </div>
        </div>

        {gaps?.topGapProducts && gaps.topGapProducts.length > 0 ? (
          <>
            {/* Mobile Cards (< 768px) */}
            <div className="block md:hidden space-y-2.5">
              {gaps.topGapProducts.map((g) => (
                <div
                  key={g.slug}
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{g.title}</div>
                      <div className="text-[11px] font-mono text-slate-500 break-all">
                        {g.category} • {g.part_number || '-'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold shrink-0 font-mono">
                      {g.impressions} imp
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Views</span>
                      <span className="font-bold text-slate-800 font-mono">{g.views}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Photo Clicks</span>
                      <span className="font-bold text-emerald-700 font-mono">{g.clicks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Enquiries</span>
                      <span className="font-bold text-blue-700 font-mono">{g.enquire_clicks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Imageless SKU</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Part #</th>
                    <th className="py-2.5 px-4 text-center">Placeholder Impressions</th>
                    <th className="py-2.5 px-4 text-center">Photo CTA Clicks</th>
                    <th className="py-2.5 px-4 text-center">Views</th>
                    <th className="py-2.5 px-4 text-right">Enquiries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gaps.topGapProducts.map((g) => (
                    <tr key={g.slug} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {g.title}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{g.category}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {g.part_number || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                        {g.impressions}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-emerald-700 font-semibold">
                        {g.clicks}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-700">{g.views}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                        {g.enquire_clicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            No missing-photo placeholder impressions recorded in this period yet.
          </div>
        )}
      </div>

      {/* 5D. SITE-WIDE PRODUCT ENGAGEMENT & RECOMMENDATION LIFT (`BI-05`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🔬 Product Detail Engagement &amp; Recommendation Lift (BI-05)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Image zoom lightbox usage, spec accordion expands, model hub hops, and related-part conversions
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {engagement?.relatedAssistRate ?? 0}% assist rate
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Zoom Opens</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {engagement?.zoomOpens ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">
              {engagement?.zoomCloses ?? 0} closed
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Avg Zoom Time</span>
            <span className="text-lg font-extrabold text-amber-700 font-mono">
              {engagement?.avgZoomDurationMs
                ? `${(engagement.avgZoomDurationMs / 1000).toFixed(1)}s`
                : '0.0s'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Spec Toggles</span>
            <span className="text-lg font-extrabold text-blue-700 font-mono">
              {engagement?.specToggles ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Model Hub Nav
            </span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {engagement?.modelHubNavClicks ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Related Clicks
            </span>
            <span className="text-lg font-extrabold text-indigo-700 font-mono">
              {engagement?.relatedClicks ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Assisted RFQs
            </span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono">
              {engagement?.relatedAssistedEnquiries ?? 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Zoomed Products */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Top Zoomed Products
            </h4>
            {engagement?.topZoomedProducts && engagement.topZoomedProducts.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {engagement.topZoomedProducts.map((z) => (
                    <div
                      key={z.productSlug}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {z.productTitle || z.productSlug}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          Avg {(z.avgDurationMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-700 shrink-0">
                        {z.opens} opens
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Opens</th>
                        <th className="py-2 px-3 text-right">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {engagement.topZoomedProducts.map((z) => (
                        <tr key={z.productSlug}>
                          <td className="py-2 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                            {z.productTitle || z.productSlug}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">{z.opens}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {(z.avgDurationMs / 1000).toFixed(1)}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No product zoom sessions recorded yet.
              </p>
            )}
          </div>

          {/* Top Related Product Transitions */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Top Related Cross-Sell Transitions
            </h4>
            {engagement?.topRelatedTransitions && engagement.topRelatedTransitions.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {engagement.topRelatedTransitions.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1"
                    >
                      <div className="font-mono text-[11px] font-bold text-slate-900 break-all">
                        {t.sourceProductSlug} → {t.targetProductSlug}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="truncate">{t.targetTitle}</span>
                        <span className="font-mono font-bold text-emerald-700 shrink-0">
                          {t.clicks}c · {t.assistedEnquiries} RFQ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Transition</th>
                        <th className="py-2 px-3 text-center">Clicks</th>
                        <th className="py-2 px-3 text-right">Assisted RFQs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {engagement.topRelatedTransitions.map((t, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-800 max-w-[220px] truncate">
                            {t.sourceProductSlug} → {t.targetProductSlug}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">{t.clicks}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {t.assistedEnquiries}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No related-product transitions recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
