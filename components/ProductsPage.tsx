'use client'

import { useState, useEffect, useRef } from 'react'
import { CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { getProductUrlSlug } from '@/lib/utils'

export interface Product {
  slug: string
  title: string
  category: string;
  brand?: string | string[];
  part_number?: string
  image: string
  content: string
  oemRef?: string
  price?: string
  availability?: 'In Stock' | 'Limited' | 'Out of Stock'
  condition?: 'New' | 'Refurbished' | 'Used'
  priority?: number | string
}

interface ProductsPageProps {
  initialCategory?: string
  products: Product[]
  selectedProductSlug?: string
}

// Helper function to format brand for display
function formatBrand(brand?: string | string[]): string {
  if (!brand) return '';
  if (Array.isArray(brand)) {
    return brand.join(', ');
  }
  return brand;
}

export default function ProductsPage({ initialCategory = 'loader', products, selectedProductSlug }: ProductsPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // Use state for category, initialized from prop or URL
  const [category, setCategory] = useState(initialCategory)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('all')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // Sync with URL params if they change
  useEffect(() => {
    const catParam = searchParams.get('category')
    if (catParam && catParam !== category) {
      setCategory(catParam)
    }
  }, [searchParams])

  // Scroll to selected product when accessed via individual URL
  useEffect(() => {
    if (selectedProductSlug && productRefs.current[selectedProductSlug]) {
      const timer = setTimeout(() => {
        productRefs.current[selectedProductSlug]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 300) // Small delay to ensure rendering is complete
      
      return () => clearTimeout(timer)
    }
  }, [selectedProductSlug])

  const handleCategoryClick = (newCategory: string) => {
    setCategory(newCategory)
    // Update URL without full reload
    router.push(`/products?category=${newCategory}`, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Get current category details from constants
  const currentCategory = CATEGORIES.find(cat => cat.id === category) || CATEGORIES[0]
  const categoryName = currentCategory.name

  const filteredAndSortedProducts = products
    .filter(product => {
      let productCategoryMatch = false;
      if (category === 'grader') productCategoryMatch = product.category === 'Motor Grader' || product.category === 'Grader';
      else if (category === 'loader') productCategoryMatch = product.category === 'Loader';
      else if (category === 'excavator') productCategoryMatch = product.category === 'Excavator';
      else productCategoryMatch = true; 

      if (!productCategoryMatch) {
          productCategoryMatch = product.category.toLowerCase().includes(category.toLowerCase());
      }

      // Create a searchable string containing all relevant fields
      const searchableText = [
        product.title,
        Array.isArray(product.brand) ? product.brand.join(' ') : product.brand,
        product.part_number,
        product.oemRef,
        product.content
      ].filter(Boolean).join(' ').toLowerCase();

      // Split search term into words and check if ALL words are present in the searchable text
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => searchableText.includes(word));
      
      const matchesAvailability = filterAvailability === 'all' || 
                                (product.availability || 'In Stock') === filterAvailability

      return productCategoryMatch && matchesSearch && matchesAvailability
    })
    .sort((a, b) => {
      // Sort by priority first (lower numbers first), then alphabetically
      // Treat empty string, null, undefined, or non-numeric values as 999
      const getPriority = (p: number | string | undefined): number => {
        if (p === "" || p == null) return 999;
        if (typeof p === 'string') {
          const num = parseInt(p, 10);
          return isNaN(num) ? 999 : num;
        }
        return p;
      };
      
      const priorityA = getPriority(a.priority);
      const priorityB = getPriority(b.priority);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return a.title.localeCompare(b.title);
    })

  const getAvailabilityBadgeClass = (availability: string = 'In Stock') => {
    switch (availability) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Limited': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const getConditionBadgeClass = (condition: string = 'New') => {
    switch (condition) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Refurbished': return 'bg-purple-100 text-purple-800';
      case 'Used': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const handleProductEnquire = (productName: string, partNumber?: string) => {
    const phoneNumber = "+918334887009" // Replace with actual number
    const message = `Hi, I am interested in ${productName}${partNumber ? ` (Part #: ${partNumber})` : ''}. Please provide more details.`
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="py-12 md:py-20 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Header Section - Subcategories removed */}

          <div className="mb-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6 animate-bounce-in">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight animate-slide-up">
                {categoryName} 
              </h2>
              <div className="w-20 h-1 bg-amber-500 mx-auto mb-6 rounded-full"></div>
              
            </div>
          </div>

          {/* Filters, Search and Category Switcher */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-12 border border-gray-100 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              {/* Search Section */}
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by name or part number..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 font-medium text-sm">Switch Category:</span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        category === cat.id
                          ? 'bg-amber-600 text-white shadow-md border border-amber-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Excavator Category Message */}
          {category === 'excavator' && (
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
                  <h3 className="text-lg font-semibold text-amber-800 mb-1">We're Currently Updating Our Excavator Products</h3>
                  <p className="text-amber-700">We're working on adding more excavator spare parts to our catalog. Please reach out to us directly for any excavator parts requirements.</p>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href="https://wa.me/+918334887009?text=Hi%2C%20I%20am%20looking%20for%20excavator%20spare%20parts.%20Please%20assist%20me."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Contact Us on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product, index) => (
                <div
                  key={product.slug}
                  ref={(el) => { productRefs.current[product.slug] = el }}
                  className={`relative bg-white rounded-xl overflow-hidden flex flex-col border transition-all duration-300 hover:shadow-xl animate-fade-in group ${
                    selectedProductSlug === product.slug
                      ? 'border-amber-500 border-2 shadow-xl ring-2 ring-amber-300'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                >
                  {/* Stretched Link for the entire card */}
                  <Link 
                    href={`/products/${product.category === 'Motor Grader' || product.category === 'Grader' ? 'grader' : product.category.toLowerCase()}/${getProductUrlSlug(product)}`} 
                    className="absolute inset-0 z-0"
                    aria-label={`View details for ${product.title}`}
                  />
                  
                  <div className="relative w-full h-64 bg-gray-50 overflow-hidden">
                    {product.image ? (
                      <div className="block w-full h-full">
                        <img
                          src={product.image}
                          alt={`${formatBrand(product.brand) ? formatBrand(product.brand) + ' ' : ''}${product.title}${product.part_number ? ' - Part No: ' + product.part_number : ''}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col pointer-events-none">
                    {formatBrand(product.brand) && (
                        <div className="text-amber-600 text-xs font-bold tracking-wider uppercase mb-1">
                            {formatBrand(product.brand)}
                        </div>
                    )}
                    <div className="group-hover:text-amber-600 transition-colors">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{product.title}</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-y-1 gap-x-4 mb-4 text-sm text-gray-500">
                        {product.oemRef && (
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700">Ref:</span>
                                <span className="font-mono">{product.oemRef}</span>
                            </div>
                        )}
                        {product.part_number && (
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-800 text-base">Part No. - </span>
                                <span className="text-base">{product.part_number}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-gray-600 text-sm flex-grow mb-6 line-clamp-3 leading-relaxed">{product.content}</p>
                    
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault(); // Prevent link click
                          handleProductEnquire(product.title, product.part_number);
                      }}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors duration-300 shadow-sm hover:shadow-md mt-auto flex items-center justify-center gap-2 pointer-events-auto relative z-10"
                    >
                      <span>Enquire Now</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-gray-500">We couldn't find any products matching your criteria.</p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterAvailability('all');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


