'use client'

import type { ReactNode } from 'react'
import AnimationProvider from '@/providers/AnimationProvider'
import LenisProvider from '@/providers/LenisProvider'

/**
 * Client-side providers wrapper.
 * AnimationProvider must wrap LenisProvider (Lenis reads reduced-motion from it).
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AnimationProvider>
      <LenisProvider>{children}</LenisProvider>
    </AnimationProvider>
  )
}
