'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SERIES_DATA } from '@/data/series'
import { dayCountLabel } from '@/lib/series/catalog'
import type { LayoutProps } from './SeriesLayouts'

/**
 * FLOW — the artboard (F-105).
 *
 * Founder 2026-08-16: "this will be the first toggle on the series page. I want
 * each series in a grid and to similarly function like this… Just the fluid
 * motion, sizing and grid structure etc. Specifically the fuctionality motion
 * and fluidity." Reference: nicolaromei.com.
 *
 * The reference's own instruction to the reader is "SCROLL / DRAG TO INTERACT
 * W/ THE ARTBOARD" — so what is being borrowed is a BEHAVIOUR, not a look. The
 * founder was explicit: "Dont make things black and white or anything." The
 * palette, the plates and the typography stay Euangelion's.
 *
 * WHAT MAKES IT AN ARTBOARD RATHER THAN A GRID
 *
 * The catalog is laid out on a canvas larger than the window, and the window
 * pans across it — by drag, by wheel, by trackpad, by arrow key. Tiles are
 * different sizes because the readings are different lengths, so panning past
 * a wide tile tells you something true rather than being decoration.
 *
 * Movement carries a little blur, scaled to speed and capped, which is what
 * makes a pan feel like weight moving rather than a jump cut. It settles to
 * zero the moment you stop.
 *
 * THREE THINGS THIS DELIBERATELY KEEPS
 *
 * 1. Every tile is a real <Link>. The whole board is keyboard-reachable, and
 *    focusing a tile pans it into view — so this is not a mouse-only surface.
 * 2. Layout is deterministic. Tile positions come from the slug order and the
 *    day count, never from random, so the board is the same on every render
 *    and on every device.
 * 3. Under `prefers-reduced-motion` the momentum and the blur are both off.
 *    Dragging still works; it just stops where you let go.
 */

/** Row height, in px. Columns come from CSS grid, so only rows need a unit. */
const ROW = 148
/** Gap between tiles, in px. Must match the CSS `gap`. */
const GAP = 14
/** How quickly momentum bleeds off per frame. */
const FRICTION = 0.94
/** Below this speed the board is considered stopped. */
const REST_SPEED = 0.04
/** Maximum blur applied at full tilt, in px. */
const MAX_BLUR = 5

interface Tile {
  slug: string
  /** Column and row, in cells. */
  cx: number
  cy: number
  /** Span, in cells. */
  w: number
  h: number
}

/**
 * Lay the catalog out on the board.
 *
 * A shelf-packing pass: walk the slugs in order, give each a size drawn from
 * its LENGTH, and drop it into the first column run that has room. The result
 * is a dense mosaic with no gaps, and it is completely determined by the input
 * order — pass a different sort and the board rearranges to match.
 */
function layout(slugs: readonly string[], columns: number): Tile[] {
  // Column heights, in cells.
  const heights = new Array(columns).fill(0)
  const tiles: Tile[] = []

  slugs.forEach((slug, i) => {
    const days = SERIES_DATA[slug]?.days.length ?? 5
    // Size encodes length, in three steps. The longest reading in the catalog
    // (365) is the only one that earns the biggest tile.
    const big = days >= 60
    const wide = !big && days >= 7
    const w = big ? 2 : wide ? 2 : 1
    const h = big ? 2 : wide ? 1 : 1

    // Find the leftmost run of `w` columns whose tallest point is lowest —
    // standard shelf packing, which keeps the board's bottom edge even.
    let bestX = 0
    let bestY = Infinity
    for (let x = 0; x + w <= columns; x += 1) {
      const y = Math.max(...heights.slice(x, x + w))
      if (y < bestY) {
        bestY = y
        bestX = x
      }
    }
    for (let x = bestX; x < bestX + w; x += 1) heights[x] = bestY + h
    tiles.push({ slug, cx: bestX, cy: bestY, w, h })
    void i
  })

  return tiles
}

