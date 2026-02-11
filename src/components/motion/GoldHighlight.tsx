'use client'

import { type ReactNode } from 'react'

interface GoldHighlightProps {
  children: ReactNode
  className?: string
}

/** Applies flat ink accent highlight (no glow/shimmer effects). */
export default function GoldHighlight({
  children,
  className = '',
}: GoldHighlightProps) {
  return <span className={`text-gold ${className}`}>{children}</span>
}
