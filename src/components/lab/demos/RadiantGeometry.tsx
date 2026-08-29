'use client'

/**
 * MOVE 5 — radiating hairline geometry.
 *
 * Hermes bursts thin rays from behind its engraving. On a devotional this is
 * not decoration: radiance behind the subject is the oldest visual language
 * the church has — a nimbus, drawn by a machine.
 *
 * The rays DRAW rather than fade: each is a stroked path revealed by
 * stroke-dashoffset, staggered from the centre outward. Hairline only, and
 * no bloom — the brand refuses glow.
 */
import { useMemo, useState } from 'react'

export default function RadiantGeometry({
  src = '/images/site/series/the-harvest.webp',
}: {
  src?: string
}) {
  const [count, setCount] = useState(28)
  const [run, setRun] = useState(0)
  const [rings, setRings] = useState(true)

  const rays = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2
        // Alternating lengths stop it reading as a bicycle wheel.
        const len = i % 3 === 0 ? 47 : i % 2 === 0 ? 38 : 30
        return {
          x2: 50 + Math.cos(a) * len,
          y2: 50 + Math.sin(a) * len,
          d: (i % 7) * 45 + Math.floor(i / 7) * 20,
        }
      }),
    [count],
  )

  return (
    <div className="lab-demo">
      <div className="lab-radiant">
        <svg
          key={`${count}-${rings}-${run}`}
          className="lab-rays"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {rays.map((r, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={r.x2}
              y2={r.y2}
              style={{ animationDelay: `${r.d}ms` }}
            />
          ))}
          {rings &&
            [18, 30, 43].map((rr, i) => (
              <circle
                key={rr}
                cx="50"
                cy="50"
                r={rr}
                className="lab-ring"
                style={{ animationDelay: `${420 + i * 130}ms` }}
              />
            ))}
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="lab-radiant-plate" />
      </div>
      <div className="lab-ctls">
        <button
          onClick={() => {
            setRun((r) => r + 1)
            if ('vibrate' in navigator) navigator.vibrate?.(8)
          }}
        >
          ↻ draw again
        </button>
        <button
          className={rings ? 'on' : ''}
          onClick={() => setRings((v) => !v)}
        >
          rings
        </button>
        <label className="lab-slider">
          rays {count}
          <input
            type="range"
            min={8}
            max={64}
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          />
        </label>
      </div>
      <p className="lab-hint">
        <strong>Hit draw again.</strong> The rays are stroked on from the centre
        in a stagger, not faded in — you can watch each one arrive. Hairline
        weight is deliberate: any thicker and it becomes a sunburst graphic
        instead of a halo.
      </p>
    </div>
  )
}
