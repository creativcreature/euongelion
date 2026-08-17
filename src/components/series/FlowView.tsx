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
 * IT SCROLLS NATIVELY. The first build drove the board with a transform and a
 * hand-written momentum loop, and it did not work: a single wheel notch threw
 * the board 835px because the loop stacked its own inertia on top of the
 * operating system's, and drag did not move it at all. The platform already
 * has momentum, rubber-banding, scrollbars, keyboard paging and accessibility
 * — so the frame is an ordinary scroll container now, on every size, and drag
 * simply moves `scrollTop`. There is far less here to go wrong.
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
/** Maximum blur applied at full tilt, in px. */
const MAX_BLUR = 4

export interface Tile {
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
export function layout(slugs: readonly string[], columns: number): Tile[] {
  // Column heights, in cells.
  const heights = new Array(columns).fill(0)
  const tiles: Tile[] = []

  /** Lowest position a tile of width `w` can sit at, leftmost on a tie. */
  const bestFor = (w: number) => {
    let bx = 0
    let by = Infinity
    for (let x = 0; x + w <= columns; x += 1) {
      const y = Math.max(...heights.slice(x, x + w))
      if (y < by) {
        by = y
        bx = x
      }
    }
    return { x: bx, y: by }
  }

  slugs.forEach((slug, i) => {
    const days = SERIES_DATA[slug]?.days.length ?? 5
    // Size encodes length, across four shapes rather than two — a grid of two
    // sizes reads as a card wall, not an artboard. Deterministic: shape comes
    // from the day count and the slug's position, never from random.
    const big = days >= 60
    const long = !big && days >= 7
    const tall = !big && !long && i % 3 === 1
    const wide = !big && !long && !tall && i % 4 === 2
    let w = big || long || wide ? 2 : 1
    const h = big ? 2 : tall ? 2 : 1

    // ADAPTIVE WIDTH. A 2-wide tile placed at the lowest PAIR of columns will
    // happily skip over a single-column trough, and that trough becomes a hole
    // nothing later fills — 13 of them on an eight-column board. So if going
    // narrow would sit meaningfully higher, go narrow. Holes are the one thing
    // an artboard cannot have.
    if (w === 2) {
      const two = bestFor(2)
      const one = bestFor(1)
      if (one.y < two.y) w = 1
    }

    const { x: bestX, y: bestY } = bestFor(w)
    for (let x = bestX; x < bestX + w; x += 1) heights[x] = bestY + h
    tiles.push({ slug, cx: bestX, cy: bestY, w, h })
  })

  // FILL THE HOLES. A tall tile leaves a one-cell trough that later tiles are
  // too wide or too late to fill, so after packing we relocate single-cell
  // tiles UP into any remaining gap, deepest gap first. An artboard with holes
  // in it is just a broken grid.
  const occupancy = () => {
    const filled = new Set<string>()
    for (const t of tiles) {
      for (let x = t.cx; x < t.cx + t.w; x += 1) {
        for (let y = t.cy; y < t.cy + t.h; y += 1) filled.add(`${x}:${y}`)
      }
    }
    return filled
  }

  for (let pass = 0; pass < 4; pass += 1) {
    const filled = occupancy()
    const bottom = Math.max(...tiles.map((t) => t.cy + t.h))
    const holes: Array<{ x: number; y: number }> = []
    for (let y = 0; y < bottom; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (!filled.has(`${x}:${y}`)) holes.push({ x, y })
      }
    }
    if (holes.length === 0) break
    let moved = false
    for (const hole of holes) {
      // The lowest 1x1 tile on the board is the one we can afford to move.
      const candidate = tiles
        .filter((t) => t.w === 1 && t.h === 1 && t.cy > hole.y)
        .sort((a, b) => b.cy - a.cy)[0]
      if (!candidate) continue
      candidate.cx = hole.x
      candidate.cy = hole.y
      moved = true
    }
    if (!moved) break
  }

  // Any gap that survives relocation had no single-cell tile below it to move
  // up. Grow the tile directly ABOVE it down by one instead — a slightly
  // taller plate is invisible; a hole is not.
  {
    const filled = occupancy()
    const bottom = Math.max(...tiles.map((t) => t.cy + t.h))
    for (let y = 0; y < bottom; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (filled.has(`${x}:${y}`)) continue
        const above = tiles.find(
          (t) => t.cx <= x && x < t.cx + t.w && t.cy + t.h === y && t.w === 1,
        )
        if (!above) continue
        above.h += 1
        for (let yy = above.cy; yy < above.cy + above.h; yy += 1) {
          filled.add(`${above.cx}:${yy}`)
        }
      }
    }
  }

  // Recompute column heights after relocation so the levelling pass below
  // works from the truth rather than from the packing order.
  heights.fill(0)
  for (const t of tiles) {
    for (let x = t.cx; x < t.cx + t.w; x += 1) {
      heights[x] = Math.max(heights[x], t.cy + t.h)
    }
  }

  // LEVEL THE BOTTOM EDGE. Whatever is left short after packing gets stretched
  // down to the tallest column, so the board ends on a straight cut like a
  // printed sheet rather than a ragged staircase.
  const floor = Math.max(...heights)
  if (floor > 0) {
    for (let x = 0; x < columns; x += 1) {
      if (heights[x] >= floor) continue
      // Find the tile occupying the bottom of this column and grow it.
      let lowest: Tile | undefined
      for (const t of tiles) {
        if (t.cx <= x && x < t.cx + t.w && t.cy + t.h === heights[x]) {
          if (!lowest || t.cy + t.h > lowest.cy + lowest.h) lowest = t
        }
      }
      if (!lowest) continue
      // Only grow it if every column it spans is equally short, so the tile
      // stays rectangular.
      const spans = []
      for (let c = lowest.cx; c < lowest.cx + lowest.w; c += 1) spans.push(heights[c])
      if (new Set(spans).size !== 1) continue
      const grow = floor - spans[0]
      lowest.h += grow
      for (let c = lowest.cx; c < lowest.cx + lowest.w; c += 1) heights[c] = floor
    }
  }

  return tiles
}

