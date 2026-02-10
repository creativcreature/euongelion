'use client'

import { useRef, useEffect } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'

/**
 * Parallax scroll effect via GSAP ScrollTrigger.
 * Moves element at a slower rate than scroll for depth.
 *
 * @param speed - Parallax intensity (0 = none, 1 = full). Default 0.3
 */
export function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const { shouldAnimate, isMobile } = useAnimation()

  useEffect(() => {
    // Skip parallax on mobile for performance
    if (!shouldAnimate || isMobile || !ref.current) return

    let ctx: { revert: () => void } | undefined

    import('@/lib/gsap-registry').then(({ gsap }) => {
      if (!ref.current) return

      ctx = gsap.context(() => {
        gsap.to(ref.current, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [shouldAnimate, isMobile, speed])

  return ref
}
