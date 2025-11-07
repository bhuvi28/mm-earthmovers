export default function About() {
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
    <section id="about" className="page-section py-16 md:py-24 bg-gray-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6 animate-bounce-in">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 animate-slide-up">
            About <span className="text-amber-600">MM Earthmovers</span>
          </h2>
          <div className="w-20 h-1 bg-amber-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            A fresh approach to heavy machinery parts supply, built on modern technology and customer-first principles
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <div className="animate-slide-up">
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h3>
              <div className="space-y-4 text-gray-600">
                <p className="leading-relaxed">
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
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="rounded-3xl shadow-2xl object-cover w-full h-full max-h-[500px]"
              >
                <source src="/hm_loader_machine.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl"></div>
              <div className="absolute bottom-4 left-4 right-4">
                
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Section */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12 animate-slide-up">
            Our <span className="text-amber-600">Roadmap</span>
          </h3>

          <div className="relative">
            {/* Timeline Line - Positioned behind content */}
            <div className="md:block absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 w-0.5 bg-gray-200 -z-10"></div>

            <div className="relative space-y-12">
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
                      className={`bg-white rounded-xl p-6 border border-gray-200 hover:border-amber-300 transition-all duration-300 hover:shadow-lg ${
                        index % 2 === 0 ? "md:ml-auto" : "md:mr-auto"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                            goal.status === "Current" ? "bg-green-100 text-green-600" :
                            goal.status === "Planned" ? "bg-blue-100 text-blue-600" :
                            goal.status === "Future" ? "bg-purple-100 text-purple-600" :
                            "bg-amber-100 text-amber-600"
                          }`}>
                            {goal.icon}
                          </div>
                          <span className="text-gray-900 font-bold text-lg">
                            {goal.year}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            goal.status === "Current"
                            ? "bg-green-100 text-green-800"
                            : goal.status === "Planned"
                            ? "bg-blue-100 text-blue-800"
                            : goal.status === "Future"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {goal.title}
                      </h4>
                      <p className="text-gray-600">{goal.description}</p>
                    </div>
                  </div>

                  {/* Timeline Dot */}
                  <div
                    className={`relative z-10 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center ${
                      goal.status === "Current"
                        ? "bg-green-500"
                        : goal.status === "Planned"
                        ? "bg-blue-500"
                        : goal.status === "Future"
                        ? "bg-purple-500"
                        : "bg-amber-500"
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
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