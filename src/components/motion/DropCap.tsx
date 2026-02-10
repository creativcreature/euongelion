'use client'

import { useRef, useEffect } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'

interface DropCapProps {
  /** The full paragraph text — first letter becomes drop cap */
  children: string
  className?: string
}

/**
 * Drop cap paragraph — first letter is large Cormorant Garamond in gold.
 * Animates the drop cap letter on scroll (scale + opacity).
 * Uses CSS ::first-letter via the `drop-cap` class from typography-craft.css.
 */
export default function DropCap({ children, className = '' }: DropCapProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { shouldAnimate } = useAnimation()

  useEffect(() => {
    if (!shouldAnimate || !ref.current) return

    let ctx: { revert: () => void } | undefined

    import('@/lib/gsap-registry').then(({ gsap }) => {
      if (!ref.current) return

      ctx = gsap.context(() => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 16,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      })
    })

    return () => ctx?.revert()
  }, [shouldAnimate])

  return (
    <p ref={ref} className={`drop-cap type-prose ${className}`}>
      {children}
    </p>
  )
}
