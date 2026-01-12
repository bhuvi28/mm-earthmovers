'use client'

import { useEffect, useState, useRef } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import loadingAnimation from './loading-logo.json'

interface LoadingScreenProps {
  isLoading: boolean
  onComplete?: () => void
}

export default function LoadingScreen({ isLoading, onComplete }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(true)
  const [cycleComplete, setCycleComplete] = useState(false)
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  // Set animation speed on mount
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(2) // 2x speed
    }
  }, [])

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
        <Lottie
          lottieRef={lottieRef}
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          onLoopComplete={() => setCycleComplete(true)}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  )
}
