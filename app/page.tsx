'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductCategories from '@/components/ProductCategories'
import WhyChooseUs from '@/components/WhyChooseUs'
import About from '@/components/About'
import Contact from '@/components/Contact'
import ComingSoon from '@/components/ComingSoon'
import Footer from '@/components/Footer'

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'main' | 'products'>('main')
  const [currentCategory, setCurrentCategory] = useState<{id: string, name: string} | null>(null)
  const [activeNavLink, setActiveNavLink] = useState('home')
  const mainContentRef = useRef<HTMLDivElement>(null)

  const handleCategoryClick = (category: string, categoryName: string) => {
    setCurrentCategory({ id: category, name: categoryName })
    setCurrentPage('products')
    setActiveNavLink('products-overview') // Highlight products in nav when viewing products
    // Scroll to top when navigating to products
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToHome = () => {
    setCurrentPage('main')
    setCurrentCategory(null)
    setActiveNavLink('home') // Reset to home when going back
  }

  const handleBackToCategories = () => {
    setCurrentPage('main')
    setCurrentCategory(null)
    setActiveNavLink('products-overview') // Highlight products section
    // Scroll to products section
    setTimeout(() => {
      const productsSection = document.getElementById('products-overview')
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleLogoClick = () => {
    setCurrentPage('main')
    setCurrentCategory(null)
    // Scroll to home section
    setTimeout(() => {
      const homeSection = document.getElementById('home')
      if (homeSection) {
        homeSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleNavClick = () => {
    setCurrentPage('main')
  }

  const handleProductEnquire = (productName: string, oemRef: string) => {
    setCurrentPage('main')
    // Scroll to contact section and populate form
    setTimeout(() => {
      const contactSection = document.getElementById('contact')
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' })
        const messageTextarea = document.getElementById('message') as HTMLTextAreaElement
        if (messageTextarea) {
          messageTextarea.value = `I'd like to enquire about the following product:\n\nProduct: ${productName}\n${oemRef}`
          messageTextarea.focus()
        }
      }
    }, 100)
  }

  const handleContactClick = () => {
    setCurrentPage('main')
    setCurrentCategory(null)
    // Scroll to contact section
    setTimeout(() => {
      const contactSection = document.getElementById('contact')
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  // Set initial active section
  useEffect(() => {
    if (currentPage === 'main') {
      setActiveNavLink('home')
    }
  }, [currentPage])

  // Scroll spy for navigation with debounce
  useEffect(() => {
    if (currentPage !== 'main') return

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
  }, [currentPage])

  return (
    <main className="min-h-screen">
      <Header 
        onLogoClick={handleLogoClick} 
        onNavClick={handleNavClick}
        activeSection={activeNavLink}
        setActiveNavLink={setActiveNavLink}
      />
      
      {currentPage === 'main' ? (
        <div id="main-content" ref={mainContentRef}>
          <Hero />
          <ProductCategories onCategoryClick={handleCategoryClick} />
          <WhyChooseUs />
          <About />
          <Contact onProductEnquire={handleProductEnquire} />
        </div>
      ) : (
        currentCategory && (
          <ComingSoon
            categoryName={currentCategory.name}
            onContactClick={handleContactClick}
            onBackToCategories={handleBackToCategories}
          />
        )
      )}
      
      <Footer />
    </main>
  )
}
