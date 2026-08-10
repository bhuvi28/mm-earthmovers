'use client'

import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  {
    id: 'loader',
    name: 'Loader Spare Parts',
    count: 'HM, L&T, LiuGong, SDLG & More',
    image: '/loader-image.png',
    href: '/products?category=loader',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'grader',
    name: 'Motor Grader Spare Parts',
    count: 'BEML, CAT & More',
    image: '/motor-grader-image.png',
    href: '/products?category=grader',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 'excavator',
    name: 'Excavator Spare Parts',
    count: 'Komatsu, Hyundai, Tata Hitachi, Volvo & More',
    image: '/excavator-image.png',
    href: '/products?category=excavator',
    gradient: 'from-purple-500 to-pink-500',
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

      {/* ── Category Cards — Primary ────────────────────────── */}
      <section className="page-section py-20 md:py-28 bg-gray-100 relative overflow-hidden">
        {/* Dot grid background — matches About / WhyChooseUs */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section header — matches ProductCategories/WhyChooseUs pattern */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6 animate-bounce-in">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 animate-slide-up">
              Browse Our <span className="text-amber-600">Product Range</span>
            </h1>
            <div className="w-24 h-1.5 bg-amber-500 mx-auto rounded-full mb-8" />
            <p className="text-xl text-gray-600 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Select a category below to explore our full inventory of earthmoving spare parts.
            </p>
          </div>

          {/* Cards — exact same structure as ProductCategories */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {CATEGORIES.map((category, index) => (
              <Link
                key={category.id}
                href={category.href}
                className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border border-gray-100"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                <div className="flex flex-col h-full">
                  {/* Image */}
                  <div className="relative w-full h-56 overflow-hidden bg-gray-100">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-8 md:p-10 flex flex-col flex-grow text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                      {category.name}
                    </h2>

                    <div className="w-full pt-6 border-t border-gray-100 mt-auto">
                      <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Available Brands</p>
                      <p className="text-gray-800 font-medium">{category.count}</p>
                    </div>

                    <div className="mt-6 flex items-center justify-center text-amber-600 font-semibold group-hover:translate-x-1 transition-transform">
                      View Products
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom CTA — matches ProductCategories "Can't find what you're looking for?" */}
          <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <p className="text-gray-500 mb-6">Can&apos;t find the part you&apos;re looking for?</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>Chat on WhatsApp</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── Secondary actions — bg-white, matches Hero CTA style ── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-10">
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
              Our catalogue is constantly growing and part numbers are regularly updated.
              Use the links below to navigate or get in touch with us directly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Go to Homepage</span>
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 hover:border-amber-600 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Contact Us</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
