'use client'

import { useState, useEffect, useRef } from 'react'

interface VideoCarouselProps {
  videos: string[]
}

export default function VideoCarousel({ videos }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]) // Desktop refs
  const mobileVideoRefs = useRef<(HTMLVideoElement | null)[]>([]) // Mobile refs
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const isManualScroll = useRef(false) // Track if scroll was triggered by button/auto to prevent loop

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle Desktop Video Playback (Fade Effect)
  useEffect(() => {
    if (!isClient) return

    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.currentTime = 0
          video.play().catch(err => console.log('Video play error:', err))
        } else {
          video.pause()
        }
      }
    })
  }, [currentIndex, isClient])

  // Handle Mobile Scroll Synchronization
  useEffect(() => {
    if (!isClient || !mobileContainerRef.current) return

    const container = mobileContainerRef.current
    const targetScroll = currentIndex * container.offsetWidth

    // Only scroll if the difference is significant to avoid fighting with user scroll
    if (Math.abs(container.scrollLeft - targetScroll) > 10) {
      isManualScroll.current = true
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      })
      // Reset flag after animation
      setTimeout(() => { isManualScroll.current = false }, 500)
    }

    // Play active mobile video
    mobileVideoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
            video.play().catch(console.error)
        } else {
            video.pause()
        }
      }
    })

  }, [currentIndex, isClient])

  // Mobile Scroll Listener (Update Dots/Index on Swipe)
  const handleMobileScroll = () => {
    if (isManualScroll.current || !mobileContainerRef.current) return

    const container = mobileContainerRef.current
    const scrollPosition = container.scrollLeft
    const width = container.offsetWidth
    const newIndex = Math.round(scrollPosition / width)

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex)
    }
  }

  // Auto-advance logic (applies to both, drives state)
  const handleVideoEnd = () => {
    if (videos.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length)
    } else {
      // Loop single video
      const currentVideo = videoRefs.current[currentIndex]
      if (currentVideo) {
        currentVideo.currentTime = 0
        currentVideo.play()
      }
      const currentMobileVideo = mobileVideoRefs.current[currentIndex]
      if (currentMobileVideo) {
        currentMobileVideo.currentTime = 0
        currentMobileVideo.play()
      }
    }
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + videos.length) % videos.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length)
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="relative w-full h-full min-h-[500px] lg:min-h-[600px] bg-gray-900 group">
      
      {/* --- DESKTOP VIEW (Looking for lg:block) --- */}
      <div className="hidden lg:block absolute inset-0 w-full h-full">
        {videos.map((video, index) => (
            <div
            key={`desktop-${index}`}
            className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            >
            <video
                ref={(el) => {
                videoRefs.current[index] = el
                }}
                src={video}
                className="w-full h-full object-contain"
                playsInline
                muted={true}
                loop={videos.length === 1}
                onEnded={handleVideoEnd}
                preload="metadata"
            />
            </div>
        ))}
      </div>

      {/* --- MOBILE VIEW (Looking for lg:hidden) --- */}
      <div 
        ref={mobileContainerRef}
        onScroll={handleMobileScroll}
        className="lg:hidden flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
            <div
                key={`mobile-${index}`}
                className="min-w-full w-full h-full snap-center flex items-center justify-center relative"
            >
                <video
                    ref={(el) => {
                        mobileVideoRefs.current[index] = el
                    }}
                    src={video}
                    className="w-full h-full object-contain"
                    playsInline
                    muted={true} // Mobile autoplay needs muted usually
                    loop={videos.length === 1}
                    onEnded={handleVideoEnd}
                    preload="metadata"
                />
            </div>
        ))}
      </div>


      {/* Navigation Arrows (Shared) */}
      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Previous video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Next video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator (Shared) */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 lg:h-3 rounded-full transition-all duration-200 shadow-md ${
                index === currentIndex
                  ? 'bg-amber-500 w-6 lg:w-8'
                  : 'bg-white/50 hover:bg-white/70 w-2 lg:w-3'
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
