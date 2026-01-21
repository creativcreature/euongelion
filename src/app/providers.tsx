'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { InstallPrompt } from '@/components/ui/InstallPrompt'

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('SW registration failed:', error)
      })
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistration />
      {children}
      <InstallPrompt />
    </AuthProvider>
  )
}
