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
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
    document.documentElement.classList.remove('lenis-stopped')
  }, [pathname])

  return (
    <AnimationProvider>
      <EditorialMotionSystem />
      {children}
    </AnimationProvider>
  )
}
