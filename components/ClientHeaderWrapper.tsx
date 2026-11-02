'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { useRouter, usePathname } from 'next/navigation'

export default function ClientHeaderWrapper() {
  const router = useRouter()
  const pathname = usePathname()

  const currentSection = pathname?.startsWith('/models')
    ? 'models'
    : pathname?.startsWith('/products')
    ? 'products-overview'
    : ''

  const [activeNavLink, setActiveNavLink] = useState(currentSection)

  useEffect(() => {
    setActiveNavLink(currentSection)
  }, [currentSection])

  const handleLogoClick = () => {
    router.push('/')
  }

  const handleNavClick = () => {
    router.push('/')
  }

  return (
    <Header 
      onLogoClick={handleLogoClick} 
      onNavClick={handleNavClick}
      activeSection={activeNavLink}
      setActiveNavLink={setActiveNavLink}
    />
  )
}
