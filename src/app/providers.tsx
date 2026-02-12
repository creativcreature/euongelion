'use client'

import type { ReactNode } from 'react'
import AnimationProvider from '@/providers/AnimationProvider'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <AnimationProvider>{children}</AnimationProvider>
}
