'use client'

import { useRef, useEffect } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'

/**
 * Gold highlight animation — text gets gold-shimmer treatment on scroll.
 * Uses background-clip text trick for gradient reveal.
 */
export function useGoldHighlight() {
  const ref = useRef<HTMLSpanElement>(null)
  const { shouldAnimate } = useAnimation()

  useEffect(() => {
    if (!shouldAnimate || !ref.current) return

    let ctx: { revert: () => void } | undefined

    import('@/lib/gsap-registry').then(({ gsap }) => {
      if (!ref.current) return

      ctx = gsap.context(() => {
        gsap.fromTo(
          ref.current,
          { backgroundSize: '0% 100%' },
          {
            backgroundSize: '100% 100%',
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          },
        )
      })
    })

    return () => ctx?.revert()
  }, [shouldAnimate])

  return ref
}
