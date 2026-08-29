'use client'

/**
 * MOVE 2 — the plate becomes a diagram.
 *
 * Anchored callouts tethered to points in the artwork by hairline leaders.
 * Lineage: Igloo anchors 2D labels onto 3D geometry; Nous Portal terminates
 * dotted leaders in bracketed indices.
 *
 * Why it earns its place on a devotional: the plate stops being decoration
 * and becomes a READING of the reading. Anchors are per-plate data — a
 * fractional coordinate and a label, which is authorable alongside the
 * devotional itself.
 */
import { useEffect, useRef, useState } from 'react'

interface Anchor {
  /** Fractional position on the plate, so it survives any crop or size. */
  x: number
  y: number
  label: string
  /** Which way the label sits, so it never covers the subject. */
  side: 'l' | 'r'
}

/**
 * Placed against THIS plate by eye: the gnarled trunk sits left of centre,
 * the bearing branch runs up-right, the grapes hang top-right, and the root
 * mass spreads along the bottom. Anchors are fractional so they survive any
 * crop or container size.
 */
const ANCHORS: Anchor[] = [
  { x: 0.225, y: 0.55, label: 'the vine', side: 'l' },
  { x: 0.47, y: 0.33, label: 'the branch', side: 'r' },
  { x: 0.645, y: 0.27, label: 'the fruit', side: 'r' },
  { x: 0.3, y: 0.82, label: 'the vinedresser', side: 'l' },
]

/** Where a label sits vertically: near its own anchor, kept off the edges. */
function labelY(a: Anchor) {
  return Math.min(80, Math.max(8, a.y * 100 - 6))
}

export default function DiagramPlate({
  src = '/images/site/series/abiding-in-his-presence.webp',
  ratio = 1600 / 872,
}: {
  src?: string
  ratio?: number
}) {
  const [on, setOn] = useState(true)
  const [shown, setShown] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Stagger the callouts in along their leaders.
  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!on) {
      setShown(0)
      return
    }
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setShown(ANCHORS.length)
      return
    }
    setShown(0)
    ANCHORS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setShown(i + 1), 140 + i * 170))
    })
    return () => timers.current.forEach(clearTimeout)
  }, [on])

  return (
    <div className="lab-demo">
      <div
        className="lab-plate-wrap lab-diagram"
        style={{ aspectRatio: String(ratio) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="lab-plate-src"
          style={{ opacity: 1 }}
        />

        {/*
          NO viewBox: percentage coordinates resolve against the element's own
          box, so nothing is skewed by the plate's aspect ratio and stroke
          widths stay in real pixels. A stretched viewBox turned the anchor
          dots into ellipses and shrank the leaders to 0.28 user units — i.e.
          invisible. Each leader is drawn TWICE: a pale casing underneath and
          a dark line on top, which is how a technical diagram stays legible
          over artwork of any value.
        */}
        <svg className="lab-leaders">
          {ANCHORS.map((a, i) => {
            const tx = a.side === 'l' ? '4%' : '96%'
            const ty = `${labelY(a) + 2.2}%`
            const ax = `${a.x * 100}%`
            const ay = `${a.y * 100}%`
            return (
              <g
                key={i}
                className={`lab-leader ${i < shown ? 'in' : ''} ${active === i ? 'hot' : ''}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <line className="case" x1={ax} y1={ay} x2={tx} y2={ty} />
                <line className="ink" x1={ax} y1={ay} x2={tx} y2={ty} />
                <circle className="case" cx={ax} cy={ay} r="5" />
                <circle className="ink" cx={ax} cy={ay} r="2.6" />
              </g>
            )
          })}
        </svg>

        {ANCHORS.map((a, i) => (
          <button
            key={i}
            className={`lab-callout ${a.side} ${i < shown ? 'in' : ''} ${active === i ? 'hot' : ''}`}
            style={{
              top: `${labelY(a)}%`,
              transitionDelay: `${i * 70}ms`,
            }}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onClick={() => {
              setActive(active === i ? null : i)
              if ('vibrate' in navigator) navigator.vibrate?.(6)
            }}
          >
            <span className="lab-callout-i">[{i + 1}]</span> {a.label}
          </button>
        ))}
      </div>

      <div className="lab-ctls">
        <button className={!on ? 'on' : ''} onClick={() => setOn(false)}>
          PLATE
        </button>
        <button className={on ? 'on' : ''} onClick={() => setOn(true)}>
          DIAGRAM
        </button>
        <button
          onClick={() => {
            setOn(false)
            setTimeout(() => setOn(true), 60)
          }}
        >
          ↻ replay
        </button>
      </div>
      <p className="lab-hint">
        Hover or tap a callout — the leader and its anchor light together, so
        the label and the thing it names are unmistakably linked. The anchors
        here are hand-placed for a vine plate; in production they are four
        numbers authored with the devotional.
      </p>
    </div>
  )
}
