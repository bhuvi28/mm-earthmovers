'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  oemRef: string
  description: string
  image: string
  categories: string[]
  price: string
  availability: 'In Stock' | 'Limited' | 'Out of Stock'
  condition: 'New' | 'Refurbished' | 'Used'
  specifications?: Record<string, string>
  features?: string[]
  addedDate?: string
  isActive?: boolean
}

interface ProductsPageProps {
  category: string
  categoryName: string
  onBackToHome: () => void
  onBackToCategories: () => void
  onCategoryClick: (category: string, categoryName: string) => void
  onProductEnquire: (productName: string, oemRef: string) => void
}

export default function ProductsPage({ category, categoryName, onBackToHome, onBackToCategories, onCategoryClick, onProductEnquire }: ProductsPageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterAvailability, setFilterAvailability] = useState('all')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{id: string, name: string, icon: string}[]>([])
  const [loading, setLoading] = useState(true)

  // Load products and categories from JSON
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/products.json', {
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        const activeProducts = data.products.filter((product: Product) => product.isActive !== false)
        setProducts(activeProducts)
        setCategories(data.categories)
      } catch (error) {
        console.error('Error loading products:', error)
        // Fallback data if JSON fails to load
        const fallbackProducts = [
          {
            id: 'fallback-1',
            name: 'Sample Hydraulic Seal',
            oemRef: 'SAMPLE-001',
            description: 'Sample product for demonstration',
            image: 'https://placehold.co/600x400/252f3f/F59E0B/png?text=Sample+Product',
            categories: ['hydraulic'],
            price: '$99.99',
            availability: 'In Stock' as const,
            condition: 'New' as const,
            isActive: true
          }
        ]
        const fallbackCategories = [
          { id: 'loader', name: 'Loader Parts', icon: '🚜' },
          { id: 'grader', name: 'Motor Grader Parts', icon: '🛣️' },
          { id: 'hydraulic', name: 'Hydraulic Components', icon: '⚙️' },
          { id: 'wear', name: 'Wear Items', icon: '🔧' },
          { id: 'attachments', name: 'Attachments', icon: '🔗' }
        ]
        setProducts(fallbackProducts)
        setCategories(fallbackCategories)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesCategory = product.categories.includes(category)
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.oemRef.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAvailability = filterAvailability === 'all' || 
                                 product.availability === filterAvailability
      
      
      return matchesCategory && matchesSearch && matchesAvailability
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'price-asc') {
        const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, "") || '0')
        const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, "") || '0')
        return priceA - priceB
      }
      if (sortBy === 'price-desc') {
        const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, "") || '0')
        const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, "") || '0')
        return priceB - priceA
      }
      return 0
    })

  const getAvailabilityBadgeClass = (availability: Product['availability']) => {
    switch (availability) {
      case 'In Stock': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'Limited': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'Out of Stock': return 'bg-red-500/20 text-red-400 border-red-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  }

  const getConditionBadgeClass = (condition: Product['condition']) => {
    switch (condition) {
      case 'New': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'Refurbished': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'Used': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  }

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg">Loading products...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToHome}
                className="flex items-center text-amber-500 hover:text-amber-400 font-semibold transition-colors duration-300 group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </button>
              <button
                onClick={onBackToCategories}
                className="flex items-center text-gray-400 hover:text-amber-400 font-semibold transition-colors duration-300 group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                All Categories
              </button>
            </div>

            {/* Category Switcher */}
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border-2 border-amber-500/30 shadow-lg shadow-amber-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-amber-300 text-lg font-bold">🔄 Switch Category:</span>
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onCategoryClick(cat.id, cat.name)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className={`px-6 py-3 rounded-xl text-base font-bold transition-all duration-300 hover:scale-105 shadow-lg ${
                        category === cat.id
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 shadow-amber-500/50 border-2 border-amber-400'
                          : 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 hover:text-white border-2 border-gray-600 hover:border-amber-500/70 shadow-gray-900/50'
                      }`}
                    >
                      <span className="mr-3 text-xl">{cat.icon}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-6 animate-bounce-in">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-4 leading-tight animate-slide-up">
              {categoryName} Parts
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Explore our comprehensive selection of high-quality components for {categoryName.toLowerCase()}.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-12 border border-gray-700/50 grid md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="md:col-span-1 lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">Search Products</label>
            <input
              type="text"
              id="search"
              placeholder="Search by name or OEM ref..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <select
              id="sort"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name (A-Z)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
            </select>
          </div>
          <div>
            <label htmlFor="availability" className="block text-sm font-medium text-gray-300 mb-2">Availability</label>
            <select
              id="availability"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
            >
              <option value="all">All</option>
              <option value="In Stock">In Stock</option>
              <option value="Limited">Limited Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredAndSortedProducts.length > 0 ? (
            filteredAndSortedProducts.map((product, index) => (
              <div
                key={product.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden flex flex-col border border-gray-700/50 hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-amber-500/10 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.05}s` }}
              >
                <div className="relative w-full h-48 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getAvailabilityBadgeClass(product.availability)}`}>
                      {product.availability}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getConditionBadgeClass(product.condition)}`}>
                      {product.condition}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-500 font-mono mb-3">{product.oemRef}</p>
                  <p className="text-gray-400 flex-grow mb-4 text-sm line-clamp-3">{product.description}</p>
                  {product.price && (
                    <p className="text-2xl font-bold text-amber-400 mb-4">{product.price}</p>
                  )}
                  <button
                    onClick={() => onProductEnquire(product.name, product.oemRef)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 mt-auto"
                  >
                    Enquire Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
              <p className="text-gray-400 text-lg mb-4">No products found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterAvailability('all');
                  setSortBy('name');
                }}
                className="text-amber-500 hover:text-amber-400 font-semibold"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
