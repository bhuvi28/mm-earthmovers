'use client'

import { CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import Image from 'next/image'

export default function ProductCategories() {

  return (
    <section id="products-overview" className="page-section py-20 md:py-28 bg-gray-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
        {/* <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div> */}
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        {/* <div className="absolute -bottom-8 left-20 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div> */}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our <span className="text-amber-600">Product Range</span>
          </h2>
          <div className="w-24 h-1.5 bg-amber-500 mx-auto rounded-full mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed">
            Specializing in high-quality spare parts for heavy earthmoving machinery. 
            Select a category below to explore our inventory.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border border-gray-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              <div className="flex flex-col h-full">
                {/* Image Section */}
                <div className="relative w-full h-56 overflow-hidden bg-gray-100">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-contain group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Content Section */}
                <div className="p-8 md:p-10 flex flex-col flex-grow text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                    {category.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-6 flex-grow">
                    {category.description}
                  </p>

                  <div className="w-full pt-6 border-t border-gray-100 mt-auto">
                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Available Brands</p>
                    <p className="text-gray-800 font-medium">{category.count}</p>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-center text-amber-600 font-semibold group-hover:translate-x-1 transition-transform">
                    View Products 
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-gray-400 mb-6">Can't find what you're looking for?</p>
          <a 
            href="#contact" 
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <span>Get Custom Quote</span>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}