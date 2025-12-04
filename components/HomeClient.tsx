'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductCategories from '@/components/ProductCategories'
import WhyChooseUs from '@/components/WhyChooseUs'
import About from '@/components/About'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function HomeClient() {
  const [activeNavLink, setActiveNavLink] = useState('home')
  const mainContentRef = useRef<HTMLDivElement>(null)

  const handleLogoClick = () => {
    // Scroll to home section
    setTimeout(() => {
      const homeSection = document.getElementById('home')
      if (homeSection) {
        homeSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleNavClick = () => {
    // No-op or handle if needed
  }

  const handleProductEnquire = (productName: string, oemRef: string) => {
    // Scroll to contact section and populate form
    setTimeout(() => {
      const contactSection = document.getElementById('contact')
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' })
        const messageTextarea = document.getElementById('message') as HTMLTextAreaElement
        if (messageTextarea) {
          messageTextarea.value = `I'd like to enquire about the following product:\n\nProduct: ${productName}\n${oemRef ? `Ref: ${oemRef}` : ''}`
          messageTextarea.focus()
        }
      }
    }, 100)
  }

  // Scroll spy for navigation with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // Clear previous timeout
      clearTimeout(timeoutId)
      
      // Debounce the scroll handler
      timeoutId = setTimeout(() => {
        const sections = document.querySelectorAll('#main-content .page-section')
        const scrollPosition = window.scrollY + 150 // Offset for header

        let currentSection = 'home'
        
        sections.forEach(section => {
          const element = section as HTMLElement
          const offsetTop = element.offsetTop
          const height = element.offsetHeight
          
          // Check if section is in viewport
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
            currentSection = element.id
          }
        })

        setActiveNavLink(currentSection)
      }, 50) // 50ms debounce
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Call once to set initial state

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <main className="min-h-screen">
      <Header 
        onLogoClick={handleLogoClick} 
        onNavClick={handleNavClick}
        activeSection={activeNavLink}
        setActiveNavLink={setActiveNavLink}
      />
      
      <div id="main-content" ref={mainContentRef}>
        <Hero />
        <ProductCategories />
        <WhyChooseUs />
        <About />
        <Contact onProductEnquire={handleProductEnquire} />
      </div>
      
      <Footer />
    </main>
  )
}

