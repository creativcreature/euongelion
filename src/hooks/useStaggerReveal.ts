'use client'

import { useRef, useEffect } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'
import { GSAP as GSAP_CONFIG } from '@/lib/animation-config'

/**
 * Stagger reveal for grid items via GSAP ScrollTrigger.
 * Children animate in one by one when scrolled into view.
 *
 * @param selector - CSS selector for children to stagger (default: '> *')
 */
export function useStaggerReveal(selector = '> *') {
  const ref = useRef<HTMLDivElement>(null)
  const { shouldAnimate } = useAnimation()

  useEffect(() => {
    if (!shouldAnimate || !ref.current) return

    let ctx: { revert: () => void } | undefined

    import('@/lib/gsap-registry').then(({ gsap }) => {
      if (!ref.current) return

      const children = ref.current.querySelectorAll(selector)
      if (children.length === 0) return

      ctx = gsap.context(() => {
        gsap.from(children, {
          opacity: 0,
          y: 24,
          duration: GSAP_CONFIG.duration.base,
          ease: GSAP_CONFIG.ease.smooth,
          stagger: GSAP_CONFIG.stagger.base,
          scrollTrigger: {
            trigger: ref.current,
            start: GSAP_CONFIG.scrollTrigger.start,
            toggleActions: GSAP_CONFIG.scrollTrigger.toggleActions,
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [shouldAnimate, selector])

  return ref
}
