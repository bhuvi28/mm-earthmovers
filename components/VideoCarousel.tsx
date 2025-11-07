'use client'

import { useState, useEffect, useRef } from 'react'

interface VideoCarouselProps {
  videos: string[]
}

export default function VideoCarousel({ videos }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Ensure component only renders on client to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle video playback when index changes
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

  // Auto-advance carousel when video ends
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


  // Don't show anything until client-side
  if (!isClient) {
    return null
  }

  return (
    <div className="relative w-full h-full min-h-[500px] lg:min-h-[600px] bg-gray-900">
      {/* Videos */}
      {videos.map((video, index) => (
        <div
          key={index}
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


      {/* Navigation Arrows */}
      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-200"
            aria-label="Previous video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-200"
            aria-label="Next video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-amber-500 w-8'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
