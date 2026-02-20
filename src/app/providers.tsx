'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AnimationProvider from '@/providers/AnimationProvider'
import EditorialMotionSystem from '@/components/EditorialMotionSystem'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const textScale = useSettingsStore((state) => state.textScale)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)
  const highContrast = useSettingsStore((state) => state.highContrast)
  const readingComfort = useSettingsStore((state) => state.readingComfort)

  useEffect(() => {
    const unlockGlobalScroll = () => {
      // Defensive global unlock so stale menu locks cannot freeze page scroll.
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
      for (const klass of [
        'lenis',
        'lenis-smooth',
        'lenis-scrolling',
        'lenis-stopped',
      ]) {
        document.body.classList.remove(klass)
        document.documentElement.classList.remove(klass)
      }
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

  useEffect(() => {
    const root = document.documentElement
    root.dataset.textScale = textScale
    root.dataset.highContrast = highContrast ? 'on' : 'off'
    root.dataset.readingComfort = readingComfort ? 'on' : 'off'
    root.classList.toggle('reduce-motion', reduceMotion)
  }, [highContrast, readingComfort, reduceMotion, textScale])

  return (
    <AnimationProvider>
      <EditorialMotionSystem />
      {children}
      <CookieConsentBanner />
    </AnimationProvider>
  )
}