export default function FlowView({ slugs, cardHref }: LayoutProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const pos = useRef({ x: 0, y: 0 })
  const vel = useRef({ x: 0, y: 0 })
  const drag = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  })
  const raf = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [reduced, setReduced] = useState(false)

  // Columns scale with the frame so the board is dense on a laptop and still
  // pannable on a phone. Fixed count per breakpoint, not measured, so the
  // layout never reflows mid-drag.
  const [columns, setColumns] = useState(4)

  useEffect(() => {
    // matchMedia is absent in jsdom and in a few embedded webviews. Missing it
    // must mean "no reduced-motion preference expressed", not a crash that
    // takes the whole view down — Flow is the default toggle, so a throw here
    // would blank the series page.
    const mqReduced =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const onReduced = () => setReduced(Boolean(mqReduced?.matches))
    mqReduced?.addEventListener?.('change', onReduced)

    // Column COUNT comes from the viewport, which is always readable. The
    // board's WIDTH is not computed at all — CSS grid fills the frame — so a
    // wrong measurement can no longer leave dead space on the right.
    //
    // Counts are tuned for how each device is actually used: two up on a
    // phone (a tile stays thumb-sized and legible), rising to five on a wide
    // desktop. More than five and the plates stop being readable.
    const setCols = () => {
      const w = window.innerWidth
      setColumns(w < 560 ? 2 : w < 900 ? 3 : w < 1300 ? 4 : 5)
    }
    window.addEventListener('resize', setCols)

    // Measured on the next frame rather than synchronously. Setting state in
    // the effect body cascades a render, and reading innerWidth during the
    // first client pass would also disagree with what the server rendered —
    // one frame at the default column count is imperceptible and avoids both.
    const first = window.requestAnimationFrame(() => {
      setReduced(Boolean(mqReduced?.matches))
      setCols()
    })

    return () => {
      window.cancelAnimationFrame(first)
      mqReduced?.removeEventListener?.('change', onReduced)
      window.removeEventListener('resize', setCols)
    }
  }, [])

  const tiles = useMemo(() => layout(slugs, columns), [slugs, columns])

  const boardSize = useMemo(() => {
    const rows = Math.max(...tiles.map((t) => t.cy + t.h), 1)
    // Width is not computed: the board is a CSS grid at 100% of the frame, so
    // it fills by construction. Measuring it was the bug — an un-laid-out
    // frame reports 0 and the board froze at its default column count.
    return { height: rows * ROW + (rows - 1) * GAP }
  }, [tiles])

  /** Keep the board's edges inside the frame. */
  const clamp = useCallback(() => {
    const frame = frameRef.current
    if (!frame) return
    const maxX = 0
    const maxY = 0
    const minX = 0
    const minY = Math.min(0, frame.clientHeight - boardSize.height)
    if (pos.current.x > maxX) {
      pos.current.x = maxX
      vel.current.x = 0
    }
    if (pos.current.y > maxY) {
      pos.current.y = maxY
      vel.current.y = 0
    }
    if (pos.current.x < minX) {
      pos.current.x = minX
      vel.current.x = 0
    }
    if (pos.current.y < minY) {
      pos.current.y = minY
      vel.current.y = 0
    }
  }, [boardSize])

  const paint = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    const speed = Math.hypot(vel.current.x, vel.current.y)
    const blur = reduced ? 0 : Math.min(MAX_BLUR, speed * 0.16)
    board.style.transform = `translate3d(${pos.current.x.toFixed(2)}px, ${pos.current.y.toFixed(2)}px, 0)`
    board.style.filter = blur > 0.12 ? `blur(${blur.toFixed(2)}px)` : ''
  }, [reduced])

  /**
   * Momentum loop. Runs only while the board is actually moving.
   *
   * Scheduled through a ref rather than referencing itself directly — a
   * useCallback cannot name itself inside its own body without reading the
   * binding before it is initialised.
   */
  const stepRef = useRef<() => void>(() => {})

  const step = useCallback(() => {
    raf.current = null
    if (drag.current.active) return
    vel.current.x *= FRICTION
    vel.current.y *= FRICTION
    pos.current.x += vel.current.x
    pos.current.y += vel.current.y
    clamp()
    paint()
    if (Math.hypot(vel.current.x, vel.current.y) > REST_SPEED) {
      raf.current = window.requestAnimationFrame(() => stepRef.current())
    } else {
      vel.current.x = 0
      vel.current.y = 0
      paint()
    }
  }, [clamp, paint])

  useEffect(() => {
    stepRef.current = step
  }, [step])

  const kick = useCallback(() => {
    if (raf.current === null)
      raf.current = window.requestAnimationFrame(() => stepRef.current())
  }, [])

  // ── Drag ────────────────────────────────────────────────────────────
  /** Below this width the frame is a native scroll container, not a board. */
  const nativeScroll = () =>
    typeof window !== 'undefined' && window.innerWidth <= 900

  const onPointerDown = (e: React.PointerEvent) => {
    // On a phone the frame scrolls natively — dragging it would fight the
    // platform's own momentum and could trap the reader mid-page.
    if (nativeScroll()) return
    // Let a real click on a tile through; only start a drag from the board.
    if (e.button !== 0) return
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    vel.current = { x: 0, y: 0 }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.lastX
    const dy = e.clientY - drag.current.lastY
    drag.current.lastX = e.clientX
    drag.current.lastY = e.clientY
    pos.current.x += dx
    pos.current.y += dy
    // Track velocity so releasing throws the board.
    vel.current.x = reduced ? 0 : dx
    vel.current.y = reduced ? 0 : dy
    clamp()
    paint()
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    drag.current.active = false
    setDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Pointer already released (the browser can beat us to it on some
      // gestures); nothing to undo.
    }
    if (!reduced) kick()
  }

  // ── Wheel / trackpad ────────────────────────────────────────────────
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (e: WheelEvent) => {
      // Native scrolling owns the frame on small screens.
      if (window.innerWidth <= 900) return
      // A trackpad gives both axes; a mouse wheel gives only Y, which pans the
      // board down — the board is taller than it is wide, so that is the axis
      // a reader expects to travel.
      const dx = e.deltaX
      const dy = e.deltaY
      const frameEl = frameRef.current
      if (!frameEl) return
      const minY = Math.min(0, frameEl.clientHeight - boardSize.height)
      // Let the PAGE scroll take over at the board's vertical limits, so the
      // artboard never traps the reader inside it.
      const atTop = pos.current.y >= 0 && dy < 0
      const atBottom = pos.current.y <= minY && dy > 0
      if (Math.abs(dx) < Math.abs(dy) && (atTop || atBottom)) return
      e.preventDefault()
      pos.current.x -= dx
      pos.current.y -= dy
      vel.current.x = reduced ? 0 : -dx * 0.3
      vel.current.y = reduced ? 0 : -dy * 0.3
      clamp()
      paint()
      if (!reduced) kick()
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [boardSize, clamp, paint, kick, reduced])

  // Paint once laid out, and whenever the board is re-measured.
  useEffect(() => {
    clamp()
    paint()
  }, [clamp, paint, boardSize])

  useEffect(
    () => () => {
      if (raf.current !== null) window.cancelAnimationFrame(raf.current)
    },
    [],
  )

  /** Keyboard focus pans the board rather than scrolling the page. */
  const onTileFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    const frame = frameRef.current
    if (!frame) return
    const tile = e.currentTarget
    const t = tile.getBoundingClientRect()
    const f = frame.getBoundingClientRect()
    let dx = 0
    let dy = 0
    if (t.left < f.left) dx = f.left - t.left + 24
    if (t.right > f.right) dx = f.right - t.right - 24
    if (t.top < f.top) dy = f.top - t.top + 24
    if (t.bottom > f.bottom) dy = f.bottom - t.bottom - 24
    if (dx === 0 && dy === 0) return
    pos.current.x += dx
    pos.current.y += dy
    clamp()
    paint()
  }

  return (
    <div className="flow">
      <div
        ref={frameRef}
        className={`flow-frame ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="group"
        aria-label="The artboard — drag or scroll to move across the catalog"
      >
        <div
          ref={boardRef}
          className="flow-board"
          style={{
            height: boardSize.height,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: `${ROW}px`,
          }}
        >
          {tiles.map((tile) => {
            const series = SERIES_DATA[tile.slug]
            if (!series) return null
            return (
              <Link
                key={tile.slug}
                href={cardHref(tile.slug)}
                className="flow-tile"
                onFocus={onTileFocus}
                // A drag that ends on a tile must not also open it.
                onClick={(e) => {
                  if (Math.hypot(vel.current.x, vel.current.y) > 2)
                    e.preventDefault()
                }}
                style={{
                  gridColumn: `${tile.cx + 1} / span ${tile.w}`,
                  gridRow: `${tile.cy + 1} / span ${tile.h}`,
                }}
              >
                <span className="flow-plate">
                  {series.heroImage && (
                    <Image
                      src={series.heroImage}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 44vw, 24vw"
                      // The board is translated, and Chrome's lazy loader does
                      // not fire for children of a transformed container — the
                      // same trap the rose window hit. Every tile would sit as
                      // an empty plate ground forever.
                      loading="eager"
                      className="flow-img"
                    />
                  )}
                </span>
                <span className="flow-caption">
                  <span className="flow-title">{series.title}</span>
                  <span className="flow-days">{dayCountLabel(tile.slug)}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="flow-hint text-label">
        Drag the board, or scroll across it
      </p>
    </div>
  )
}
