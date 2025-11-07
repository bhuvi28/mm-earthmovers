'use client'

interface ComingSoonProps {
  categoryName: string
  onContactClick: () => void
  onBackToCategories: () => void
}

export default function ComingSoon({ categoryName, onContactClick, onBackToCategories }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-gray-50 pt-24 pb-16">
      <div className="container mx-auto px-6">
        {/* Back Button */}
        <button
          onClick={onBackToCategories}
          className="group flex items-center text-gray-600 hover:text-amber-600 transition-colors duration-200 mb-8"
        >
          <svg 
            className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </button>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated Icon */}
          <div className="mb-8 animate-bounce-in">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-2xl mb-6">
              <svg 
                className="w-16 h-16 text-white animate-pulse" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-slide-up">
            <span className="text-amber-600">{categoryName}</span>
            <br />
            <span className="text-3xl md:text-4xl">Coming Soon!</span>
          </h1>

          {/* Witty Message */}
          <div className="space-y-4 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-xl md:text-2xl text-gray-700 font-medium">
              🚧 We're busy wrenching away on this section! 🔧
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our digital mechanics are working overtime to bring you the best {categoryName.toLowerCase()} catalog. 
              In the meantime, we're still here to help with all your parts needs!
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="text-4xl mb-3">📞</div>
              <h3 className="font-bold text-gray-900 mb-2">Direct Support</h3>
              <p className="text-sm text-gray-600">Call us for immediate assistance</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Quick Response</h3>
              <p className="text-sm text-gray-600">We reply within 2 hours</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-gray-900 mb-2">Expert Advice</h3>
              <p className="text-sm text-gray-600">Get personalized recommendations</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={onContactClick}
              className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
              Contact Us for Your Needs
              <svg 
                className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <a
              href="tel:+918334887009"
              className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full border-2 border-gray-300 hover:border-amber-500 hover:bg-amber-50 transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
                />
              </svg>
              Call Now
            </a>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-white rounded-2xl shadow-md border border-gray-200 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <p className="text-gray-700 mb-4">
              <span className="font-bold text-amber-600">Pro Tip:</span> While our online catalog is being built, 
              our team has access to all parts. Just tell us what you need!
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Genuine Parts
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Fast Delivery
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Expert Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
