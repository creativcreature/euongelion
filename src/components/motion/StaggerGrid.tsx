'use client'

import { type ReactNode } from 'react'
import { useStaggerReveal } from '@/hooks/useStaggerReveal'

interface StaggerGridProps {
  children: ReactNode
  /** CSS selector for items to stagger (default: '> *') */
  selector?: string
  className?: string
}

/**
 * Container that staggers children into view on scroll.
 * Used for series grids, featured cards, etc.
 */
export default function StaggerGrid({
  children,
  selector = '> *',
  className = '',
}: StaggerGridProps) {
  const ref = useStaggerReveal(selector)

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
