'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductCategories from '@/components/ProductCategories'
import WhyChooseUs from '@/components/WhyChooseUs'
import About from '@/components/About'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'
import ExportInfo from '@/components/ExportInfo'

import LoadingScreen from '@/components/LoadingScreen'

// Videos to preload
const PRELOAD_VIDEOS = [
  '/loader.mp4',
  '/motor_grador.mp4',
  '/excavator.mp4',
]

export default function HomeClient() {
  // Start with loading state, will update after mount
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [shouldShowLoadingScreen, setShouldShowLoadingScreen] = useState(true)
  const [activeNavLink, setActiveNavLink] = useState('home')
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Check sessionStorage on client mount
  useEffect(() => {
    const hasLoaded = sessionStorage.getItem('hasLoaded')
    if (hasLoaded) {
      setIsLoading(false)
      setShowContent(true)
      setShouldShowLoadingScreen(false)
    }
    setHasCheckedSession(true)
  }, [])

  // Called when loading screen fully fades out
  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasLoaded', 'true')
    setShowContent(true)
  }

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

  // Preload videos before hiding loading screen
  useEffect(() => {
    // Minimum time to show loading screen (ensures animation plays)
    const MIN_LOADING_TIME = 3000 // 3 seconds
    const startTime = Date.now()
    let videosReady = false
    let minimumTimePassed = false
    
    const checkDismiss = () => {
      if (videosReady && minimumTimePassed) {
        setIsLoading(false)
      }
    }
    
    // Track video loading
    let loadedCount = 0
    const totalVideos = PRELOAD_VIDEOS.length

    const handleVideoReady = () => {
      loadedCount++
      if (loadedCount >= totalVideos) {
        videosReady = true
        checkDismiss()
      }
    }

    // Create video elements to preload
    const videoElements: HTMLVideoElement[] = []
    PRELOAD_VIDEOS.forEach(src => {
      const video = document.createElement('video')
      video.src = src
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      
      // Use multiple events to ensure video is ready
      video.onloadeddata = handleVideoReady
      video.onerror = handleVideoReady // Don't block on errors
      video.load()
      videoElements.push(video)
    })
    
    // Ensure minimum loading time
    const minTimeTimer = setTimeout(() => {
      minimumTimePassed = true
      checkDismiss()
    }, MIN_LOADING_TIME)

    // Fallback timeout - don't wait more than 12 seconds
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 12000)

    return () => {
      clearTimeout(minTimeTimer)
      clearTimeout(fallbackTimeout)
      // Clean up video elements
      videoElements.forEach(v => {
        v.onloadeddata = null
        v.onerror = null
      })
    }
  }, [])

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

  // Don't render anything until we've checked the session
  if (!hasCheckedSession) {
    return (
      <div className="fixed inset-0 z-[100] bg-white" />
    )
  }

  return (
    <>
      {shouldShowLoadingScreen && (
        <LoadingScreen isLoading={isLoading} onComplete={handleLoadingComplete} />
      )}
      <main className="min-h-screen">
      {showContent && (
        <Header 
          onLogoClick={handleLogoClick} 
          onNavClick={handleNavClick}
          activeSection={activeNavLink}
          setActiveNavLink={setActiveNavLink}
        />
      )}
      
      <div id="main-content" ref={mainContentRef}>
        <Hero />
        
        {/* International Export Info (Home Page) */}
        <div className="container mx-auto px-6 max-w-6xl -mt-8 relative z-20">
           <ExportInfo />
        </div>

        <ProductCategories />
        <WhyChooseUs />
        <About />
        <Contact onProductEnquire={handleProductEnquire} />
      </div>
      
      <Footer />
    </main>
    </>)
}

