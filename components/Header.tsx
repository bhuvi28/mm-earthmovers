'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTracker } from '@/lib/analytics/tracker'
import GlobalSearchModal from './GlobalSearchModal'

interface HeaderProps {
  onLogoClick: () => void
  onNavClick: () => void
  activeSection: string
  setActiveNavLink: (section: string) => void
}

export default function Header({ onLogoClick, onNavClick, activeSection, setActiveNavLink }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const isHomePage = pathname === '/'

  // Detect platform for shortcut label
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || ''))
    }
  }, [])

  // Global keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const tracker = getTracker()
        tracker.track('click', {
          elementText: 'Open Search Modal (Keyboard Shortcut)',
          elementTag: 'shortcut',
          metadata: { action: 'search_modal_open', source: 'keyboard_shortcut_ctrl_k' },
        })
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    // If not on home page, allow default navigation (which goes to /#sectionId)
    if (!isHomePage) {
        setIsMenuOpen(false)
        return
    }

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
    const isActive = activeSection === sectionId
    return `nav-link text-gray-700 hover:text-amber-600 transition-colors duration-200 pb-1 ${
      isActive ? "text-amber-600 border-b-2 border-amber-600" : "border-b-2 border-transparent"
    }`
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
              <span className="text-2xl font-extrabold text-gray-800 tracking-wider">
                MM <span className="text-gray-800">EARTHMOVERS</span>
              </span>
            </a>
          </div>
              <nav className="hidden md:flex items-center space-x-5 lg:space-x-7 xl:space-x-8">
            <a 
              href="/#home" 
              className={getNavLinkClass('home')}
              onClick={(e) => handleNavClick(e, 'home')}
            >
              Home
            </a>
            <a 
              href="/#products-overview" 
              className={getNavLinkClass('products-overview')}
              onClick={(e) => handleNavClick(e, 'products-overview')}
            >
              Products
            </a>
            <a 
              href="/#why-choose-us" 
              className={getNavLinkClass('why-choose-us')}
              onClick={(e) => handleNavClick(e, 'why-choose-us')}
            >
              Why Choose Us
            </a>
            <a 
              href="/#about" 
              className={getNavLinkClass('about')}
              onClick={(e) => handleNavClick(e, 'about')}
            >
              About Us
            </a>
            <a 
              href="/#contact" 
              className={getNavLinkClass('contact')}
              onClick={(e) => handleNavClick(e, 'contact')}
            >
              Contact
            </a>

            {/* Desktop Sleek Expanding Search Trigger */}
            <button
              type="button"
              data-track="navbar_search_button"
              onClick={() => {
                const tracker = getTracker()
                tracker.track('click', {
                  elementText: 'Open Search Modal (Desktop Navbar)',
                  elementTag: 'button',
                  metadata: { action: 'search_modal_open', source: 'navbar_desktop_pill' },
                })
                setIsSearchOpen(true)
              }}
              className="group flex items-center h-10 w-10 hover:w-48 lg:hover:w-56 focus:w-48 lg:focus:w-56 px-2.5 rounded-full bg-transparent hover:bg-gray-50 focus:bg-white text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200/90 focus:border-amber-400 shadow-none hover:shadow-xs transition-all duration-300 ease-out overflow-hidden cursor-pointer outline-none"
              aria-label="Search catalog (Ctrl+K)"
            >
              {/* Search Icon */}
              <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <svg 
                  className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Smoothly Expanding Label & Shortcut */}
              <div className="flex items-center justify-between flex-grow min-w-0 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 delay-100 pl-2.5 pr-1">
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 truncate whitespace-nowrap">
                  Search catalog...
                </span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 group-hover:text-amber-700 bg-white rounded border border-gray-200 shadow-2xs ml-2 flex-shrink-0 leading-none">
                  {isMac ? '⌘K' : 'Ctrl+K'}
                </kbd>
              </div>
            </button>
          </nav>

          {/* Mobile Actions: Search + Menu */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              data-track="navbar_mobile_search_button"
              onClick={() => {
                const tracker = getTracker()
                tracker.track('click', {
                  elementText: 'Open Search Modal (Mobile Navbar)',
                  elementTag: 'button',
                  metadata: { action: 'search_modal_open', source: 'navbar_mobile_icon' },
                })
                setIsSearchOpen(true)
              }}
              className="p-2 text-gray-700 hover:text-amber-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Search parts"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button 
              id="mobile-menu-button" 
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
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
      </div>
      {/* Mobile Menu */}
      <div id="mobile-menu" className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden bg-white/95 border-b border-gray-100 shadow-lg`}>
        <div className="p-3 border-b border-gray-100">
          <button
            type="button"
            data-track="mobile_menu_search_button"
            onClick={() => {
              const tracker = getTracker()
              tracker.track('click', {
                elementText: 'Open Search Modal (Mobile Menu)',
                elementTag: 'button',
                metadata: { action: 'search_modal_open', source: 'mobile_menu_drawer' },
              })
              setIsMenuOpen(false)
              setIsSearchOpen(true)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-100/90 text-gray-600 text-sm font-medium hover:bg-gray-200/80 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search parts or part numbers...</span>
          </button>
        </div>
        <a 
          href="/#home" 
          className={getMobileNavLinkClass('home')}
          onClick={(e) => handleNavClick(e, 'home')}
        >
          Home
        </a>
        <a 
          href="/#products-overview" 
          className={getMobileNavLinkClass('products-overview')}
          onClick={(e) => handleNavClick(e, 'products-overview')}
        >
          Products
        </a>
        <a 
          href="/#why-choose-us" 
          className={getMobileNavLinkClass('why-choose-us')}
          onClick={(e) => handleNavClick(e, 'why-choose-us')}
        >
          Why Choose Us
        </a>
        <a 
          href="/#about" 
          className={getMobileNavLinkClass('about')}
          onClick={(e) => handleNavClick(e, 'about')}
        >
          About Us
        </a>
        <a 
          href="/#contact" 
          className={getMobileNavLinkClass('contact')}
          onClick={(e) => handleNavClick(e, 'contact')}
        >
          Contact
        </a>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </header>
  )
}