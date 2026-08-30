'use client'

import { useEffect, useState } from 'react'

const ROOMS = [
  { id: 'room-01', label: 'Someone' },
  { id: 'room-02', label: 'The story' },
  { id: 'room-03', label: 'The names' },
  { id: 'room-04', label: 'Father, Son, Spirit' },
  { id: 'room-05', label: 'The ninth hour' },
  { id: 'room-06', label: 'Being saved' },
  { id: 'room-07', label: 'The threshold' },
]

/**
 * Where you are in the seven rooms.
 *
 * Long-form pieces since Snow Fall carry a persistent position indicator,
 * because a reader who cannot see how much is left will not start. The numerals
 * are set monospace — the Nous portal pattern of using a technical readout for
 * anything numeric.
 *
 * It is REAL NAVIGATION, not decoration: each entry is an anchor, so the rail is
 * keyboard-reachable and a reader can jump straight to Room 07 if what they
 * actually need is the phone number rather than the theology. That matters more
 * on this page than on most.
 */
export default function ProgressRail() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = ROOMS.map((r) => document.getElementById(r.id)).filter(
      Boolean,
    ) as HTMLElement[]
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = els.indexOf(e.target as HTMLElement)
          if (i >= 0) setActive(i)
        }
      },
      { rootMargin: '-45% 0px -55% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <nav className="wig-rail" aria-label="The seven rooms">
      <ol>
        {ROOMS.map((r, i) => (
          <li key={r.id} data-on={i <= active} data-current={i === active}>
            <a href={`#${r.id}`}>
              <span className="wig-rail-n">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="wig-rail-label">{r.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
