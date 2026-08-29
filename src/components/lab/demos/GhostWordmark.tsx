'use client'

/**
 * MOVE 4 — the ghosted wordmark, with parallax.
 *
 * Hermes sets an oversized low-opacity wordmark BEHIND its hero engraving.
 * Ours is EUANGELION at enormous scale sitting behind the day's plate, and
 * the two planes move against each other — the depth is what stops it being
 * a watermark.
 *
 * Travel is capped at the site's own ±28px parallax limit. Depth, not drift.
 */
import { useEffect, useRef, useState } from 'react'

export default function GhostWordmark({
  src = '/images/site/series/he-cannot-deny-himself.webp',
}: {
  src?: string
}) {
  const wrap = useRef<HTMLDivElement | null>(null)
  const [depth, setDepth] = useState(1)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        // 28px is the site's documented cap; depth scales within it.
        el.style.setProperty('--gx', `${(nx * 28 * depth).toFixed(2)}px`)
        el.style.setProperty('--gy', `${(ny * 16 * depth).toFixed(2)}px`)
        el.style.setProperty('--px', `${(nx * -9 * depth).toFixed(2)}px`)
        el.style.setProperty('--py', `${(ny * -6 * depth).toFixed(2)}px`)
      })
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      el.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [depth])

  return (
    <div className="lab-demo">
      <div className="lab-ghost" ref={wrap}>
        <span
          className="lab-ghost-mark"
          style={{ fontSize: `${scale * 13}cqw` }}
        >
          EUANGELION
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="lab-ghost-plate" />
      </div>
      <div className="lab-ctls">
        <label className="lab-slider">
          depth {depth.toFixed(1)}×
          <input
            type="range"
            min={0}
            max={30}
            value={depth * 10}
            onChange={(e) => setDepth(+e.target.value / 10)}
          />
        </label>
        <label className="lab-slider">
          mark scale {scale.toFixed(2)}
          <input
            type="range"
            min={60}
            max={180}
            value={scale * 100}
            onChange={(e) => setScale(+e.target.value / 100)}
          />
        </label>
      </div>
      <p className="lab-hint">
        <strong>Move the pointer across the plate.</strong> The wordmark and the
        plate travel in opposite directions — that opposition is the whole
        effect. Pull depth to 0 and it collapses into a flat watermark, which is
        what this looks like when it is done badly.
      </p>
    </div>
  )
}
