'use client'

import { useState, useEffect, useRef } from 'react'

type ScrollDirection = 'up' | 'down' | null

/**
 * Detects scroll direction for nav hide/show.
 * Returns 'up' (show nav), 'down' (hide nav), or null (at top).
 */
export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState<ScrollDirection>(null)
  const [atTop, setAtTop] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const updateDirection = () => {
      const scrollY = window.scrollY

      setAtTop(scrollY < threshold)

      if (Math.abs(scrollY - lastScrollY.current) < threshold) {
        ticking.current = false
        return
      }

      setDirection(scrollY > lastScrollY.current ? 'down' : 'up')
      lastScrollY.current = scrollY > 0 ? scrollY : 0
      ticking.current = false
    }

    let frame = 0
    const onScroll = () => {
      if (!ticking.current) {
        frame = requestAnimationFrame(() => {
          frame = 0
          updateDirection()
        })
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      // A frame queued at unmount would otherwise still run and set state on
      // a component that no longer exists.
      if (frame) cancelAnimationFrame(frame)
      ticking.current = false
    }
  }, [threshold])

  return { direction, atTop }
}
