'use client'

import { useState } from 'react'

interface ContactProps {
  onProductEnquire: (productName: string, oemRef: string) => void
}

export default function Contact({ onProductEnquire }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    'contact-info': '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
    alert('Thank you for your enquiry! We will get back to you soon.')
  }

  const contactMethods = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Visit Our Shop',
      description: '1, Metcalf Lane, Esplanade, Kolkata 700001',
      action: 'Get Directions',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      title: 'Call Us Directly',
      description: '+91 8334887009',
      action: 'Call Now',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Email Us',
      description: 'mmearthmovers@gmail.com',
      action: 'Send Email',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: 'WhatsApp Chat',
      description: 'Quick support via WhatsApp',
      action: 'Start Chat',
      gradient: 'from-green-600 to-green-500'
    }
  ]

  return (
    <section id="contact" className="page-section py-20 md:py-32 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-8 animate-bounce-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-slide-up">
            Get In <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Touch</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Ready to find the parts you need? Contact us today for expert assistance and fast delivery.
          </p>
        </div>

        {/* Contact Methods Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {contactMethods.map((method, index) => (
            <div 
              key={index}
              className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 animate-bounce-in"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${method.gradient} p-4 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {method.icon}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 text-center">{method.title}</h3>
              <p className="text-gray-400 text-sm text-center mb-4">{method.description}</p>
              {method.title === 'Visit Our Shop' ? (
                <a 
                  href="https://maps.google.com/?q=1+Metcalf+Lane+Esplanade+Kolkata+700001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 px-4 bg-gradient-to-r ${method.gradient} text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-300 block text-center`}
                >
                  {method.action}
                </a>
              ) : method.title === 'Call Us Directly' ? (
                <a 
                  href="tel:+918334887009"
                  className={`w-full py-2 px-4 bg-gradient-to-r ${method.gradient} text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-300 block text-center`}
                >
                  {method.action}
                </a>
              ) : method.title === 'Email Us' ? (
                <a 
                  href="mailto:mmearthmovers@gmail.com"
                  className={`w-full py-2 px-4 bg-gradient-to-r ${method.gradient} text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-300 block text-center`}
                >
                  {method.action}
                </a>
              ) : method.title === 'WhatsApp Chat' ? (
                <a 
                  href="https://wa.me/+918334887009"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 px-4 bg-gradient-to-r ${method.gradient} text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-300 block text-center`}
                >
                  {method.action}
                </a>
              ) : (
                <button className={`w-full py-2 px-4 bg-gradient-to-r ${method.gradient} text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-300`}>
                  {method.action}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-600/50 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="text-amber-500 mr-3">📝</span>
                Send Us a Message
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      required 
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                      Company Name
                    </label>
                    <input 
                      type="text" 
                      id="company" 
                      name="company" 
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                      placeholder="Enter your company name"
                      value={formData.company}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="contact-info" className="block text-sm font-medium text-gray-300 mb-2">
                    Email or Phone *
                  </label>
                  <input 
                    type="text" 
                    id="contact-info" 
                    name="contact-info" 
                    required 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                    placeholder="Enter your email or phone number"
                    value={formData['contact-info']}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message / Part Requirements *
                  </label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={5} 
                    required 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 resize-none"
                    placeholder="Describe the parts you need or any specific requirements..."
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* AI Assistant & Additional Info */}
          <div className="space-y-8">
            {/* AI Assistant - Commented out for now */}
            {/* <div className="animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <AIPartsAssistant onCopyToForm={handleCopyToForm} />
            </div> */}

            {/* Additional Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 animate-slide-up" style={{ animationDelay: '0.8s' }}>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="text-amber-500 mr-2">ℹ️</span>
                Quick Info
              </h4>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  <span>Response time: Within 2 hours</span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  <span>Consultation available for your requirements</span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  <span>24/7 emergency support available</span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  <span>Nationwide shipping and delivery</span>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/50 animate-slide-up" style={{ animationDelay: '0.9s' }}>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="text-amber-500 mr-2">🕒</span>
                Business Hours
              </h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>Monday - Saturday:</span>
                  <span>10:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>Emergency Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}