'use client'

import { useState } from 'react'

interface ProductImageZoomProps {
  image?: string
  title: string
  category?: string
}

export default function ProductImageZoom({ image, title, category = '' }: ProductImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!image) {
    return (
      <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden shadow-inner">
        <div 
          className="absolute inset-0 z-0 opacity-30 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${
              category.toLowerCase().includes('loader') ? '/loader-image.png' :
              (category.toLowerCase().includes('grader') ? '/motor-grader-image.png' :
              (category.toLowerCase().includes('excavator') ? '/excavator-image.png' : 
              '/logo.png'))
            })` 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent z-10" />
        
        <div className="relative z-20 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-700/50 rounded-lg backdrop-blur-sm bg-gray-900/30 m-6">
          <svg className="w-12 h-12 mb-4 text-gray-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-full mb-3">
            Image Pending
          </span>
          <h4 className="text-white font-bold text-xl tracking-wide uppercase drop-shadow-md">Coming Soon</h4>
          <p className="text-gray-400 mt-2 text-sm max-w-[250px]">We are updating our catalog. The image for this product will be available shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div 
        className="cursor-zoom-in relative group"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={image}
          alt={title}
          className="max-h-[400px] w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-2 rounded-full shadow-sm">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setIsOpen(false)}
        >
            <button 
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                }}
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <img 
                src={image} 
                alt={title} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </>
  )
}
