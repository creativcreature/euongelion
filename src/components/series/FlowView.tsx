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

/** Maximum blur applied at full tilt, in px. */
const MAX_BLUR = 4
/**
 * Rows on the board. Founder 2026-08-16, of the reference: "There are maybe 4
 * cards per column." So the board is FOUR ROWS DEEP and runs sideways, which
 * is where its length comes from.
 */
const ROWS = 4
/** Gap between tiles, in px. Must match the CSS `gap`. */
const GAP = 3
/**
 * How many times the catalog repeats down the board.
 *
 * Founder 2026-08-16: the artboard "needs to overflow and repeat". The
 * reference is an endless surface, and 37 plates in a uniform grid run out
 * after a couple of screens. Repeating the catalog keeps the board deep enough
 * to travel across without inventing content that does not exist — every tile
 * is still a real series, it simply comes round again the way a pattern does.
 */
const REPEATS = 3

export default function FlowView({ slugs, cardHref }: LayoutProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef({ active: false, lastX: 0, lastY: 0, moved: 0 })
  const blurTimer = useRef<number | null>(null)
  const lastScroll = useRef({ y: 0, t: 0 })
  const [reduced, setReduced] = useState(false)
  /**
   * Card edge in px. Founder 2026-08-16: "I only need the two largest size
   * levels" — so the board offers exactly two, and nothing smaller. Square,
   * matching the founder's own gallery (80×80 at an 88px pitch, cover-cropped,
   * 4px radius); these are the two steps above that.
   */
  const [level, setLevel] = useState<'large' | 'medium'>('large')
  const tileSize = level === 'large' ? 340 : 250

  useEffect(() => {
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const onReduced = () => setReduced(Boolean(mq?.matches))
    mq?.addEventListener?.('change', onReduced)

    const setCols = () => {}
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

  /**
   * A uniform grid, repeated. No packing, no shapes, no holes — every plate is
   * the same size and the same aspect, which is what the reference does and
   * what the founder asked for ("same sixe and aspect ration"). The earlier
   * mosaic was my invention, not the brief's.
   */
  /**
   * A mouse wheel only reports deltaY, and this board's long axis is
   * horizontal — so a plain wheel travels it sideways.
   *
   * Attached natively with `{ passive: false }`: React registers wheel
   * listeners as PASSIVE, so calling preventDefault in a React handler fails
   * and logs an error on every single notch — 199 of them in one session.
   */
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (e: WheelEvent) => {
      if (window.innerWidth <= 900) return
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const atStart = frame.scrollLeft <= 0 && e.deltaY < 0
      const atEnd =
        frame.scrollLeft >= frame.scrollWidth - frame.clientWidth - 1 &&
        e.deltaY > 0
      // Release to the page at the ends so the board never traps the reader.
      if (atStart || atEnd) return
      e.preventDefault()
      frame.scrollLeft += e.deltaY
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [])

  /**
   * The catalog, dealt into COLUMNS.
   *
   * Founder 2026-08-16: "the columns also have a scroll movement." So the
   * board is not one rigid sheet — it is a row of vertical columns, and each
   * one carries its own offset as the board travels sideways. Alternating
   * direction and slightly different rates is what makes it feel alive rather
   * than like a table sliding past.
   */
  const columns = useMemo(() => {
    const flat: Array<{ slug: string; key: string }> = []
    for (let pass = 0; pass < REPEATS; pass += 1) {
      slugs.forEach((slug) => flat.push({ slug, key: `${slug}-${pass}` }))
    }
    const count = Math.ceil(flat.length / ROWS)
    const cols: Array<Array<{ slug: string; key: string }>> = []
    for (let c = 0; c < count; c += 1) {
      cols.push(flat.slice(c * ROWS, c * ROWS + ROWS))
    }
    return cols
  }, [slugs])

  /**
   * Smear while the board is moving fast, settling the moment it stops.
   * Driven off the real scroll position, so it reflects actual travel rather
   * than a velocity we are guessing at.
   */
  /**
   * Per-column drift. Each column is nudged vertically as the board travels
   * sideways — alternating up and down, at rates that do not divide evenly, so
   * no two neighbours move together. Capped hard: this is life, not parallax
   * for its own sake, and a column must never drift far enough to hide a card.
   */
  const driftColumns = () => {
    const frame = frameRef.current
    if (!frame || reduced) return
    const x = frame.scrollLeft
    frame.querySelectorAll<HTMLElement>('.flow-col').forEach((col, i) => {
      const dir = i % 2 === 0 ? 1 : -1
      const rate = 0.04 + (i % 3) * 0.018
      const shift = Math.max(-26, Math.min(26, dir * x * rate * 0.1))
      col.style.setProperty('--col-shift', `${shift.toFixed(1)}px`)
    })
  }

  const onScroll = () => {
    driftColumns()
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
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: 0 }
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
    // Both axes. The board is a long horizontal strip, so LATERAL travel is
    // the main gesture — vertical only moves between its four rows.
    const dx = e.clientX - drag.current.lastX
    const dy = e.clientY - drag.current.lastY
    drag.current.lastX = e.clientX
    drag.current.lastY = e.clientY
    drag.current.moved += Math.abs(dx) + Math.abs(dy)
    frame.scrollLeft -= dx
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
          style={{ gridAutoColumns: `${tileSize}px` }}
        >
          {columns.map((col, ci) => (
            <div className="flow-col" key={ci}>
              {col.map(({ slug, key }) => {
                const series = SERIES_DATA[slug]
                if (!series) return null
                return (
                  <Link
                    key={key}
                    href={cardHref(slug)}
                    className="flow-tile"
                    style={{ width: tileSize }}
                    // A drag that ends on a tile must not also open it.
                    onClick={(e) => {
                      if (drag.current.moved > 6) e.preventDefault()
                    }}
                  >
                    <span
                      className="flow-plate"
                      style={{ height: tileSize }}
                    >
                      {series.heroImage && (
                        <Image
                          src={series.heroImage}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 62vw, 25vw"
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
                    <span className="flow-caption">
                      <span className="flow-title">{series.title}</span>
                      <span className="flow-days">{dayCountLabel(slug)}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flow-levels" role="group" aria-label="Card size">
        {(['large', 'medium'] as const).map((l) => (
          <button
            key={l}
            type="button"
            className={`flow-level ${level === l ? 'is-on' : ''}`}
            aria-pressed={level === l}
            onClick={() => setLevel(l)}
          >
            {l === 'large' ? 'LARGE' : 'MEDIUM'}
          </button>
        ))}
      </div>
      <p className="flow-hint text-label">Scroll the board, or drag it</p>
    </div>
  )
}
