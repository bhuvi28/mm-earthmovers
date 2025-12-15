'use client'

import { useGeoLocation } from '@/hooks/useGeoLocation'
import { useEffect, useState } from 'react'

export default function ExportInfo() {
  const { isInternational, country, loading } = useGeoLocation()
  // Mount check to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything during SSR, loading, or if not international (or null/error)
  if (!mounted || loading || isInternational !== true) {
    return null
  }

  return (

    <div className="mt-8 mb-8 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-xl p-6 relative overflow-hidden animate-fade-in group hover:shadow-lg transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <svg className="w-40 h-40 transform translate-x-10 -translate-y-10" fill="currentColor" viewBox="0 0 24 24">
           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="p-4 bg-white text-blue-600 rounded-full shadow-sm shrink-0">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        
        <div className="flex-grow space-y-2">
            <h3 className="text-xl font-bold text-slate-800 leading-tight">
                {country ? `Shipping spare parts to ${country}` : 'Supplying export-grade spare parts worldwide'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    DHL / FedEx / Freight Forwarders
                </span>
                <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    Customs Clearance Support
                </span>
            </div>
        </div>

        <div className="w-full md:w-auto mt-2 md:mt-0 shrink-0">
             <a
                 href={`https://wa.me/+918334887009?text=${encodeURIComponent(`Hi, I am interested in export of spare parts${country ? ` to ${country}` : ''}. Please provide details.`)}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
             >
                 Get Export Quote
             </a>
        </div>
      </div>
    </div>
  )
}
