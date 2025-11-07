'use client'

import HeroCarousel from './HeroCarousel'

export default function Hero() {
  // Add your carousel images here
  const carouselImages = [
    '/loader.jpg',
    '/loader-1.jpeg',
    // '/hero-3.jpg',
  ]

  return (
    <section id="home" className="page-section">
      <div id="hero-container" className="relative min-h-screen w-full overflow-hidden bg-white">
        <div className="container mx-auto px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">
            
            {/* Content Section - Left Side */}
            <div className="order-2 lg:order-1 space-y-8">
              <div className="space-y-4">
                <div className="inline-block">
                  <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-4 py-2 rounded-full">
                    Premium Quality Parts
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-tight">
                  Powering Your Progress
                </h1>
                <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-amber-600 leading-tight">
                  Premium Parts for Earthmoving Excellence
                </h2>
              </div>
              
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Your trusted source for high-quality, genuine earthmover components. We supply parts for excavators, loaders, graders, and more.
              </p>

              {/* Key Features */}
              {/* <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Genuine Parts</h3>
                    <p className="text-sm text-gray-600">OEM quality guaranteed</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
                    <p className="text-sm text-gray-600">Quick turnaround time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Best Prices</h3>
                    <p className="text-sm text-gray-600">Competitive pricing</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Expert Support</h3>
                    <p className="text-sm text-gray-600">Technical assistance</p>
                  </div>
                </div>
              </div> */}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a 
                  href="#products-overview" 
                  className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span>Explore Products</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <a 
                  href="#contact" 
                  className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 hover:border-amber-600 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
                >
                  <span>Contact Us</span>
                </a>
              </div>
            </div>

            {/* Carousel Section - Right Side */}
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <HeroCarousel images={carouselImages} />
                <div className="absolute inset-0 ring-1 ring-inset ring-gray-900/10 rounded-2xl pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
