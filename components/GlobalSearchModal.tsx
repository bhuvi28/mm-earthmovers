'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getTracker } from '@/lib/analytics/tracker'
import { formatPartNumbersForDisplay } from '@/lib/seo'
import ProductPlaceholderImage from '@/components/ProductPlaceholderImage'
import type { SearchProductItem } from '@/app/api/products/search/route'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

let cachedProducts: SearchProductItem[] | null = null

function normalizeString(str?: string): string {
  if (!str) return ''
  return str.toLowerCase().replace(/[\s\-_/.,()]/g, '')
}

function getCategorySlug(category?: string): 'loader' | 'grader' | 'excavator' {
  const c = (category || '').toLowerCase()
  if (c.includes('grader')) return 'grader'
  if (c.includes('excavator')) return 'excavator'
  return 'loader'
}

function getCategoryDisplayName(category?: string): string {
  const slug = getCategorySlug(category)
  if (slug === 'grader') return 'Motor Grader'
  if (slug === 'excavator') return 'Excavator'
  return 'Wheel Loader'
}

function SearchProductThumbnail({
  image,
  title,
  category,
}: {
  image?: string
  title: string
  category: string
}) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    return <ProductPlaceholderImage variant="thumbnail" category={category} title={title} />
  }

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white flex-shrink-0 overflow-hidden border border-gray-150 p-1 shadow-2xs group-hover:scale-[1.02] transition-transform flex items-center justify-center">
      <img
        src={image}
        alt={title}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain p-0.5"
        loading="lazy"
      />
    </div>
  )
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const [products, setProducts] = useState<SearchProductItem[]>(cachedProducts || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'loader' | 'grader' | 'excavator'>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  // Fetch search index once when modal is first opened
  useEffect(() => {
    if (!isOpen) return

    if (cachedProducts && cachedProducts.length > 0) {
      setProducts(cachedProducts)
      return
    }

    setIsLoading(true)
    fetch('/api/products/search')
      .then((res) => res.json())
      .then((data: SearchProductItem[]) => {
        if (Array.isArray(data)) {
          cachedProducts = data
          setProducts(data)
        }
      })
      .catch((err) => {
        console.error('Failed to load search catalog:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen])

  // Focus input & lock body scroll when open; track modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      const tracker = getTracker()
      tracker.track('click', {
        elementText: 'Open Search Modal',
        elementTag: 'modal',
        metadata: {
          action: 'search_modal_open',
          source: 'global_search_modal',
        },
      })
    } else {
      document.body.style.overflow = ''
      setSearchTerm('')
      setSelectedIndex(0)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Filter products using delimiter-tolerant matching
  const filteredProducts = useMemo(() => {
    const rawQ = searchTerm.trim().toLowerCase()
    const normQ = normalizeString(rawQ)

    let list = products
    if (selectedCategory !== 'all') {
      list = list.filter((p) => getCategorySlug(p.category) === selectedCategory)
    }

    if (!rawQ || !normQ) {
      // When not searching: show all products in selected category, or top 15 featured if 'all'
      return selectedCategory === 'all' ? list.slice(0, 15) : list
    }

    const scored = list
      .map((p) => {
        const titleClean = (p.title || '').toLowerCase()
        const titleNorm = normalizeString(p.title)
        const partClean = (p.part_number || '').toLowerCase()
        const partNorm = normalizeString(p.part_number)
        const brandClean = Array.isArray(p.brand) ? p.brand.join(' ').toLowerCase() : (p.brand || '').toLowerCase()
        const categoryClean = (p.category || '').toLowerCase()

        // 1. Part Number Exact / Normalized Match (Highest Relevance)
        if (partNorm && (partNorm === normQ || partNorm.includes(normQ))) {
          return { product: p, score: 100 }
        }

        // 2. Exact Title Match
        if (titleClean.includes(rawQ)) {
          return { product: p, score: 85 }
        }

        // 3. Normalized Title Match
        if (titleNorm.includes(normQ)) {
          return { product: p, score: 75 }
        }

        // 4. Token match across all fields
        const tokens = rawQ.split(/\s+/).filter(Boolean)
        const matchesAll = tokens.every((token) => {
          const tNorm = normalizeString(token)
          return (
            titleClean.includes(token) ||
            titleNorm.includes(tNorm) ||
            partClean.includes(token) ||
            partNorm.includes(tNorm) ||
            brandClean.includes(token) ||
            categoryClean.includes(token)
          )
        })

        if (matchesAll) {
          return { product: p, score: 50 }
        }

        return { product: p, score: 0 }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)

    return scored
  }, [products, searchTerm, selectedCategory])

  // Debounced Telemetry for Search Tracking (including zero results)
  useEffect(() => {
    const query = searchTerm.trim()
    if (!query) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      const tracker = getTracker()
      tracker.trackSearch(query, filteredProducts.length, selectedCategory !== 'all' ? selectedCategory : undefined)
    }, 700)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, filteredProducts.length, selectedCategory])

  // Reset selectedIndex when results change & scroll to top
  useEffect(() => {
    setSelectedIndex(0)
    resultsContainerRef.current?.scrollTo({ top: 0 })
  }, [filteredProducts])

  const handleClose = (reason: 'backdrop' | 'esc_key' | 'close_button' | 'product_select' = 'close_button') => {
    if (reason !== 'product_select') {
      const tracker = getTracker()
      tracker.track('click', {
        elementText: 'Close Search Modal',
        elementTag: 'modal',
        metadata: {
          action: 'search_modal_close',
          reason,
          queryAtClose: searchTerm.trim() || undefined,
          resultsCount: filteredProducts.length,
          categoryFilter: selectedCategory,
        },
      })
    }
    onClose()
  }

  // Keyboard navigation (clamped to prevent disorienting jumps)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(filteredProducts.length - 1, prev + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredProducts.length > 0 && filteredProducts[selectedIndex]) {
        const item = filteredProducts[selectedIndex]
        handleSelectProduct(item, selectedIndex)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleClose('esc_key')
    }
  }

  const handleSelectProduct = (product: SearchProductItem, rank?: number) => {
    const catSlug = getCategorySlug(product.category)
    const targetUrl = `/products/${catSlug}/${product.urlSlug}`
    const brandStr = Array.isArray(product.brand) ? product.brand.join(', ') : (product.brand || '')

    const tracker = getTracker()
    tracker.track('click', {
      elementText: `Search Result: ${product.title}`,
      elementTarget: targetUrl,
      elementTag: 'button',
      metadata: {
        action: 'search_modal_select_product',
        source: 'global_search_modal',
        searchQuery: searchTerm.trim() || undefined,
        productTitle: product.title,
        partNumber: product.part_number,
        productSlug: product.urlSlug,
        category: catSlug,
        brand: brandStr,
        resultRank: typeof rank === 'number' ? rank + 1 : undefined,
        totalResults: filteredProducts.length,
      },
    })
    // Immediately flush keepalive request so it dispatches before route navigation
    tracker.flush()

    handleClose('product_select')
    router.push(targetUrl)
  }

  // Keep active item comfortably in view inside the results container (instant response, no lag)
  useEffect(() => {
    const container = resultsContainerRef.current
    if (!container) return

    const activeEl = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null
    if (!activeEl) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const buffer = 8

    if (activeRect.top < containerRect.top + buffer) {
      container.scrollTop += activeRect.top - containerRect.top - buffer
    } else if (activeRect.bottom > containerRect.bottom - buffer) {
      container.scrollTop += activeRect.bottom - containerRect.bottom + buffer
    }
  }, [selectedIndex])

  // Only update selection if mouse actually moves (prevents scrolling under cursor from overriding keyboard)
  const handleMouseMove = (idx: number, e: React.MouseEvent) => {
    if (
      Math.abs(e.clientX - lastMousePosRef.current.x) > 2 ||
      Math.abs(e.clientY - lastMousePosRef.current.y) > 2
    ) {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      if (selectedIndex !== idx) {
        setSelectedIndex(idx)
      }
    }
  }

  if (!isOpen) return null

  const isSearching = searchTerm.trim().length > 0
  const hasZeroResults = filteredProducts.length === 0
  const isExcavatorTab = selectedCategory === 'excavator'

  const zeroResultWhatsAppUrl = `https://wa.me/+918334887009?text=${encodeURIComponent(
    searchTerm.trim()
      ? `Hi MM Earthmovers, I searched for part "${searchTerm.trim()}" on your website. Do you have this part or can you arrange it?`
      : isExcavatorTab
      ? 'Hi MM Earthmovers, I am looking for excavator spare parts. Please share pricing and availability.'
      : 'Hi MM Earthmovers, I am looking for machinery spare parts. Please share pricing and availability.'
  )}`

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Global Part Search"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-md transition-opacity animate-fade-in" 
        onClick={() => handleClose('backdrop')}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 border border-gray-100 ring-1 ring-black/5 mt-10 sm:mt-16 md:mt-20 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (Borderless, Clean Command Palette) */}
        <div className="relative flex items-center px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 mr-3.5 flex-shrink-0 shadow-2xs">
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search part #, name, or OEM (e.g. 522-2835, Charging Pump)..."
            className="w-full text-base sm:text-lg text-gray-900 placeholder-gray-400 bg-transparent border-0 border-none ring-0 focus:ring-0 focus:outline-none focus:border-none shadow-none outline-none p-0 font-medium tracking-tight"
            autoComplete="off"
            spellCheck="false"
          />

          {searchTerm && (
            <button
              onClick={() => {
                const tracker = getTracker()
                tracker.track('click', {
                  elementText: 'Clear Search Query',
                  elementTag: 'button',
                  metadata: {
                    action: 'search_clear_query',
                    clearedQuery: searchTerm.trim(),
                  },
                })
                setSearchTerm('')
                inputRef.current?.focus()
              }}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mr-2 cursor-pointer"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            onClick={() => handleClose('close_button')}
            className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs font-mono font-medium text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200/80 rounded-lg transition-colors cursor-pointer"
            aria-label="Close search (ESC)"
          >
            esc
          </button>
          <button
            onClick={() => handleClose('close_button')}
            className="sm:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Category Filters */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-gray-50/80 border-b border-gray-100 overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-gray-400 font-semibold mr-1.5 text-[11px] uppercase tracking-wider">
            Filter:
          </span>
          {(['all', 'loader', 'grader', 'excavator'] as const).map((cat) => {
            const isSelected = selectedCategory === cat
            const label = cat === 'all' ? 'All Parts' : cat === 'grader' ? 'Motor Grader' : cat.charAt(0).toUpperCase() + cat.slice(1)
            return (
              <button
                key={cat}
                onClick={() => {
                  if (selectedCategory !== cat) {
                    const tracker = getTracker()
                    tracker.track('click', {
                      elementText: `Search Filter: ${label}`,
                      elementTag: 'filter',
                      metadata: {
                        action: 'search_category_filter',
                        category: cat,
                        previousCategory: selectedCategory,
                        query: searchTerm.trim() || undefined,
                      },
                    })
                    setSelectedCategory(cat)
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200/70'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Section Header with Item Count */}
        <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <span>
            {isSearching 
              ? 'Search Results' 
              : selectedCategory === 'grader' 
              ? 'Motor Grader Parts' 
              : selectedCategory === 'loader' 
              ? 'Wheel Loader Parts' 
              : selectedCategory === 'excavator' 
              ? 'Excavator Parts' 
              : 'Featured & In-Demand Parts'}
          </span>
          {!isLoading && filteredProducts.length > 0 && (
            <span className="text-[11px] font-normal text-gray-400 lowercase">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'part' : 'parts'}
            </span>
          )}
        </div>

        {/* Results Container with Sleek Thin Scrollbar */}
        <div 
          ref={resultsContainerRef}
          className="relative max-h-[58vh] sm:max-h-[440px] overflow-y-auto px-2 sm:px-3 pb-2 pt-1 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:#e5e7eb_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {isLoading && (
            <div className="py-14 text-center text-gray-400">
              <div className="inline-block w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium text-gray-500">Loading catalog...</p>
            </div>
          )}

          {!isLoading && isExcavatorTab && filteredProducts.length === 0 && (
            /* --- Dedicated Excavator Catalog Message Matching ProductsPage --- */
            <div className="py-8 px-4 sm:px-6 text-center my-2 rounded-2xl bg-amber-50/50 border border-amber-200/80 animate-fade-in">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-2xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                {searchTerm.trim() 
                  ? `Excavator Part "${searchTerm.trim()}" Available on Request` 
                  : 'Updating Our Excavator Catalog'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-5 leading-relaxed">
                We supply genuine &amp; aftermarket excavator parts for Komatsu, Tata Hitachi, CAT, and Hyundai within <strong>24–48 hours</strong>. Contact our sales desk on WhatsApp for immediate pricing &amp; availability.
              </p>

              <a
                href={zeroResultWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-track="search_excavator_whatsapp"
                onClick={() => {
                  const tracker = getTracker()
                  tracker.track('click', {
                    elementText: `WhatsApp Excavator Request: ${searchTerm.trim() || 'General'}`,
                    elementTarget: zeroResultWhatsAppUrl,
                    elementTag: 'a',
                    metadata: {
                      action: 'search_excavator_whatsapp_click',
                      category: 'excavator',
                      query: searchTerm.trim(),
                    },
                  })
                  tracker.flush()
                  handleClose('close_button')
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Ask for Excavator Parts on WhatsApp</span>
              </a>
            </div>
          )}

          {!isLoading && !isExcavatorTab && hasZeroResults && (
            /* --- Zero-Result Commercial Sourcing Fallback --- */
            <div className="py-8 px-4 sm:px-6 text-center my-2 rounded-2xl bg-amber-50/40 border border-amber-200/60 animate-fade-in">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100/70 flex items-center justify-center text-amber-700 shadow-2xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                Part not found in online catalog?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-5 leading-relaxed">
                We stock and source thousands of unlisted OEM &amp; replacement spare parts for loaders, graders, and excavators within <strong>24–48 hours</strong>.
              </p>

              <a
                href={zeroResultWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-track="search_zero_result_whatsapp"
                data-search-query={searchTerm.trim()}
                onClick={() => {
                  const tracker = getTracker()
                  tracker.track('click', {
                    elementText: `WhatsApp Zero Result: ${searchTerm.trim()}`,
                    elementTarget: zeroResultWhatsAppUrl,
                    elementTag: 'a',
                    metadata: {
                      action: 'search_zero_result_whatsapp_click',
                      query: searchTerm.trim(),
                      zeroResults: true,
                    },
                  })
                  tracker.flush()
                  handleClose('close_button')
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Ask Availability for {searchTerm.trim() ? `"${searchTerm.trim()}"` : 'Your Part'}</span>
              </a>
            </div>
          )}

          {!isLoading && filteredProducts.length > 0 && (
            <div className="space-y-1">
              {filteredProducts.map((product, idx) => {
                const isSelected = idx === selectedIndex
                const brandStr = Array.isArray(product.brand) ? product.brand.join(', ') : product.brand
                const catSlug = getCategorySlug(product.category)
                const catColor = 
                  catSlug === 'grader' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200/60' 
                    : catSlug === 'excavator' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                    : 'bg-amber-50 text-amber-700 border-amber-200/60'

                return (
                  <div
                    key={`${product.category}-${product.slug}`}
                    data-index={idx}
                    data-track="search_result_item"
                    data-product-title={product.title}
                    data-part-number={product.part_number || ''}
                    data-category={catSlug}
                    data-product-slug={product.urlSlug}
                    data-search-rank={idx + 1}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProduct(product, idx)}
                    onMouseMove={(e) => handleMouseMove(idx, e)}
                    className={`group flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-50/50 border-amber-300/80 shadow-xs'
                        : 'bg-white hover:bg-gray-50/90 border-transparent hover:border-gray-150'
                    }`}
                  >
                    {/* Product Image Thumbnail with Coming Soon Fallback */}
                    <SearchProductThumbnail
                      image={product.image}
                      title={product.title}
                      category={product.category}
                    />

                    {/* Product Details */}
                    <div className="flex-grow min-w-0">
                      {/* Title & Category Badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-amber-600 transition-colors">
                          {product.title}
                        </span>
                        <span className={`capitalize text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md border ${catColor} flex-shrink-0`}>
                          {getCategoryDisplayName(product.category)}
                        </span>
                      </div>

                      {/* Part Number & Machine Compatibility */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        {product.part_number && (
                          <span className="font-mono text-gray-700 bg-gray-100/90 border border-gray-200/80 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            Part #{formatPartNumbersForDisplay(product.part_number)}
                          </span>
                        )}
                        {brandStr && (
                          <span className="text-gray-500 truncate text-xs">
                            for {brandStr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex-shrink-0 text-gray-300 group-hover:text-amber-600 pr-1 transition-colors">
                      <svg 
                        className={`w-5 h-5 transition-transform ${isSelected ? 'text-amber-600 translate-x-1' : 'group-hover:translate-x-1'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 bg-gray-50/90 border-t border-gray-100 text-xs text-gray-500 hidden sm:flex items-center justify-between rounded-b-2xl">
          <div className="flex items-center gap-3.5 text-gray-400">
            <span className="flex items-center gap-1.5"><kbd className="font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded text-[11px] border border-gray-200 shadow-2xs">↑</kbd><kbd className="font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded text-[11px] border border-gray-200 shadow-2xs">↓</kbd> navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded text-[11px] border border-gray-200 shadow-2xs">↵</kbd> select</span>
            <span className="flex items-center gap-1.5"><kbd className="font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded text-[11px] border border-gray-200 shadow-2xs">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
