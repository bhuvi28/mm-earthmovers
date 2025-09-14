'use client'

import { useState } from 'react'

interface HeaderProps {
  onLogoClick: () => void
  onNavClick: () => void
  activeSection: string
  setActiveNavLink: (section: string) => void
}

export default function Header({ onLogoClick, onNavClick, activeSection, setActiveNavLink }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
    <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <a 
          href="#" 
          id="logo-link" 
          className="flex items-center space-x-3"
          onClick={(e) => {
            e.preventDefault()
            onLogoClick()
          }}
        >
        <img 
        src="/logo.png" 
        alt="MM Earthmovers Logo" 
        className="max-h-20 w-auto object-contain"
        style={{ maxHeight: "3.5rem" }} // stays inside header space
        />

          <span className="text-2xl font-extrabold text-gray-500 tracking-wider">
            MM <span className="text-amber-500">Earthmovers</span>
          </span>
        </a>
        <div className="hidden md:flex items-center space-x-8">
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
        </div>
        <button 
          id="mobile-menu-button" 
          className="md:hidden text-gray-500"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </nav>
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