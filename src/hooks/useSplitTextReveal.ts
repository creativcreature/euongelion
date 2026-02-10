'use client'

import { useRef, useCallback } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'
import { GSAP as GSAP_CONFIG } from '@/lib/animation-config'

/**
 * Word-by-word text reveal via GSAP ScrollTrigger.
 * Works with React-native split text spans (from split-text.ts).
 *
 * Usage:
 *   const { containerRef, onReady } = useSplitTextReveal()
 *   <div ref={containerRef}>{splitIntoWords(text)}</div>
 */
export function useSplitTextReveal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { shouldAnimate } = useAnimation()

  const onReady = useCallback(() => {
    if (!shouldAnimate || !containerRef.current) return

    // Lazy-import GSAP to avoid SSR bundle
    import('@/lib/gsap-registry').then(({ gsap, ScrollTrigger }) => {
      const el = containerRef.current
      if (!el) return

      const words = el.querySelectorAll('[data-word-index]')
      if (words.length === 0) return

      gsap.set(words, { opacity: 0, y: 12 })

      gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: GSAP_CONFIG.duration.reveal,
        ease: GSAP_CONFIG.ease.reveal,
        stagger: GSAP_CONFIG.stagger.fast,
        scrollTrigger: {
          trigger: el,
          start: GSAP_CONFIG.scrollTrigger.start,
          toggleActions: GSAP_CONFIG.scrollTrigger.toggleActions,
        },
        onComplete: () => {
          // Clean up will-change after animation
          words.forEach((w) => {
            ;(w as HTMLElement).style.willChange = 'auto'
          })
        },
      })

      // Refresh ScrollTrigger after setup
      ScrollTrigger.refresh()
    })
  }, [shouldAnimate])

  return { containerRef, onReady }
}
