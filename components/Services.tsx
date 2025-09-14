export default function Services() {
  const services = [
    {
      title: 'Excavation Services',
      description: 'Professional excavation for foundations, trenches, and site preparation.',
      icon: '🚜',
    },
    {
      title: 'Bulldozer Operations',
      description: 'Heavy-duty bulldozing for land clearing and grading projects.',
      icon: '🚧',
    },
    {
      title: 'Site Preparation',
      description: 'Complete site preparation services for construction projects.',
      icon: '🏗️',
    },
    {
      title: 'Equipment Rental',
      description: 'Quality heavy equipment available for short and long-term rental.',
      icon: '⚙️',
    },
  ]

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Services
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We provide comprehensive heavy equipment services to meet all your construction and earthmoving needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {service.title}
              </h3>
              <p className="text-gray-600">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
