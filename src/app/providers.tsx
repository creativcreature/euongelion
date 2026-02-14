'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AnimationProvider from '@/providers/AnimationProvider'
import EditorialMotionSystem from '@/components/EditorialMotionSystem'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Defensive global unlock so legacy menu locks cannot freeze page scroll.
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('position')
    document.body.style.removeProperty('top')
    document.body.style.removeProperty('width')
    document.documentElement.style.removeProperty('overflow')
    document.documentElement.style.removeProperty('position')
    document.documentElement.classList.remove('lenis-stopped')
  }, [pathname])

  return (
    <AnimationProvider>
      <EditorialMotionSystem />
      {children}
    </AnimationProvider>
  )
}
