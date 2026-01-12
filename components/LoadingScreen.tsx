'use client'

import { useEffect, useState, useRef } from 'react'

interface LoadingScreenProps {
  isLoading: boolean
  onComplete?: () => void
}

// Generate array of PNG frame paths (237 frames, starting from frame 4)
const FRAME_COUNT = 237
const frames = Array.from({ length: FRAME_COUNT }, (_, i) => 
  `/loading-frames/frame_${(i + 4).toString().padStart(3, '0')}.png`
)

export default function LoadingScreen({ isLoading, onComplete }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(true)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [cycleComplete, setCycleComplete] = useState(false)
  const [framesLoaded, setFramesLoaded] = useState(false)
  const preloadedImages = useRef<HTMLImageElement[]>([])

  // Preload all frames on mount
  useEffect(() => {
    let loadedCount = 0
    const images: HTMLImageElement[] = []
    
    const handleLoad = () => {
      loadedCount++
      // Start animation after first 30 frames are loaded (for faster start)
      if (loadedCount >= 30 && !framesLoaded) {
        setFramesLoaded(true)
      }
    }
    
    // Preload all frames
    frames.forEach((src) => {
      const img = new Image()
      img.onload = handleLoad
      img.onerror = handleLoad // Don't block on errors
      img.src = src
      images.push(img)
    })
    
    preloadedImages.current = images
    
    // Fallback - start animation after 2 seconds regardless
    const fallback = setTimeout(() => {
      if (!framesLoaded) {
        setFramesLoaded(true)
      }
    }, 2000)
    
    return () => clearTimeout(fallback)
  }, [])

  // Animate through frames at 2x speed (15ms = ~67fps)
  useEffect(() => {
    if (!framesLoaded) return
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const nextFrame = (prev + 1) % FRAME_COUNT
        // Mark cycle complete when we loop back to frame 0
        if (nextFrame === 0 && prev === FRAME_COUNT - 1) {
          setCycleComplete(true)
        }
        return nextFrame
      })
    }, 15) // ~67fps animation (2x speed)

    return () => clearInterval(interval)
  }, [framesLoaded])

  // Only dismiss when both loading is done AND at least one cycle is complete
  const canDismiss = !isLoading && cycleComplete

  useEffect(() => {
    if (canDismiss) {
      // Wait for fade-out animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
        onComplete?.()
      }, 700) // Match CSS transition duration
      return () => clearTimeout(timer)
    }
  }, [canDismiss, onComplete])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-700 ${
        canDismiss ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-xs px-4">
        {framesLoaded && preloadedImages.current[currentFrame] && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={frames[currentFrame]}
            alt="Loading..."
            className="w-full h-auto"
          />
        )}
      </div>
    </div>
  )
}

