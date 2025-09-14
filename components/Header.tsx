'use client'

import { useEffect, useRef, useState } from 'react'

interface HeaderProps {
  onLogoClick: () => void
  onNavClick: () => void
  activeSection: string
  setActiveNavLink: (section: string) => void
}

export default function Header({ onLogoClick, onNavClick, activeSection, setActiveNavLink }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close mobile menu when clicking outside the header/nav area
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!isMenuOpen) return
      const el = containerRef.current
      if (el && !el.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMenuOpen])

  // Ensure menu is closed when resizing to desktop widths
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    onNavClick()
    
    // Close mobile menu
    setIsMenuOpen(false)
    
    // Set active nav link immediately
    setActiveNavLink(sectionId)
    
    // Scroll to section
    setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const getNavLinkClass = (sectionId: string) => {
    const baseClass = "nav-link text-gray-700 hover:text-amber-600 transition-colors duration-300 pb-1"
    const isActive = activeSection === sectionId
    const activeClass = isActive ? "text-amber-600 border-b-2 border-amber-600" : ""
    return `${baseClass} ${activeClass}`.trim()
  }

  const getMobileNavLinkClass = (sectionId: string) => {
    const baseClass = "block py-2 px-6 text-gray-700 hover:bg-gray-100"
    const activeClass = activeSection === sectionId ? "bg-amber-50 text-amber-600" : ""
    return `${baseClass} ${activeClass}`.trim()
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 transition-all duration-300 h-20" ref={containerRef}>
      <div className="container mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center">
            <a 
              href="#" 
              className="flex items-center space-x-3 h-full"
              onClick={(e) => {
                e.preventDefault()
                onLogoClick()
              }}
            >
              <div className="flex items-center h-full py-1">
                <img 
                  src="/logo.png" 
                  alt="MM Earthmovers Logo" 
                  className="h-full w-auto object-contain"
                  style={{ maxHeight: "3.5rem" }}
                />
              </div>
              <span className="text-2xl font-extrabold text-gray-500 tracking-wider">
                MM <span className="text-amber-500">Earthmovers</span>
              </span>
            </a>
          </div>
              <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="#home" 
              className={getNavLinkClass('home')}
              onClick={(e) => handleNavClick(e, 'home')}
            >
              Home
            </a>
            <a 
              href="#products-overview" 
              className={getNavLinkClass('products-overview')}
              onClick={(e) => handleNavClick(e, 'products-overview')}
            >
              Products
            </a>
            <a 
              href="#why-choose-us" 
              className={getNavLinkClass('why-choose-us')}
              onClick={(e) => handleNavClick(e, 'why-choose-us')}
            >
              Why Choose Us
            </a>
            <a 
              href="#about" 
              className={getNavLinkClass('about')}
              onClick={(e) => handleNavClick(e, 'about')}
            >
              About Us
            </a>
            <a 
              href="#contact" 
              className={getNavLinkClass('contact')}
              onClick={(e) => handleNavClick(e, 'contact')}
            >
              Contact
            </a>
          </nav>
          <button 
            id="mobile-menu-button" 
            className="md:hidden text-gray-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Mobile Menu */}
      <div id="mobile-menu" className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden bg-white/95`}>
        <a 
          href="#home" 
          className={getMobileNavLinkClass('home')}
          onClick={(e) => handleNavClick(e, 'home')}
        >
          Home
        </a>
        <a 
          href="#products-overview" 
          className={getMobileNavLinkClass('products-overview')}
          onClick={(e) => handleNavClick(e, 'products-overview')}
        >
          Products
        </a>
        <a 
          href="#why-choose-us" 
          className={getMobileNavLinkClass('why-choose-us')}
          onClick={(e) => handleNavClick(e, 'why-choose-us')}
        >
          Why Choose Us
        </a>
        <a 
          href="#about" 
          className={getMobileNavLinkClass('about')}
          onClick={(e) => handleNavClick(e, 'about')}
        >
          About Us
        </a>
        <a 
          href="#contact" 
          className={getMobileNavLinkClass('contact')}
          onClick={(e) => handleNavClick(e, 'contact')}
        >
          Contact
        </a>
      </div>
    </header>
  )
}