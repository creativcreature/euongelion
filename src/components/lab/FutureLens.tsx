'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FUTURES, type SurfaceId } from '@/lib/lab/futures'

/**
 * LAB — the interaction layer for the seven futures.
 *
 * One island drives all seven, because they share a stage and only differ in
 * what they do to it. Everything it touches is either a CSS custom property on
 * the stage or a canvas it owns; it never rewrites the real surface's DOM, so
 * a treatment can be removed by deleting its branch and nothing is left behind.
 *
 * THE WORD IS NEVER TOUCHED. The dither pass explicitly skips any image inside
 * `.devotional-prose`, and no branch writes a filter onto prose or scripture.
 */

/** The classic 4×4 ordered (Bayer) threshold matrix, normalised at use. */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** 8×8, generated from the 4×4 by the standard recurrence. Bigger matrix =
 *  finer crosshatch = closer to continuous tone. */
function bayer8(): number[][] {
  const out: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0))
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const q = BAYER4[y % 4][x % 4]
      out[y][x] = q * 4 + BAYER4[Math.floor(y / 4) % 4][Math.floor(x / 4) % 4]
    }
  }
  return out
}

/** The two inks. Shadow is dot density, never grey — the house rule. */
const INK = { r: 0x1f, g: 0x2a, b: 0x8d }
const PAPER = { r: 0xf0, g: 0xec, b: 0xe6 }

function ditherInto(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  matrix: 4 | 8,
  levels: number,
) {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return
  // Cap the working size: a 2400px plate quantised per-pixel on the main
  // thread is the one way this concept could hurt the page it is decorating.
  const scale = Math.min(1, 900 / w)
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.drawImage(img, 0, 0, cw, ch)
  let data: ImageData
  try {
    data = ctx.getImageData(0, 0, cw, ch)
  } catch {
    return // tainted canvas; leave the plate as it was
  }
  const m = matrix === 4 ? BAYER4 : bayer8()
  const n = matrix
  const denom = n * n
  const px = data.data
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4
      // Rec.709 luma — the perceptual one, so the dot ramp matches how the
      // eye reads the plate rather than how the file stores it.
      const lum =
        (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255
      const t = (m[y % n][x % n] + 0.5) / denom
      const stepped = Math.floor(lum * (levels - 1) + t) / (levels - 1)
      const v = Math.max(0, Math.min(1, stepped))
      px[i] = PAPER.r + (INK.r - PAPER.r) * (1 - v)
      px[i + 1] = PAPER.g + (INK.g - PAPER.g) * (1 - v)
      px[i + 2] = PAPER.b + (INK.b - PAPER.b) * (1 - v)
    }
  }
  ctx.putImageData(data, 0, 0)
}

