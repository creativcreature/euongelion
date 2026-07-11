'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  onClose: () => void
  duration?: number
}

/**
 * Minimal toast notification — appears at bottom center, auto-dismisses.
 * Uses z-index token --z-toast.
 */
export default function Toast({
  message,
  visible,
  onClose,
  duration = 2500,
}: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) return

    // Small delay for enter animation
    const raf = requestAnimationFrame(() => setShow(true))

    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onClose, 300) // Wait for exit animation
    }, duration)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      setShow(false) // Reset animation state for next show
    }
  }, [visible, duration, onClose])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 px-6 py-3 text-label vw-small bottom-[calc(env(safe-area-inset-bottom,0px)+4.3rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+2rem)]"
      style={{
        zIndex: 'var(--z-toast)',
        backgroundColor: 'var(--color-fg)',
        color: 'var(--color-bg)',
        opacity: show ? 1 : 0,
        transform: `translateX(-50%) translateY(${show ? '0' : '8px'})`,
        transition:
          'opacity var(--motion-base) var(--motion-ease), transform var(--motion-base) var(--motion-ease)',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  )
}
