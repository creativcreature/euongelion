'use client'

import {
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'
import { useAnimation } from './AnimationProvider'

type LenisInstance = InstanceType<typeof Lenis>

const LenisContext = createContext<LenisInstance | null>(null)

export function useLenis() {
  return useContext(LenisContext)
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisInstance | null>(null)
  const pathname = usePathname()
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    // Skip smooth scroll if user prefers reduced motion
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    })

    lenisRef.current = lenis

    // Bridge Lenis with GSAP ScrollTrigger
    // Lazy-import to avoid SSR issues
    import('@/lib/gsap-registry').then(({ ScrollTrigger }) => {
      lenis.on('scroll', ScrollTrigger.update)
    })

    // RAF loop
    function raf(time: number) {
      lenis.raf(time * 1000)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [prefersReducedMotion])

  // Scroll to top on route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return (
    <LenisContext.Provider value={lenisRef.current}>
      {children}
    </LenisContext.Provider>
  )
}
