'use client'

import type { ReactNode } from 'react'
import AnimationProvider from '@/providers/AnimationProvider'
import EditorialMotionSystem from '@/components/EditorialMotionSystem'

/**
 * Client-side providers wrapper.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AnimationProvider>
      <EditorialMotionSystem />
      {children}
    </AnimationProvider>
  )
}
