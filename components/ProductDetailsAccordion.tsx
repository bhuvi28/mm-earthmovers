'use client'

import { useRef } from 'react'
import { getTracker } from '@/lib/analytics/tracker'

interface ProductDetailsAccordionProps {
  productSlug: string
  partNumber?: string
  category: string
  children: React.ReactNode
}

export default function ProductDetailsAccordion({
  productSlug,
  partNumber,
  category,
  children,
}: ProductDetailsAccordionProps) {
  const lastOpenRef = useRef<boolean | null>(null)

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const open = e.currentTarget.open
    if (lastOpenRef.current === null && !open) {
      lastOpenRef.current = false
      return
    }
    if (lastOpenRef.current === open) return
    lastOpenRef.current = open

    try {
      getTracker().track?.('spec_toggle', {
        elementTag: 'details',
        elementText: 'Product Details',
        metadata: {
          open,
          productSlug,
          partNumber: partNumber || '',
          category,
        },
      })
    } catch {}
  }

  return (
    <details
      onToggle={handleToggle}
      className="group border border-gray-200 rounded-xl overflow-hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-semibold text-sm">
        <span>Product Details</span>
        <svg className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 py-4 text-sm text-gray-600 space-y-3 border-t border-gray-100">
        {children}
      </div>
    </details>
  )
}
