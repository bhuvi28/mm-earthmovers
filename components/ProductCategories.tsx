'use client'

import { CATEGORIES } from '@/lib/constants'
import Link from 'next/link'

export default function ProductCategories() {
  // Map icons from string to JSX if needed, or just update constants to have JSX if possible (but constants.ts is .ts not .tsx usually, but I made it .ts so JSX might not work if I didn't use .tsx)
  // Wait, I made lib/constants.ts as .ts.
  // I should check if I can put JSX in .ts file. No, needs .tsx.
  // So I should probably just map the icon string to the SVG here.
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'loader-icon':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      case 'grader-icon':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1014.12 11.88l-4.242 4.242z" />
          </svg>
        )
      case 'excavator-icon':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const categories = CATEGORIES.map(cat => ({
    ...cat,
    icon: getIcon(cat.icon)
  }))

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
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border border-gray-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              <div className="p-8 md:p-10 flex flex-col items-center text-center h-full">
                <div className="mb-6 p-4 bg-gray-50 rounded-full group-hover:bg-white group-hover:shadow-md transition-all duration-300 text-gray-700 group-hover:text-amber-600">
                  {category.icon}
                </div>
                
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
                
                <div className="mt-6 flex items-center text-amber-600 font-semibold group-hover:translate-x-1 transition-transform">
                  View Products 
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
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