export default function FlowView({ slugs, cardHref }: LayoutProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef({ active: false, lastY: 0, moved: 0 })
  const blurTimer = useRef<number | null>(null)
  const lastScroll = useRef({ y: 0, t: 0 })
  const [reduced, setReduced] = useState(false)
  const [columns, setColumns] = useState(6)

  useEffect(() => {
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const onReduced = () => setReduced(Boolean(mq?.matches))
    mq?.addEventListener?.('change', onReduced)

    // Column COUNT comes from the viewport; the board's WIDTH is never
    // measured — CSS grid fills the frame — so no measurement can leave dead
    // space. Two up on a phone keeps a tile thumb-sized and legible.
    const setCols = () => {
      const w = window.innerWidth
      setColumns(w < 560 ? 2 : w < 900 ? 4 : w < 1300 ? 6 : 8)
    }
    window.addEventListener('resize', setCols)

    const first = window.requestAnimationFrame(() => {
      setReduced(Boolean(mq?.matches))
      setCols()
    })

    return () => {
      window.cancelAnimationFrame(first)
      mq?.removeEventListener?.('change', onReduced)
      window.removeEventListener('resize', setCols)
    }
  }, [])

  const tiles = useMemo(() => layout(slugs, columns), [slugs, columns])

  const rows = useMemo(
    () => Math.max(...tiles.map((t) => t.cy + t.h), 1),
    [tiles],
  )

  /**
   * Smear while the board is moving fast, settling the moment it stops.
   * Driven off the real scroll position, so it reflects actual travel rather
   * than a velocity we are guessing at.
   */
  const onScroll = () => {
    if (reduced) return
    const frame = frameRef.current
    if (!frame) return
    const now = performance.now()
    const dy = frame.scrollTop - lastScroll.current.y
    const dt = Math.max(1, now - lastScroll.current.t)
    lastScroll.current = { y: frame.scrollTop, t: now }
    const speed = Math.abs(dy) / dt // px per ms
    const blur = Math.min(MAX_BLUR, speed * 1.6)
    frame.style.setProperty('--flow-blur', blur > 0.2 ? `${blur.toFixed(2)}px` : '0px')
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => {
      frame.style.setProperty('--flow-blur', '0px')
    }, 90)
  }

  // ── Drag to pan. An enhancement over native scrolling, never a replacement:
  //    if any of this fails the frame still scrolls exactly as a scroll
  //    container should.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return // the platform owns touch
    if (e.button !== 0) return
    drag.current = { active: true, lastY: e.clientY, moved: 0 }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Capture is a nicety; dragging still works without it.
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const frame = frameRef.current
    if (!frame) return
    const dy = e.clientY - drag.current.lastY
    drag.current.lastY = e.clientY
    drag.current.moved += Math.abs(dy)
    frame.scrollTop -= dy
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    drag.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Already released by the browser on some gestures.
    }
  }

  return (
    <div className="flow">
      <div
        ref={frameRef}
        className="flow-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={onScroll}
        role="group"
        aria-label="The artboard — scroll or drag to move across the catalog"
        tabIndex={0}
      >
        <div
          className="flow-board"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: `${ROW}px`,
            minHeight: rows * ROW + (rows - 1) * GAP,
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
                // A drag that ends on a tile must not also open it.
                onClick={(e) => {
                  if (drag.current.moved > 6) e.preventDefault()
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
                      /* Eager, deliberately. These sit inside a scroll
                         container, and Chrome's lazy heuristics leave them
                         unloaded there — the board renders as a flat dark
                         field with no tiles visible at all. It cost two
                         debugging rounds; do not make these lazy. */
                      loading="eager"
                      className="flow-img"
                    />
                  )}
                </span>
                {/* The reference's tiles are pure image; the name arrives only
                    when you are on one. Kept in the DOM (not injected on
                    hover) so it is always available to assistive tech. */}
                <span className="flow-caption">
                  <span className="flow-title">{series.title}</span>
                  <span className="flow-days">{dayCountLabel(tile.slug)}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="flow-hint text-label">Scroll the board, or drag it</p>
    </div>
  )
}
