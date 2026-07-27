'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AnimationProvider from '@/providers/AnimationProvider'
import EditorialMotionSystem from '@/components/EditorialMotionSystem'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const textScale = useSettingsStore((state) => state.textScale)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)
  const highContrast = useSettingsStore((state) => state.highContrast)
  const readingComfort = useSettingsStore((state) => state.readingComfort)

  // F-084 theme fix (SA-033, 2026-07-27): in System mode the theme was
  // sampled from the OS once and never again — switching the OS between
  // light and dark did nothing until a reload. Subscribe to the media
  // query while (and only while) System is selected.
  const theme = useUIStore((s) => s.theme)
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.classList.toggle('dark', mq.matches)
      window.dispatchEvent(
        new CustomEvent('euangelion:site-theme', {
          detail: { theme: mq.matches ? 'dark' : 'light' },
        }),
      )
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

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
