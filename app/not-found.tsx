'use client'

import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'
import Footer from '@/components/Footer'
import Link from 'next/link'

const CATEGORIES = [
  {
    id: 'loader',
    name: 'Loader Spare Parts',
    description: 'HM, L&T, LiuGong, SDLG, SEM, JCB & more',
    image: '/loader-image.png',
    href: '/products?category=loader',
    accentColor: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 'grader',
    name: 'Motor Grader Spare Parts',
    description: 'BEML, CAT & more',
    image: '/motor-grader-image.png',
    href: '/products?category=grader',
    accentColor: 'from-green-500 to-emerald-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    id: 'excavator',
    name: 'Excavator Spare Parts',
    description: 'Komatsu, Hyundai, Tata Hitachi, Volvo & more',
    image: '/excavator-image.png',
    href: '/products?category=excavator',
    accentColor: 'from-purple-500 to-pink-500',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
]

const WHATSAPP_URL =
  'https://wa.me/+918334887009?text=' +
  encodeURIComponent(
    "Hi, I'm looking for a spare part but couldn't find it on your website. Can you help me find it?"
  )

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <ClientHeaderWrapper />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="flex-grow-0 py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          {/* Search / parts icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-100 mb-8">
            <svg className="w-9 h-9 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            We couldn&apos;t find that page
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-10">
            Our catalogue is constantly growing and part numbers are regularly updated.
            The part or page you&apos;re looking for may have moved — browse the categories
            below or reach out to us directly.
          </p>

          {/* Quick action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Homepage
            </Link>
            <Link
              href="/products?category=loader"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Browse All Parts
            </Link>
          </div>
        </div>
      </section>

      {/* ── Category Cards ───────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-2">
              What are you looking for?
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Browse by Equipment Category
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Top gradient bar */}
                <div className={`h-1.5 bg-gradient-to-r ${cat.accentColor}`} />

                {/* Image */}
                <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden px-6 pt-6">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-500 flex-grow">{cat.description}</p>

                  <div className="mt-4 flex items-center text-sm font-semibold text-amber-600 group-hover:gap-3 gap-1.5 transition-all duration-200">
                    <span>View Parts</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WhatsApp CTA ─────────────────────────────────────── */}
      <section className="py-12 bg-gray-900">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Can&apos;t find the part you need?
              </h3>
              <p className="text-gray-400 text-base">
                Tell us the part number or describe what you&apos;re looking for — we&apos;ll help you track it down.
              </p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/20 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Quick Links ──────────────────────────────────────── */}
      <section className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Quick Links
            </span>
            <Link href="/" className="hover:text-amber-600 transition-colors">
              Home
            </Link>
            <Link href="/#products-overview" className="hover:text-amber-600 transition-colors">
              Products Overview
            </Link>
            <Link href="/#about" className="hover:text-amber-600 transition-colors">
              About Us
            </Link>
            <Link href="/#contact" className="hover:text-amber-600 transition-colors">
              Contact
            </Link>
            <a
              href="tel:+918334887009"
              className="hover:text-amber-600 transition-colors"
            >
              +91 8334887009
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
