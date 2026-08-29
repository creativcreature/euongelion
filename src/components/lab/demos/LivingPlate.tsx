'use client'

/**
 * MOVE 1 — the living halftone. The animated imagery treatment.
 *
 * This is the one the earlier pitch missed. Nous does not ship a static
 * dithered engraving: its hero figure is a LOOPING VIDEO of a dithered
 * classical figure (portal-figure-orb.webm, 1284×1590, loop, muted). The
 * treatment is not "an image with dots on it" — it is a dot field that is
 * ALIVE. That is the whole difference, and it is why every still mock of
 * this idea read as a filter.
 *
 * Generated at runtime rather than pre-rendered, so it works on all 175
 * devotionals instead of one asset, and costs kilobytes not megabytes.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { drawHalftone, sampleGrid, type HalftoneMode } from './halftone'

const MODES: { id: HalftoneMode; label: string; note: string }[] = [
  {
    id: 'resolve',
    label: 'RESOLVE',
    note: 'the plate prints itself on arrival — an image that is pressed, not faded in',
  },
  {
    id: 'breathe',
    label: 'BREATHE',
    note: 'density swells and falls — the ink itself is alive, nothing moves position',
  },
  {
    id: 'scan',
    label: 'SCAN',
    note: 'a band of heavier ink travels the plate, like a press roller',
  },
  { id: 'still', label: 'STILL', note: 'no motion — the honest baseline' },
]

export default function LivingPlate({
  src = '/images/site/series/abiding-in-his-presence.webp',
  ratio = 1600 / 872,
}: {
  src?: string
  ratio?: number
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const gridRef = useRef<ReturnType<typeof sampleGrid>>(null)
  const raf = useRef(0)
  const start = useRef(0)

  const [cell, setCell] = useState(9)
  const [gain, setGain] = useState(1)
  const [mode, setMode] = useState<HalftoneMode>('resolve')
  const [showSource, setShowSource] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      imgRef.current = im
      setReady(true)
    }
    im.src = src
  }, [src])

  /** Re-average the source into the coarse grid. Only on size/cell change. */
  const resample = useCallback(() => {
    const cv = canvas.current
    const im = imgRef.current
    if (!cv || !im) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = cv.clientWidth
    if (!w) return
    const h = Math.round(w / ratio)
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    cv.style.height = `${h}px`
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    gridRef.current = sampleGrid(im, w, h, cell)
  }, [cell, ratio])

  useEffect(() => {
    if (!ready) return
    resample()
    const ro = new ResizeObserver(resample)
    const cv = canvas.current
    if (cv) ro.observe(cv)
    return () => ro.disconnect()
  }, [ready, resample])

  /** ONE render path, used by the mount loop and by replay alike. */
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cs = getComputedStyle(cv)
    const ink = cs.getPropertyValue('--lab-ink').trim() || '#1f2a8d'
    const paper = cs.getPropertyValue('--lab-paper').trim() || '#f0ece6'
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const frame = () => {
      const grid = gridRef.current
      if (!grid) return
      const elapsed = (performance.now() - start.current) / 1000
      let t = 1
      if (!reduced && mode !== 'still') {
        t = mode === 'resolve' ? Math.min(1, elapsed / 1.5) : (elapsed / 4) % 1
      }
      drawHalftone(ctx, grid, cv.clientWidth, cv.clientHeight, {
        cell,
        mode,
        t,
        gain,
        ink,
        paper,
      })
      // `resolve` is an entrance: it settles and stops. The rest loop.
      const settled =
        reduced || mode === 'still' || (mode === 'resolve' && t >= 1)
      if (!settled) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
  }, [mode, cell, gain])

  useEffect(() => {
    if (!ready) return
    start.current = performance.now()
    run()
    return () => cancelAnimationFrame(raf.current)
  }, [ready, run])

  const replay = () => {
    start.current = performance.now()
    if ('vibrate' in navigator) navigator.vibrate?.(8)
    run()
  }

  return (
    <div className="lab-demo">
      <div className="lab-plate-wrap" style={{ aspectRatio: String(ratio) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="lab-plate-src"
          style={{ opacity: showSource ? 1 : 0 }}
        />
        <canvas
          ref={canvas}
          className="lab-plate-canvas"
          style={{ opacity: showSource ? 0 : 1 }}
        />
      </div>

      <div className="lab-ctls">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={m.id === mode ? 'on' : ''}
            onClick={() => {
              setMode(m.id)
              start.current = performance.now()
              if ('vibrate' in navigator) navigator.vibrate?.(6)
            }}
          >
            {m.label}
          </button>
        ))}
        <button onClick={replay}>↻ replay</button>
        <button
          className={showSource ? 'on' : ''}
          onClick={() => setShowSource((s) => !s)}
        >
          {showSource ? 'SHOWING SOURCE' : 'compare to source'}
        </button>
        <label className="lab-slider">
          dot {cell}px
          <input
            type="range"
            min={4}
            max={22}
            value={cell}
            onChange={(e) => setCell(+e.target.value)}
          />
        </label>
        <label className="lab-slider">
          ink gain {gain.toFixed(2)}
          <input
            type="range"
            min={70}
            max={140}
            value={Math.round(gain * 100)}
            onChange={(e) => setGain(+e.target.value / 100)}
          />
        </label>
      </div>
      <p className="lab-hint">
        {MODES.find((m) => m.id === mode)?.note}. Pull <strong>dot</strong> to
        4px and it reads as photography; at 16px it reads as print. Hit{' '}
        <strong>compare to source</strong> to see the plate it is made from —
        that toggle is the proof this is generated, not a supplied asset.
      </p>
    </div>
  )
}
