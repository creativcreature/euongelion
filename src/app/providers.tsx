'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AnimationProvider from '@/providers/AnimationProvider'
import EditorialMotionSystem from '@/components/EditorialMotionSystem'
import NetworkStatusBanner from '@/components/NetworkStatusBanner'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const unlockGlobalScroll = () => {
      // Defensive global unlock so legacy menu locks cannot freeze page scroll.
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-x')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('position')
      document.body.style.removeProperty('top')
      document.body.style.removeProperty('width')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('position')
      document.documentElement.classList.remove('lenis-stopped')
    }

    unlockGlobalScroll()

    const onPageShow = () => unlockGlobalScroll()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        unlockGlobalScroll()
      }
    }

    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pathname])

  return (
    <AnimationProvider>
      <EditorialMotionSystem />
      <NetworkStatusBanner />
      {children}
    </AnimationProvider>
  )
}
