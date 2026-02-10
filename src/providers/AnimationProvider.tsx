'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

interface AnimationContextValue {
  /** User prefers reduced motion */
  prefersReducedMotion: boolean
  /** Viewport is mobile-sized (< 768px) */
  isMobile: boolean
  /** Whether animations should run (false if reduced motion preferred) */
  shouldAnimate: boolean
}

const AnimationContext = createContext<AnimationContextValue>({
  prefersReducedMotion: false,
  isMobile: false,
  shouldAnimate: true,
})

export function useAnimation() {
  return useContext(AnimationContext)
}

function getInitialMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getInitialMobile() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

export default function AnimationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(getInitialMotion)
  const [isMobile, setIsMobile] = useState(getInitialMobile)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    motionQuery.addEventListener('change', handleMotionChange)

    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const handleMobileChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mobileQuery.addEventListener('change', handleMobileChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      mobileQuery.removeEventListener('change', handleMobileChange)
    }
  }, [])

  return (
    <AnimationContext.Provider
      value={{
        prefersReducedMotion,
        isMobile,
        shouldAnimate: !prefersReducedMotion,
      }}
    >
      {children}
    </AnimationContext.Provider>
  )
}
