'use client'

import { useRef, useEffect, type CSSProperties, type ReactNode } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'
import { GSAP as GSAP_CONFIG } from '@/lib/animation-config'

interface FadeInProps {
  children: ReactNode
  /** Delay in seconds before animation starts */
  delay?: number
  /** Y offset in pixels (default 24) */
  y?: number
  /** Duration in seconds */
  duration?: number
  /** Element tag */
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'p'
  className?: string
  style?: CSSProperties
}

/**
 * Scroll-triggered fade-in via GSAP.
 * Replaces the old observe-fade + IntersectionObserver pattern.
 *
 * Progressive: content is visible in HTML. GSAP adds animation from JS.
 */
export default function FadeIn({
  children,
  delay = 0,
  y = 24,
  duration = GSAP_CONFIG.duration.base,
  as: Tag = 'div',
  className = '',
  style,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { shouldAnimate } = useAnimation()

  useEffect(() => {
    if (!shouldAnimate || !ref.current) return

    let ctx: { revert: () => void } | undefined

    import('@/lib/gsap-registry').then(({ gsap }) => {
      if (!ref.current) return

      ctx = gsap.context(() => {
        gsap.from(ref.current, {
          opacity: 0,
          y,
          duration,
          delay,
          ease: GSAP_CONFIG.ease.smooth,
          scrollTrigger: {
            trigger: ref.current,
            start: GSAP_CONFIG.scrollTrigger.start,
            toggleActions: GSAP_CONFIG.scrollTrigger.toggleActions,
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [shouldAnimate, delay, y, duration])

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  )
}
