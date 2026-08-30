'use client'

import { useEffect, useRef } from 'react'

/**
 * The light spine.
 *
 * ONE idea drives every motion decision on this page: it opens in darkness over
 * the face of the deep and ends in full light. That is not decoration — it is
 * the shape of the story. This component owns a single custom property,
 * `--room-light` (0 → 1), written on the page root as you scroll. CSS does the
 * rest: ground colour, type colour, veil opacity, plate dot density.
 *
 * The research reason: 2026 Awwwards judging rewards "art direction with a clear
 * point of view where every type choice, colour and grid serves a single idea"
 * and "directed motion — not animation for its own sake, but choreography with
 * transitions that carry meaning". A page-length light change derived from the
 * content is exactly that, and it needs no WebGL.
 *
 * THE ONE DIP IS SCRIPTURE'S, NOT MINE. Matthew 27:45 — "From the sixth hour
 * until the ninth hour darkness came over all the land." Luke 23:44 agrees. So
 * Room 05 declares a `data-light-dip`, and the spine falls there instead of
 * rising. Every other room rises monotonically. The page obeys the text
 * describing the sky.
 *
 * Rooms declare their own light with `data-light="0.42"`; the spine interpolates
 * between the room you are leaving and the one you are entering, so the value is
 * continuous rather than stepped.
 */
export default function LightSpine({
  rootRef,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
}) {
  const raf = useRef(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      // A fixed, legible mid-value rather than an animation. Not a blanket
      // "animation: none" — the page still has a considered ground.
      root.style.setProperty('--room-light', '0.55')
      return
    }

    const rooms = Array.from(
      root.querySelectorAll<HTMLElement>('[data-light]'),
    ).map((el) => ({
      el,
      light: parseFloat(el.dataset.light ?? '0'),
      dip: el.dataset.dip === 'true',
    }))
    if (!rooms.length) return

    /** How dark the ninth hour goes. Matthew 27:45 / Luke 23:44. */
    const DIP_FLOOR = 0.18

    let running = true
    let current = 0

    const measure = () => {
      const mid = window.innerHeight * 0.5
      // Find the room straddling the middle of the viewport, and how far
      // through it we are.
      for (let i = 0; i < rooms.length; i++) {
        const r = rooms[i].el.getBoundingClientRect()
        if (r.top <= mid && r.bottom >= mid) {
          const within = (mid - r.top) / Math.max(r.height, 1)
          const next = rooms[i + 1]?.light ?? rooms[i].light
          const base = rooms[i].light + (next - rooms[i].light) * within

          // THE ONE DIP, AND SCRIPTURE PUT IT THERE. Matthew 27:45: "From the
          // sixth hour until the ninth hour darkness came over all the land."
          // A half-sine is zero at both edges and one in the middle, so the
          // room still enters at its own light and leaves at the next room's —
          // it just goes dark in between. The page obeys the text describing
          // the sky rather than a designer choosing drama.
          if (rooms[i].dip) {
            const fall = Math.sin(Math.PI * Math.min(Math.max(within, 0), 1))
            return base - (base - DIP_FLOOR) * fall
          }
          return base
        }
      }
      // Above the first room, or past the last.
      const first = rooms[0].el.getBoundingClientRect()
      if (first.top > mid) return rooms[0].light
      return rooms[rooms.length - 1].light
    }

    const tick = () => {
      if (!running) return
      const target = measure()
      current += (target - current) * 0.14
      root.style.setProperty('--room-light', current.toFixed(4))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf.current)
    }
  }, [rootRef])

  return null
}
