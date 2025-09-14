'use client'

import HeroAnimation from './HeroAnimation'

export default function Hero() {
  return (
    <section id="home" className="page-section">
      <div id="hero-container" className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <HeroAnimation />
        <div className="absolute inset-0 flex items-center justify-center text-center z-10">
          <div className="max-w-3xl px-6 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 leading-tight mb-4 animate-slide-up">
              Reliable Parts for <span className="text-amber-600">Loaders, Motor Graders & Excavators</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Your trusted source for high-quality, genuine earthmover components.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-bounce-in">
              <a 
                href="#products-overview" 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-lg text-lg uppercase tracking-wider transition-colors duration-300"
              >
                Explore Products
              </a>
              <a 
                href="#contact" 
                className="bg-white text-gray-800 hover:bg-gray-100 border-2 border-amber-600 font-bold py-3 px-8 rounded-lg text-lg uppercase tracking-wider transition-colors duration-300"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
