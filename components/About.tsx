export default function About() {
  const values = [
    {
      icon: '🎯',
      title: 'Quality First',
      description: 'We source only the highest quality parts from trusted manufacturers to ensure reliability and longevity.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '⚡',
      title: 'Fast Delivery',
      description: 'Quick turnaround times to minimize your downtime and keep your projects moving forward.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: '🤝',
      title: 'Personal Service',
      description: 'Dedicated support from our experienced team who understand your specific needs.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: '💡',
      title: 'Innovation',
      description: 'Leveraging modern technology and AI to help you find the right parts quickly and accurately.',
      gradient: 'from-amber-500 to-orange-500'
    }
  ]

  const goals = [
    {
      year: '2025',
      title: 'Foundation & Launch',
      description: 'Establishing our presence in the heavy machinery parts industry with a focus on quality and customer service.',
      status: 'Current',
      icon: '🚀'
    },
    {
      year: '2025-2026',
      title: 'Market Expansion',
      description: 'Building partnerships with major construction and mining companies across the region.',
      status: 'Planned',
      icon: '🌍'
    },
    {
      year: '2026-2027',
      title: 'Technology Integration',
      description: 'Implementing advanced AI-powered parts identification and automated inventory management.',
      status: 'Future',
      icon: '💻'
    },
    {
      year: '2027+',
      title: 'Industry Leadership',
      description: 'Becoming the go-to supplier for heavy machinery parts with nationwide distribution.',
      status: 'Vision',
      icon: '👑'
    }
  ]

  return (
    <section id="about" className="page-section py-20 md:py-32 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-8 animate-bounce-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-slide-up">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">MM Earthmovers</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            A fresh approach to heavy machinery parts supply, built on modern technology and customer-first principles
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <div className="animate-slide-up">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-600/50">
              <h3 className="text-2xl font-bold text-white mb-6">Our Story</h3>
              <div className="space-y-4 text-gray-300">
                <p className="text-lg leading-relaxed">
                  Founded in March 2025, MM Earthmovers represents a new generation of heavy machinery parts suppliers. We're not just another parts company – we're a technology-driven solution provider.
                </p>
                <p className="leading-relaxed">
                  Our mission is simple: to revolutionize how construction and mining professionals source their parts. By combining traditional industry expertise with cutting-edge technology, we're making parts procurement faster, more accurate, and more reliable.
                </p>
                <p className="leading-relaxed">
                  We believe that every project matters, and every hour of downtime costs money. That's why we've built our entire operation around speed, accuracy, and exceptional customer service from day one.
                </p>
              </div>
            </div>
          </div>
          
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop" 
                alt="MM Earthmovers Modern Warehouse" 
                className="rounded-3xl shadow-2xl object-cover w-full h-full max-h-[500px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-amber-500/90 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white font-semibold text-sm">Modern warehouse facility with advanced inventory management</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-white mb-16 animate-slide-up">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Core Values</span>
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div 
                key={index}
                className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 animate-bounce-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${value.gradient} p-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-2xl text-center">{value.icon}</div>
                </div>
                <h4 className="text-lg font-bold text-white mb-3 text-center">{value.title}</h4>
                <p className="text-gray-400 text-sm text-center leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Section */}
            <div className="mb-20">
    <h3 className="text-3xl md:text-4xl font-bold text-center text-white mb-16 animate-slide-up">
        Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Roadmap</span>
    </h3>

    <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-1/2 md:left-1/2 sm:left-4 transform -translate-x-1/2 md:translate-x-0 w-1 h-full bg-gradient-to-b from-amber-500 to-blue-500 rounded-full"></div>

        <div className="space-y-12">
        {goals.map((goal, index) => (
            <div
            key={index}
            className={`flex flex-col md:flex-row items-center ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            } animate-slide-up`}
            style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
            {/* Card */}
            <div className="w-full md:w-1/2 px-4 md:px-8 mb-6 md:mb-0">
                <div
                className={`bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 ${
                    index % 2 === 0 ? "md:ml-auto" : "md:mr-auto"
                }`}
                >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                    <span className="text-2xl mr-3">{goal.icon}</span>
                    <span className="text-amber-500 font-bold text-lg">
                        {goal.year}
                    </span>
                    </div>
                    <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        goal.status === "Current"
                        ? "bg-green-500/20 text-green-400"
                        : goal.status === "Planned"
                        ? "bg-blue-500/20 text-blue-400"
                        : goal.status === "Future"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                    >
                    {goal.status}
                    </span>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">
                    {goal.title}
                </h4>
                <p className="text-gray-400">{goal.description}</p>
                </div>
            </div>

            {/* Timeline Dot */}
            <div
                className={`relative z-10 w-6 h-6 rounded-full border-4 border-gray-800 flex items-center justify-center ${
                goal.status === "Current"
                    ? "bg-green-500"
                    : goal.status === "Planned"
                    ? "bg-blue-500"
                    : goal.status === "Future"
                    ? "bg-purple-500"
                    : "bg-amber-500"
                }`}
            >
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>

            {/* Spacer (desktop only) */}
            <div className="hidden md:block w-1/2"></div>
            </div>
        ))}
        </div>
    </div>
        </div>


        {/* Why Choose Us Section */}
        {/* <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-600/50 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Us?</span>?
            </h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Being new means we're not bound by old ways of thinking. We're building the future of parts supply today.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-4">
                <div className="text-2xl">🆕</div>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Fresh Perspective</h4>
              <p className="text-gray-400">
                We're not stuck in old ways. Our approach is built on modern technology and customer-first thinking.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
                <div className="text-2xl">⚡</div>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Cutting-Edge Technology</h4>
              <p className="text-gray-400">
                Built from the ground up with the latest technology, including AI-powered parts identification.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                <div className="text-2xl">🎯</div>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Focused Service</h4>
              <p className="text-gray-400">
                Every customer matters to us. We're small enough to care, but ambitious enough to deliver.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </section>
  )
}