export default function WhyChooseUs() {
  const features = [
    {
      title: 'Genuine Parts',
      description: 'We stock only authentic and high-quality replacement parts for maximum reliability and performance.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: '100% Authentic'
    },
    {
      title: 'Wide Range',
      description: 'An extensive catalog covering all major models of loaders and graders from leading manufacturers.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: '5000+ Parts'
    },
    {
      title: 'Fast Delivery',
      description: 'Efficient logistics and nationwide shipping to get your parts delivered quickly and minimize downtime.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h8a1 1 0 001-1zM22 9h-2a1 1 0 00-1 1v6a1 1 0 001 1h2v-2h-1v-2h1V9z" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: 'Minimal Downtime'
    },
    {
      title: 'Trusted By Contractors',
      description: 'We are the preferred parts supplier for construction and mining professionals across the country.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.176-5.97M15 21v-1a6 6 0 015.176-5.97m-5.176 5.97A2 2 0 0112 18.645a2 2 0 01-2.828 0" />
        </svg>
      ),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      stats: '500+ Clients'
    }
  ]

  return (
    <section id="why-choose-us" className="page-section py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6 animate-bounce-in">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 animate-slide-up">
            Why Choose <span className="text-amber-600">MM Earthmovers?</span>
          </h2>
          <div className="w-20 h-1 bg-amber-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            We're not just a parts supplier – we're your trusted partner in keeping your heavy machinery running at peak performance
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative bg-white rounded-xl p-6 border border-gray-200 hover:border-amber-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              {/* Icon Container */}
              <div className={`relative w-16 h-16 mx-auto mb-6 rounded-xl ${feature.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <div className={feature.color}>
                  {feature.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors duration-200">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-5 leading-relaxed text-sm">
                  {feature.description}
                </p>
                
                {/* Stats Badge */}
                <div className={`inline-flex items-center px-3 py-1.5 ${feature.bgColor} ${feature.color} rounded-full text-xs font-medium`}>
                  <span>{feature.stats}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Stats Section */}
        <div className="mt-16 bg-amber-50 rounded-xl p-8 border border-amber-100 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-lg bg-white">
              <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">100%</div>
              <div className="text-gray-600 text-sm">Genuine Parts</div>
            </div>
            <div className="p-4 rounded-lg bg-white">
              <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">50K+</div>
              <div className="text-gray-600 text-sm">Parts Delivered</div>
            </div>
            <div className="p-4 rounded-lg bg-white">
              <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">99%</div>
              <div className="text-gray-600 text-sm">Customer Satisfaction</div>
            </div>
            <div className="p-4 rounded-lg bg-white">
              <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">24/7</div>
              <div className="text-gray-600 text-sm">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}