'use client'

import { useEffect, useRef } from 'react'

/**
 * Adds `data-in="true"` to the element once it has entered the viewport, and
 * keeps it there. Staged reveals are done in CSS off that attribute, so the
 * whole page still reads correctly with JavaScript disabled: the default state
 * in CSS is visible, and the observer only *delays* the entrance.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      el.setAttribute('data-in', 'true')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.setAttribute('data-in', 'true')
            io.unobserve(el)
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return ref
}
