'use client'

interface ProductCategoryProps {
  onCategoryClick: (category: string, categoryName: string) => void
}

export default function ProductCategories({ onCategoryClick }: ProductCategoryProps) {
  const categories = [
    {
      id: 'loader',
      name: 'Loader Spare Parts',
      description: 'High-quality parts for all major loader models',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      count: 'HM, L&T, LiuGong, SDLG & More'
    },
    {
      id: 'grader',
      name: 'Grader Spare Parts',
      description: 'Durable components for motor graders',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1014.12 11.88l-4.242 4.242z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      count: '  BEML'
    },
    {
      id: 'excavator',
      name: 'Excavator Spare Parts',
      description: 'Genuine and aftermarket parts for all major excavator brands',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      count: 'Komatsu, Hyundai, Tata Hitachi, Volvo & More'
    }
  ]

  return (
    <section id="products-overview" className="page-section py-20 md:py-28 bg-gray-100 relative overflow-hidden">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 animate-slide-up">
            Our <span className="text-amber-600">Product Categories</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Discover our comprehensive range of high-quality parts and components for all your heavy machinery needs
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {categories.map((category, index) => (
            <div 
              key={category.id}
              className="group relative bg-white rounded-xl p-8 cursor-pointer border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 animate-fade-in"
              data-category={category.id}
              onClick={() => onCategoryClick(category.id, category.name)}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 transition-opacity duration-300 rounded-xl"></div>
              
              {/* Icon Container */}
              <div className={`w-16 h-16 mb-6 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-amber-500 to-amber-600 shadow-md`}>
                {category.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <div className="flex items-center text-sm text-amber-600 font-medium">
                {category.count}
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
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