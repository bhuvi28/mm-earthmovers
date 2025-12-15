'use client'

import React, { useState } from 'react'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateField = (name: string, value: string) => {
    let error = ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\+?[\d\s-]{10,}$/

    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Name is required'
        break
      case 'contact-info':
        if (!value.trim()) {
          error = 'Email or Phone is required'
        } else if (!emailRegex.test(value.trim()) && !phoneRegex.test(value.trim())) {
          error = 'Please enter a valid email or phone number (min 10 digits)'
        }
        break
      case 'message':
        if (!value.trim()) {
          error = 'Message is required'
        } else if (value.trim().length < 10) {
          error = 'Message must be at least 10 characters long'
        }
        break
    }
    return error
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    // Validate all fields
    Object.keys(formData).forEach(key => {
      // Skip company as it's optional
      if (key === 'company') return
      
      const error = validateField(key, formData[key as keyof typeof formData])
      if (error) {
        newErrors[key] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch('https://api.staticforms.xyz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          accessKey: 'sf_fd80e723henagadlica8agki',
          subject: 'New Enquiry from MM Earthmovers Website',
          replyTo: '@' // StaticForms requires this or a valid email field mapped to replyTo
        })
      })

      const data = await response.json()
      
      // StaticForms returns { message: "Form submitted successfully", id: "..." } on success
      // Check for response.ok (status 200-299) OR presence of 'id' field
      if (response.ok && data.id) {
        setSubmitStatus('success')
        setFormData({
          name: '',
          company: '',
          'contact-info': '',
          message: ''
        })
        // Clear any validation errors
        setErrors({})
      } else {
        setSubmitStatus('error')
        console.error('StaticForms error:', data)
      }
    } catch (error) {
      setSubmitStatus('error')
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
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
      description: '1, Metcalf Lane, Esplanade, Kolkata 700072',
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
      description: 'hm.mmearthmovers@gmail.com',
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
      gradient: 'from-amber-500 to-yellow-500'
    }
  ]

  return (
    <section id="contact" className="page-section py-16 md:py-24 bg-white relative overflow-hidden">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 animate-slide-up">
            Get In <span className="text-amber-600">Touch</span>
          </h2>
          <div className="w-20 h-1 bg-amber-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Ready to find the parts you need? Contact us today for expert assistance and fast delivery.
          </p>
        </div>

        {/* Contact Methods Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, index) => {
            // Define button colors based on method type
            const buttonClass = {
              'Visit Our Shop': 'bg-blue-600 hover:bg-blue-700',
              'Call Us Directly': 'bg-green-600 hover:bg-green-700',
              'Email Us': 'bg-purple-600 hover:bg-purple-700',
              'WhatsApp Chat': 'bg-green-500 hover:bg-green-600'
            }[method.title] || 'bg-amber-600 hover:bg-amber-700';
            
            // Define icon background colors
            const iconBgClass = {
              'Visit Our Shop': 'bg-blue-100',
              'Call Us Directly': 'bg-green-100',
              'Email Us': 'bg-purple-100',
              'WhatsApp Chat': 'bg-green-100'
            }[method.title] || 'bg-amber-100';
            
            // Define icon colors
            const iconColor = {
              'Visit Our Shop': 'text-blue-600',
              'Call Us Directly': 'text-green-600',
              'Email Us': 'text-purple-600',
              'WhatsApp Chat': 'text-green-600'
            }[method.title] || 'text-amber-600';
            
            return (
              <div 
                key={index}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-amber-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-lg ${iconBgClass} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <div className={iconColor}>
                    {React.cloneElement(method.icon, { className: 'h-7 w-7' })}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">{method.title}</h3>
                <p className="text-gray-600 text-sm text-center mb-4">{method.description}</p>
                {method.title === 'Visit Our Shop' ? (
                  <a 
                    href="https://maps.app.goo.gl/tnwchdtBBZ8AMbxz8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 px-4 ${buttonClass} text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 block text-center`}
                  >
                    {method.action}
                  </a>
                ) : method.title === 'Call Us Directly' ? (
                  <a 
                    href="tel:+918334887009"
                    className={`w-full py-2 px-4 ${buttonClass} text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 block text-center`}
                  >
                    {method.action}
                  </a>
                ) : method.title === 'Email Us' ? (
                  <a 
                    href="mailto:hm.mmearthmovers@gmail.com"
                    className={`w-full py-2 px-4 ${buttonClass} text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 block text-center`}
                  >
                    {method.action}
                  </a>
                ) : method.title === 'WhatsApp Chat' ? (
                  <a 
                    href="https://wa.me/+918334887009"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 px-4 ${buttonClass} text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 block text-center`}
                  >
                    {method.action}
                  </a>
                ) : (
                  <button className={`w-full py-2 px-4 ${buttonClass} text-white rounded-lg font-medium hover:shadow-md transition-all duration-200`}>
                    {method.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-amber-500 mr-3">📝</span>
                Send Us a Message
              </h3>
              
              {submitStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h4>
                  <p className="text-gray-600 mb-6">Thank you for your enquiry. We will get back to you shortly.</p>
                  <button 
                    onClick={() => setSubmitStatus(null)}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {submitStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      Something went wrong. Please try again or contact us via WhatsApp/Phone.
                    </div>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        required 
                        className={`w-full px-4 py-3 bg-white border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200`}
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input 
                        type="text" 
                        id="company" 
                        name="company" 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your company name"
                        value={formData.company}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="contact-info" className="block text-sm font-medium text-gray-700 mb-2">
                      Email or Phone *
                    </label>
                    <input 
                      type="text" 
                      id="contact-info" 
                      name="contact-info" 
                      required 
                      className={`w-full px-4 py-3 bg-white border ${errors['contact-info'] ? 'border-red-500' : 'border-gray-300'} rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200`}
                      placeholder="Enter your email or phone number"
                      value={formData['contact-info']}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                    />
                    {errors['contact-info'] && <p className="mt-1 text-sm text-red-500">{errors['contact-info']}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message / Part Requirements *
                    </label>
                    <textarea 
                      id="message" 
                      name="message" 
                      rows={5} 
                      required 
                      className={`w-full px-4 py-3 bg-white border ${errors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none`}
                      placeholder="Describe the parts you need or any specific requirements..."
                      value={formData.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                    />
                    {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 flex items-center justify-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* AI Assistant & Additional Info */}
          <div className="space-y-8">
            {/* AI Assistant - Commented out for now */}
            {/* <div className="animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <AIPartsAssistant onCopyToForm={handleCopyToForm} />
            </div> */}

            {/* Additional Info */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-amber-500 mr-2">ℹ️</span>
                Quick Info
              </h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2 mt-0.5">•</span>
                  <span>Response time: <span className="font-medium">Within 2 hours</span></span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2 mt-0.5">•</span>
                  <span>Expert consultation for your specific requirements</span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2 mt-0.5">•</span>
                  <span>24/7 emergency support available</span>
                </div>
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2 mt-0.5">•</span>
                  <span>Worldwide shipping and delivery</span>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-slide-up" style={{ animationDelay: '0.8s' }}>
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-amber-500 mr-2">🕒</span>
                Business Hours
              </h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="font-medium">Monday - Saturday</span>
                  <span className="text-gray-800 font-medium">10:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium">Sunday</span>
                  <span className="text-amber-600 font-medium">Emergency Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}