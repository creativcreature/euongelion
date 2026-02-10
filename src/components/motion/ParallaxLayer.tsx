'use client'

import { type ReactNode } from 'react'
import { useParallax } from '@/hooks/useParallax'

interface ParallaxLayerProps {
  children: ReactNode
  /** Parallax intensity: 0 = none, 1 = full (default 0.3) */
  speed?: number
  className?: string
}

/**
 * Wrapper that applies parallax scroll effect to its children.
 * Disabled on mobile for performance.
 */
export default function ParallaxLayer({
  children,
  speed = 0.3,
  className = '',
}: ParallaxLayerProps) {
  const ref = useParallax(speed)

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
