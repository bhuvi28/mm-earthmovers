'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductCategories from '@/components/ProductCategories'
import WhyChooseUs from '@/components/WhyChooseUs'
import About from '@/components/About'
import Contact from '@/components/Contact'
import ProductsPage from '@/components/ProductsPage'
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

  // Set initial active section
  useEffect(() => {
    if (currentPage === 'main') {
      setActiveNavLink('home')
    }
  }, [currentPage])

  // Scroll spy for navigation
  useEffect(() => {
    if (currentPage !== 'main') return

    const sections = document.querySelectorAll('#main-content .page-section')
    
    if (sections.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      // Find the section that's most visible
      let mostVisible = { element: null as Element | null, ratio: 0 }
      
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > mostVisible.ratio) {
          mostVisible = { element: entry.target, ratio: entry.intersectionRatio }
        }
      })

      if (mostVisible.element) {
        const id = mostVisible.element.getAttribute('id')
        if (id) {
          setActiveNavLink(id)
        }
      }
    }, {
      rootMargin: '-10% 0px -10% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    })

    sections.forEach(section => observer.observe(section))

    return () => observer.disconnect()
  }, [currentPage])

  // Additional scroll spy for better detection
  useEffect(() => {
    if (currentPage !== 'main') return

    const handleScroll = () => {
      const sections = document.querySelectorAll('#main-content .page-section')
      const scrollPosition = window.scrollY + 100

      let currentSection = 'home'
      
      sections.forEach(section => {
        const element = section as HTMLElement
        const offsetTop = element.offsetTop
        const height = element.offsetHeight
        
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
          currentSection = element.id
        }
      })

      setActiveNavLink(currentSection)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Call once to set initial state

    return () => window.removeEventListener('scroll', handleScroll)
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
                  <ProductsPage
                    category={currentCategory.id}
                    categoryName={currentCategory.name}
                    onBackToHome={handleBackToHome}
                    onBackToCategories={handleBackToCategories}
                    onCategoryClick={handleCategoryClick}
                    onProductEnquire={handleProductEnquire}
                  />
                )
              )}
      
      <Footer />
    </main>
  )
}
