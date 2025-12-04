'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export interface Product {
  slug: string
  title: string
  category: string;
  brand?: string;
  part_number?: string
  image: string
  content: string
  oemRef?: string
  price?: string
  availability?: 'In Stock' | 'Limited' | 'Out of Stock'
  condition?: 'New' | 'Refurbished' | 'Used'
  priority?: number
}

interface ProductsPageProps {
  initialCategory?: string
  products: Product[]
  selectedProductSlug?: string
}

export default function ProductsPage({ initialCategory = 'loader', products, selectedProductSlug }: ProductsPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
        product.brand,
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
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      
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
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center text-amber-600 hover:text-amber-700 font-medium transition-colors duration-200 group"
                >
                  <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Home
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-medium">{categoryName}</span>
              </div>

              {/* Category Switcher */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">Switch Category:</span>
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
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
            
            {/* Category Description */}
            {currentCategory?.description && (
              <p className="text-gray-600 max-w-3xl mb-6">
                {currentCategory.description}
              </p>
            )}
            
            {/* Subcategories removed */}
          </div>

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
              <p className="text-gray-600 text-lg max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Explore our comprehensive selection of high-quality components for {categoryName.toLowerCase()}.
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-12 border border-gray-100 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="max-w-2xl mx-auto">
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
          </div>

          {/* Product Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product, index) => (
                <div
                  key={product.slug}
                  className="bg-white rounded-xl overflow-hidden flex flex-col border border-gray-200 hover:border-amber-300 transition-all duration-300 hover:shadow-xl animate-fade-in group"
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                >
                  <div className="relative w-full h-64 bg-gray-50 overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(product.image)}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={`${product.brand ? product.brand + ' ' : ''}${product.title}${product.part_number ? ' - Part No: ' + product.part_number : ''}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <span className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </span>
                    </div>

                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    {product.brand && (
                        <div className="text-amber-600 text-xs font-bold tracking-wider uppercase mb-1">
                            {product.brand}
                        </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{product.title}</h3>
                    
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
                          handleProductEnquire(product.title, product.part_number);
                      }}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors duration-300 shadow-sm hover:shadow-md mt-auto flex items-center justify-center gap-2"
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


      {/* Image Lightbox */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setSelectedImage(null)}
        >
            <button 
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                onClick={() => setSelectedImage(null)}
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <img 
                src={selectedImage} 
                alt="Product Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </div>
  )
}


