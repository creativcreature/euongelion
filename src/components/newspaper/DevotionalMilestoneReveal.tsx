'use client'

import type { CSSProperties, ReactNode } from 'react'
import FadeIn from '@/components/motion/FadeIn'

interface DevotionalMilestoneRevealProps {
  children: ReactNode
  delay?: number
  className?: string
  variant?: 'editorial' | 'cinematic'
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'p'
  style?: CSSProperties
}

export default function DevotionalMilestoneReveal({
  children,
  delay = 0,
  className = '',
  variant = 'editorial',
  as = 'div',
  style,
}: DevotionalMilestoneRevealProps) {
  const cinematic = variant === 'cinematic'

  return (
    <FadeIn
      as={as}
      className={className}
      delay={delay}
      y={cinematic ? 34 : 18}
      duration={cinematic ? 1.05 : 0.72}
      style={style}
    >
      {children}
    </FadeIn>
  )
}
