export default function WhyChooseUs() {
  const features = [
    {
      title: 'Genuine Parts',
      description: 'We stock only authentic and high-quality replacement parts for maximum reliability and performance.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      stats: '100% Authentic'
    },
    {
      title: 'Wide Range',
      description: 'An extensive catalog covering all major models of loaders and graders from leading manufacturers.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      stats: '5000+ Parts'
    },
    {
      title: 'Fast Delivery',
      description: 'Efficient logistics and nationwide shipping to get your parts delivered quickly and minimize downtime.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h8a1 1 0 001-1zM22 9h-2a1 1 0 00-1 1v6a1 1 0 001 1h2v-2h-1v-2h1V9z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      stats: 'Minimal Downtime'
    },
    {
      title: 'Trusted By Contractors',
      description: 'We are the preferred parts supplier for construction and mining professionals across the country.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.176-5.97M15 21v-1a6 6 0 015.176-5.97m-5.176 5.97A2 2 0 0112 18.645a2 2 0 01-2.828 0" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-500',
      stats: '500+ Clients'
    }
  ]

  return (
    <section id="why-choose-us" className="page-section py-20 md:py-32 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-8 animate-bounce-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-slide-up">
            Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">MM Earthmovers?</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            We're not just a parts supplier – we're your trusted partner in keeping your heavy machinery running at peak performance
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 border border-gray-600/50 hover:border-amber-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 animate-bounce-in"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`} />
              
              {/* Icon Container */}
              <div className={`relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.gradient} p-5 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Stats Badge */}
                <div className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${feature.gradient} text-white rounded-full text-sm font-bold`}>
                  <span>{feature.stats}</span>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${feature.gradient}`}></div>
              </div>
              <div className="absolute bottom-4 left-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${feature.gradient}`}></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Stats Section */}
        <div className="mt-20 bg-gray-800/40 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-600/30 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-500 mb-2">100%</div>
              <div className="text-gray-400">Genuine Parts</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-500 mb-2">50K+</div>
              <div className="text-gray-400">Parts Delivered</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-500 mb-2">99%</div>
              <div className="text-gray-400">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-500 mb-2">24/7</div>
              <div className="text-gray-400">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}