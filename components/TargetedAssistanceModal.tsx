'use client'

import React, { useState, useEffect, useRef } from 'react'
import { isRestrictedVisitor } from '@/lib/restrictions'
import { getTracker } from '@/lib/analytics/tracker'

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
}

function isValidPhone(phone: string): boolean {
  if (!/^[\d\s\-\+\(\)\.]{10,20}$/.test(phone.trim())) return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

function validateContactInput(contact: string): string {
  const val = contact.trim()
  if (!val) {
    return 'Phone number or email is required.'
  }
  if (val.includes('@')) {
    if (!isValidEmail(val)) {
      return 'Please enter a valid email address (e.g. name@example.com).'
    }
    return ''
  }
  if (!isValidPhone(val)) {
    return 'Please enter a valid 10-digit phone number or email address.'
  }
  return ''
}

export default function TargetedAssistanceModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEligible, setIsEligible] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
  })
  const [contactError, setContactError] = useState('')
  const [nameError, setNameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const contactInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const vid = localStorage.getItem('mm_vid')
    if (isRestrictedVisitor(vid)) {
      setIsEligible(true)
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 700)
      return () => clearTimeout(timer)
    }

    // Dynamic check against API for any restrictions added from admin portal
    fetch('/api/restrictions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const ids: string[] = data.visitorIds || []
        if (vid && ids.includes(vid.toLowerCase().trim())) {
          setIsEligible(true)
          setTimeout(() => setIsOpen(true), 700)
        }
      })
      .catch(() => {})
  }, [])

  // Lock body scroll and listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!isEligible) return null

  const handleContactBlur = () => {
    if (formData.contact.trim()) {
      const err = validateContactInput(formData.contact)
      setContactError(err)
    }
  }

  const handleNameBlur = () => {
    const trimmed = formData.name.trim()
    if (trimmed && trimmed.length < 2) {
      setNameError('Name must be at least 2 characters long.')
    } else {
      setNameError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validateContactInput(formData.contact)
    if (err) {
      setContactError(err)
      contactInputRef.current?.focus()
      return
    }

    const trimmedName = formData.name.trim()
    if (trimmedName && trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters long.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setContactError('')
    setNameError('')

    const trimmedContact = formData.contact.trim()

    try {
      // 1. Submit to StaticForms for instant notification
      const res = await fetch('https://api.staticforms.xyz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKey: 'sf_fd80e723henagadlica8agki',
          name: trimmedName || 'Loader Parts Visitor',
          'contact-info': trimmedContact,
          message: formData.message.trim()
            ? `[Targeted Loader Lead] ${formData.message.trim()}`
            : '[Targeted Loader Lead] Visitor requested assistance with Wheel Loader & Payloader parts.',
          subject: 'Priority Loader Parts Inquiry - Website Request',
          replyTo: '@',
        }),
      })

      // 2. Identify in site analytics & database
      try {
        const tracker = getTracker()
        tracker.identify({
          name: trimmedName || undefined,
          contact: trimmedContact,
        })
        tracker.trackForm('submit', 'Targeted Assistance Modal', {
          category: 'Loader',
          contact: trimmedContact,
          name: trimmedName,
          notes: formData.message.trim(),
        })
      } catch (trackErr) {
        console.error('Tracker error:', trackErr)
      }

      setSubmitSuccess(true)
    } catch (err) {
      console.error('Submission error:', err)
      setErrorMessage('Something went wrong. Please call or WhatsApp us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Re-Open Badge */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-full shadow-2xl transition-all border border-amber-400/50 cursor-pointer animate-fade-in"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span style={{ color: '#ffffff' }}>Need Wheel Loader Parts? Contact Us</span>
        </button>
      )}

      {/* Modal Backdrop & Container */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-scale-up"
            role="dialog"
            aria-modal="true"
          >
            {/* Header / Top Banner */}
            <div
              className="dark-banner p-6 relative border-b border-slate-800"
              style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ color: '#ffffff' }}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                aria-label="Close"
              >
                ✕
              </button>
              <div
                className="badge-amber inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  borderColor: 'rgba(245, 158, 11, 0.6)',
                  color: '#fbbf24',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Loader Spare Parts Specialist
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold tracking-tight mb-2"
                style={{ color: '#ffffff' }}
              >
                Looking for Wheel Loader Parts?
              </h3>
              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{ color: '#f1f5f9' }}
              >
                We supply replacement parts for HM 2021, L&T 9020, TATA 3036, BEML, SDLG, XCMG, and JCB.
                Leave your details below and our technical team will reach out directly.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {submitSuccess ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Request Received!</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Our team will review your requirement and get in touch with you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                    className="px-6 py-2.5 text-sm font-semibold rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Lead Capture Form */}
                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Your Phone Number or Email <span className="text-amber-600">*</span>
                        </label>
                      </div>
                      <input
                        ref={contactInputRef}
                        type="text"
                        placeholder="e.g. +91 98765 43210 or yourname@gmail.com"
                        value={formData.contact}
                        onBlur={handleContactBlur}
                        onChange={(e) => {
                          setFormData({ ...formData, contact: e.target.value })
                          if (contactError) setContactError('')
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                          contactError
                            ? 'border-red-500 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                            : 'border-gray-300 focus:ring-2 focus:ring-amber-500'
                        }`}
                      />
                      {contactError && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {contactError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onBlur={handleNameBlur}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          if (nameError) setNameError('')
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                          nameError
                            ? 'border-red-500 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                            : 'border-gray-300 focus:ring-2 focus:ring-amber-500'
                        }`}
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Part Name / Requirement (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pin, Bush, Shaft, Seal Kit, Gear Pump..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-gray-900 placeholder-gray-400"
                      />
                    </div>

                    {errorMessage && (
                      <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{errorMessage}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ color: '#0f172a' }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 font-bold rounded-xl transition duration-200 text-sm shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Submitting Details...' : 'Request Callback / Part Details'}
                    </button>
                  </form>

                  {/* Quick Direct Actions Divider */}
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">or connect directly</span>
                    </div>
                  </div>

                  {/* Direct WhatsApp & Call Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://wa.me/+918334887009?text=Hi%20MM%20Earthmovers%2C%20I%20need%20assistance%20with%20wheel%20loader%20parts.%20Please%20let%20me%20know%20availability%20and%20pricing."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                    >
                      <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                      </svg>
                      WhatsApp Us
                    </a>
                    <a
                      href="tel:+918334887009"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-xl text-xs font-semibold transition"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call Now
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
