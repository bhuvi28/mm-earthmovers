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

  // Available categories for switching
  const categories = [
    { id: 'loader', name: 'Loader Parts', icon: '🚜' },
    { id: 'grader', name: 'Motor Grader Parts', icon: '🛣️' },
    { id: 'hydraulic', name: 'Hydraulic Components', icon: '⚙️' },
    { id: 'wear', name: 'Wear Items', icon: '🔧' },
    { id: 'attachments', name: 'Attachments', icon: '🔗' }
  ]

  // Enhanced product data with more details
  const products: Product[] = [
    {
      id: '1',
      name: 'Hydraulic Cylinder Seal Kit',
      oemRef: 'HYD-SEAL-001',
      description: 'Complete seal kit for hydraulic cylinders. Includes all necessary seals, O-rings, and backup rings for optimal performance.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['hydraulic'],
      price: '$89.99',
      availability: 'In Stock',
      condition: 'New'
    },
    {
      id: '2',
      name: 'Loader Bucket Teeth',
      oemRef: 'BUCKET-TEETH-002',
      description: 'Heavy-duty bucket teeth designed for maximum durability and penetration. Compatible with most loader models.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['loader', 'wear'],
      price: '$45.00',
      availability: 'In Stock',
      condition: 'New'
    },
    {
      id: '3',
      name: 'Motor Grader Blade',
      oemRef: 'GRADER-BLADE-003',
      description: 'High-quality motor grader blade with excellent cutting performance and long-lasting wear resistance.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['grader', 'wear'],
      price: '$299.99',
      availability: 'Limited',
      condition: 'New'
    },
    {
      id: '4',
      name: 'Hydraulic Pump Assembly',
      oemRef: 'PUMP-ASSY-004',
      description: 'Complete hydraulic pump assembly with all necessary components. Rebuilt to OEM specifications.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['hydraulic'],
      price: '$1,299.99',
      availability: 'In Stock',
      condition: 'Refurbished'
    },
    {
      id: '5',
      name: 'Track Link Assembly',
      oemRef: 'TRACK-LINK-005',
      description: 'Durable track link assembly for crawler loaders. Built to withstand heavy-duty applications.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['loader', 'attachments'],
      price: '$199.99',
      availability: 'In Stock',
      condition: 'New'
    },
    {
      id: '6',
      name: 'Control Valve Block',
      oemRef: 'VALVE-BLOCK-006',
      description: 'Precision control valve block for hydraulic systems. Ensures smooth operation and reliable performance.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
      categories: ['hydraulic'],
      price: '$459.99',
      availability: 'Out of Stock',
      condition: 'New'
    }
  ]

  const filteredProducts = products.filter(product => {
    const matchesCategory = product.categories.includes(category)
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.oemRef.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAvailability = filterAvailability === 'all' || 
                               product.availability.toLowerCase().replace(' ', '') === filterAvailability
    
    return matchesCategory && matchesSearch && matchesAvailability
  })

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'In Stock': return 'text-green-400 bg-green-500/20'
      case 'Limited': return 'text-yellow-400 bg-yellow-500/20'
      case 'Out of Stock': return 'text-red-400 bg-red-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'New': return 'text-blue-400 bg-blue-500/20'
      case 'Refurbished': return 'text-purple-400 bg-purple-500/20'
      case 'Used': return 'text-orange-400 bg-orange-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
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
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm font-semibold">Switch Category:</span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onCategoryClick(cat.id, cat.name)
                        // Scroll to top when switching categories
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-105 ${
                        category === cat.id
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 shadow-lg shadow-amber-500/25'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600 hover:border-amber-500/50'
                      }`}
                    >
                      <span className="mr-2 text-base">{cat.icon}</span>
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-slide-up">
              {categoryName} 
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Browse our comprehensive selection of {categoryName.toLowerCase()}. Click 'Enquire Now' to get in touch about any item.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search Products</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or OEM reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="availability">Availability</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Availability</label>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
              >
                <option value="all">All Products</option>
                <option value="instock">In Stock</option>
                <option value="limited">Limited Stock</option>
                <option value="outofstock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-600/50 hover:border-amber-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 animate-bounce-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                {/* Product Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAvailabilityColor(product.availability)}`}>
                      {product.availability}
                    </span>
                  </div>
                  
                  {/* Condition Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConditionColor(product.condition)}`}>
                      {product.condition}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors duration-300">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 font-mono">{product.oemRef}</p>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                  
                  {/* Price */}
                  {product.price && (
                    <div className="text-2xl font-bold text-amber-500 mb-4">
                      {product.price}
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <button 
                    onClick={() => onProductEnquire(product.name, product.oemRef)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 group-hover:shadow-lg"
                  >
                    Enquire Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Products Found</h3>
              <p className="text-gray-400 mb-6">Try adjusting your search criteria or filters</p>
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setFilterAvailability('all')
                }}
                className="px-6 py-3 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors duration-300"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50">
            <h3 className="text-2xl font-bold text-white mb-4">Can't Find What You're Looking For?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              We're constantly expanding our inventory. Contact us with your specific requirements and we'll help you find the right parts.
            </p>
            <button 
              onClick={() => {
                const contactSection = document.getElementById('contact')
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <span>Contact Us for Custom Quote</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}