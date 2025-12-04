'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function ClientHeaderWrapper() {
  const [activeNavLink, setActiveNavLink] = useState('products-overview')
  const router = useRouter()

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