export default function FutureLens({
  concept,
  surface,
  children,
}: {
  concept: string
  surface: SurfaceId
  children: React.ReactNode
}) {
  const stage = useRef<HTMLDivElement | null>(null)
  const [matrix, setMatrix] = useState<4 | 8>(4)
  const [levels, setLevels] = useState(2)
  const [lock, setLock] = useState(1)
  const [ink, setInk] = useState(1)
  const [grid, setGrid] = useState(0)
  const [busy, setBusy] = useState(false)

  const setVar = useCallback((k: string, v: string) => {
    stage.current?.style.setProperty(k, v)
  }, [])

  // ── BAYER — quantise every plate on the page, live. ────────────────────
  const runDither = useCallback(() => {
    const root = stage.current
    if (!root || concept !== 'bayer') return
    setBusy(true)
    const imgs = Array.from(root.querySelectorAll('img')).filter(
      // The Word is never treated: skip anything inside the reading body.
      (im) => !im.closest('.devotional-prose'),
    )
    imgs.forEach((im) => {
      const done = () => {
        let cv = im.nextElementSibling as HTMLCanvasElement | null
        if (!cv || !cv.classList.contains('fut-dither-canvas')) {
          cv = document.createElement('canvas')
          cv.className = 'fut-dither-canvas'
          im.after(cv)
          im.style.display = 'none'
        }
        ditherInto(cv, im, matrix, levels)
      }
      if (im.complete && im.naturalWidth) done()
      else im.addEventListener('load', done, { once: true })
    })
    setBusy(false)
  }, [concept, matrix, levels])

  useEffect(() => {
    if (concept !== 'bayer') return
    const t = setTimeout(runDither, 350)
    return () => clearTimeout(t)
  }, [concept, runDither])

  // ── HOLOGRAM — lay foil OVER each plate, without touching its box. ─────
  // Two failed passes are recorded here because both were instructive:
  //   1. Blending the whole document at color-dodge dodged cream to white and
  //      rendered the page empty.
  //   2. Wrapping each <img> in a span collapsed every `fill` image — the
  //      parent provides the sizing, so an element in between has none, and
  //      the plates rendered as black boxes.
  // The foil is therefore an absolutely-positioned SIBLING inside the image's
  // existing parent. Nothing in the real surface's layout moves at all.
  useEffect(() => {
    if (concept !== 'hologram') return
    const root = stage.current
    if (!root) return
    const added: HTMLElement[] = []
    const touched: { el: HTMLElement; prev: string }[] = []
    root.querySelectorAll('img').forEach((im) => {
      if (im.closest('.devotional-prose')) return
      const parent = im.parentElement as HTMLElement | null
      if (!parent || parent.querySelector(':scope > .fut-foil')) return
      const cs = getComputedStyle(parent)
      if (cs.position === 'static') {
        touched.push({ el: parent, prev: parent.style.position })
        parent.style.position = 'relative'
      }
      const foil = document.createElement('span')
      foil.className = 'fut-foil'
      parent.appendChild(foil)
      added.push(foil)
    })
    return () => {
      added.forEach((f) => f.remove())
      touched.forEach(({ el, prev }) => {
        el.style.position = prev
      })
    }
  }, [concept])

  // ── HOLOGRAM + DIORAMA — pointer drives the stage's own properties. ────
  useEffect(() => {
    if (concept !== 'hologram' && concept !== 'diorama') return
    const root = stage.current
    if (!root) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = root.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        if (concept === 'hologram') {
          // Shallow on purpose. A wordmark that swings is a toy.
          setVar('--fut-rx', `${(nx * 9).toFixed(2)}deg`)
          setVar('--fut-ry', `${(-ny * 7).toFixed(2)}deg`)
          setVar('--fut-gx', `${((nx + 0.5) * 100).toFixed(1)}%`)
          setVar('--fut-gy', `${((ny + 0.5) * 100).toFixed(1)}%`)
        } else {
          // Inside the site's own ±28px cap — "depth, not drift".
          setVar('--fut-px', (nx * 22).toFixed(2))
          setVar('--fut-py', (ny * 14).toFixed(2))
        }
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [concept, setVar])

  useEffect(() => setVar('--fut-lock', String(lock)), [lock, setVar])
  useEffect(() => setVar('--fut-ink', String(ink)), [ink, setVar])
  useEffect(() => setVar('--fut-grid', String(grid)), [grid, setVar])

  // ── PRESS — re-run the impression. ─────────────────────────────────────
  const rerun = useCallback(() => {
    setInk(0)
    const t0 = performance.now()
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 900)
      setInk(p)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])

  // ── PHOSPHOR — degauss, with a haptic tick where the platform allows. ──
  const degauss = useCallback(() => {
    const el = stage.current
    if (!el) return
    el.classList.add('is-degaussing')
    if ('vibrate' in navigator) navigator.vibrate?.(18)
    setTimeout(() => el.classList.remove('is-degaussing'), 540)
  }, [])

  const other: SurfaceId = surface === 'paper' ? 'devotional' : 'paper'

  return (
    <div data-future={concept}>
      <div className="fut-bar">
        <Link href="/admin/lab/futures">← all seven</Link>
        {FUTURES.map((c) => (
          <Link
            key={c.id}
            href={`/admin/lab/futures/${c.id}?s=${surface}`}
            className={c.id === concept ? 'on' : ''}
          >
            {c.name}
          </Link>
        ))}
        <span className="sp" />
        <Link href={`/admin/lab/futures/${concept}?s=${other}`}>
          show the {other === 'paper' ? 'Daily Bread' : 'devotional'} →
        </Link>

        {concept === 'bayer' && (
          <>
            <span className="fut-ctl">
              matrix
              <button
                onClick={() => setMatrix(4)}
                className={matrix === 4 ? 'on' : ''}
              >
                4×4
              </button>
              <button
                onClick={() => setMatrix(8)}
                className={matrix === 8 ? 'on' : ''}
              >
                8×8
              </button>
            </span>
            <span className="fut-ctl">
              levels {levels}
              <input
                type="range"
                min={2}
                max={6}
                value={levels}
                onChange={(e) => setLevels(+e.target.value)}
              />
            </span>
            <button onClick={runDither}>{busy ? '…' : 're-dither'}</button>
          </>
        )}

        {concept === 'transmission' && (
          <span className="fut-ctl">
            tuning
            <input
              type="range"
              min={0}
              max={100}
              value={lock * 100}
              onChange={(e) => setLock(+e.target.value / 100)}
            />
            <span className="fut-note">
              {lock > 0.92 ? 'LOCKED' : 'SEARCHING'}
            </span>
          </span>
        )}

        {concept === 'press' && (
          <span className="fut-ctl">
            impression
            <input
              type="range"
              min={0}
              max={100}
              value={ink * 100}
              onChange={(e) => setInk(+e.target.value / 100)}
            />
            <button onClick={rerun}>re-run the press</button>
          </span>
        )}

        {concept === 'grid' && (
          <button
            onClick={() => setGrid(grid ? 0 : 1)}
            className={grid ? 'on' : ''}
          >
            {grid ? 'grid on' : 'show the grid'}
          </button>
        )}

        {concept === 'phosphor' && <button onClick={degauss}>degauss</button>}

        {concept === 'hologram' && (
          <span className="fut-note">
            move the pointer — the foil tracks the light
          </span>
        )}
        {concept === 'diorama' && (
          <span className="fut-note">
            move the pointer — the sheet has depth
          </span>
        )}
      </div>

      <div className="fut-stage" ref={stage}>
        <div
          className={
            concept === 'phosphor'
              ? 'fut-bloom'
              : concept === 'transmission'
                ? 'fut-tune'
                : concept === 'press'
                  ? 'fut-plate'
                  : concept === 'diorama'
                    ? 'fut-scene'
                    : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
