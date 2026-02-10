'use client'

import { type ReactNode } from 'react'
import { useGoldHighlight } from '@/hooks/useGoldHighlight'

interface GoldHighlightProps {
  children: ReactNode
  className?: string
}

/**
 * Applies animated gold gradient highlight on scroll.
 * Background-clip text technique for gold-shimmer reveal.
 */
export default function GoldHighlight({
  children,
  className = '',
}: GoldHighlightProps) {
  const ref = useGoldHighlight()

  return (
    <span
      ref={ref}
      className={className}
      style={{
        background:
          'linear-gradient(135deg, #c19a6b 0%, #d4af7f 50%, #c19a6b 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '0% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {children}
    </span>
  )
}
