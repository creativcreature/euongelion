'use client'

/**
 * MOVE 7 — the physics pile. The big swing.
 *
 * Lusion runs a real-time pile of cross-shaped solids you shove with the
 * pointer. Our palette, our symbol, already. A hero that has STATE — you
 * change it and it stays changed — is the most genuinely novel thing on the
 * list.
 *
 * NO DEPENDENCY. This is a hand-rolled impulse solver: bodies collide as
 * discs (cheap and stable), and each is DRAWN as a cross carrying its own
 * rotation. A cross-shaped collider would be more correct and would cost a
 * physics engine; at this scale nobody can tell, and the bundle stays clean.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** How much deeper the centre of the bowl sits than its rim, in px. */
const BOWL = 130

interface Body {
  x: number
  y: number
  vx: number
  vy: number
  a: number
  va: number
  r: number
  tone: 0 | 1 | 2
}

export default function CrossPile() {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const bodies = useRef<Body[]>([])
  const raf = useRef(0)
  const pointer = useRef<{ x: number; y: number; on: boolean }>({
    x: 0,
    y: 0,
    on: false,
  })
  const [count, setCount] = useState(34)
  const [gravity, setGravity] = useState(1)

  const seed = useCallback((n: number) => {
    const cv = canvas.current
    if (!cv) return
    const w = cv.clientWidth
    bodies.current = Array.from({ length: n }, (_, i) => ({
      x: 40 + ((i * 97) % Math.max(1, w - 80)),
      // Stacked above the canvas so they rain in rather than pop in.
      y: -40 - i * 34,
      vx: (((i * 53) % 20) - 10) / 14,
      vy: 0,
      a: (((i * 37) % 100) / 100) * Math.PI,
      va: (((i * 29) % 20) - 10) / 260,
      r: 15 + ((i * 17) % 9),
      // Blue-majority with crimson used SPARINGLY — the brand's own rule.
      // 1 in 9 is crimson; the rest split cobalt and paper.
      tone: (i % 9 === 4 ? 2 : i % 3 === 1 ? 1 : 0) as 0 | 1 | 2,
    }))
  }, [])

  useEffect(() => {
    seed(count)
  }, [count, seed])

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      cv.width = Math.round(cv.clientWidth * dpr)
      cv.height = Math.round(cv.clientHeight * dpr)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)

    const cs = getComputedStyle(cv)
    const inks = [
      cs.getPropertyValue('--lab-ink').trim() || '#1f2a8d',
      cs.getPropertyValue('--lab-paper2').trim() || '#e6e0d6',
      cs.getPropertyValue('--lab-accent').trim() || '#c4192e',
    ]
    const paper = cs.getPropertyValue('--lab-paper').trim() || '#f0ece6'
    const strokeFor = inks[0]

    /**
     * A LATIN cross, not a plus: the lower limb is long, the crossbar sits in
     * the upper third. Drawn at 0.86× the collision radius so bodies can
     * interlock at the arms the way real objects in a heap do — a shape drawn
     * to its full bounding circle reads as a floating grid, not a pile.
     */
    const drawCross = (
      ctx: CanvasRenderingContext2D,
      b: Body,
      fill: string,
      stroke: string | null,
    ) => {
      const s = b.r * 0.86
      const w = s * 0.23 // stem half-width
      const W = s * 0.62 // crossbar half-width
      const barTop = -s * 0.46
      const barBot = -s * 0.02
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.a)
      ctx.beginPath()
      ctx.moveTo(-w, -s)
      ctx.lineTo(w, -s)
      ctx.lineTo(w, barTop)
      ctx.lineTo(W, barTop)
      ctx.lineTo(W, barBot)
      ctx.lineTo(w, barBot)
      ctx.lineTo(w, s)
      ctx.lineTo(-w, s)
      ctx.lineTo(-w, barBot)
      ctx.lineTo(-W, barBot)
      ctx.lineTo(-W, barTop)
      ctx.lineTo(-w, barTop)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      // The pale tone needs an outline or it vanishes into the paper.
      if (stroke) {
        ctx.lineWidth = 1.1
        ctx.strokeStyle = stroke
        ctx.stroke()
      }
      ctx.restore()
    }

    /** Bowl profile: lowest at the centre, raised at the edges. */
    const floorAt = (x: number, w: number, h: number) => {
      const t = (x - w / 2) / (w / 2)
      return h - BOWL * t * t
    }
    /** d(floor)/dx, expressed as the push toward the centre. */
    const slopeAt = (x: number, w: number) => {
      const t = (x - w / 2) / (w / 2)
      return -t * (BOWL / (w / 2)) * 2
    }

    const step = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, w, h)

      const B = bodies.current
      for (const b of B) {
        b.vy += 0.42 * gravity
        b.vx *= 0.995
        b.x += b.vx
        b.y += b.vy
        b.a += b.va
        b.va *= 0.985

        // Pointer shove — a repulsion field, so it feels like a hand.
        if (pointer.current.on) {
          const dx = b.x - pointer.current.x
          const dy = b.y - pointer.current.y
          const d2 = dx * dx + dy * dy
          if (d2 < 130 * 130 && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = (1 - d / 130) * 2.4
            b.vx += (dx / d) * f
            b.vy += (dy / d) * f
            b.va += (dx / d) * 0.012
          }
        }

        // Walls.
        if (b.x < b.r) {
          b.x = b.r
          b.vx = Math.abs(b.vx) * 0.5
        }
        if (b.x > w - b.r) {
          b.x = w - b.r
          b.vx = -Math.abs(b.vx) * 0.5
        }

        // A shallow BOWL rather than a flat floor. On a flat floor a few
        // dozen bodies spread into a single row — a border, not a pile. The
        // bowl gives them somewhere to fall together, so the heap forms on
        // its own and re-forms after you shove it apart.
        const fy = floorAt(b.x, w, h)
        if (b.y > fy - b.r) {
          b.y = fy - b.r
          b.vy = -Math.abs(b.vy) * 0.3
          b.vx *= 0.9
          b.va *= 0.82
          // Slide downhill: the floor's slope becomes horizontal velocity.
          b.vx += slopeAt(b.x, w) * 0.9
        }
      }

      // Pairwise separation. O(n²) is fine at this count and is far more
      // stable than a broadphase built in a hurry.
      for (let i = 0; i < B.length; i++) {
        for (let j = i + 1; j < B.length; j++) {
          const a = B[i]
          const c = B[j]
          const dx = c.x - a.x
          const dy = c.y - a.y
          const min = a.r + c.r
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min || d2 < 0.0001) continue
          const d = Math.sqrt(d2)
          const overlap = (min - d) / 2
          const ux = dx / d
          const uy = dy / d
          a.x -= ux * overlap
          a.y -= uy * overlap
          c.x += ux * overlap
          c.y += uy * overlap
          // Exchange a little momentum so a shove propagates through the pile.
          const p = (c.vx - a.vx) * ux + (c.vy - a.vy) * uy
          if (p < 0) {
            a.vx += ux * p * 0.5
            a.vy += uy * p * 0.5
            c.vx -= ux * p * 0.5
            c.vy -= uy * p * 0.5
            a.va += p * 0.004
            c.va -= p * 0.004
          }
        }
      }

      for (const b of B)
        drawCross(ctx, b, inks[b.tone], b.tone === 1 ? strokeFor : null)
      raf.current = requestAnimationFrame(step)
    }

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!reduced) raf.current = requestAnimationFrame(step)
    else {
      // Settle it instantly and draw one static frame.
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = paper
        ctx.fillRect(0, 0, cv.clientWidth, cv.clientHeight)
        bodies.current.forEach((b, i) => {
          const w2 = cv.clientWidth
          b.x = w2 / 2 + (((i * 71) % 220) - 110)
          b.y =
            cv.clientHeight -
            BOWL * Math.pow((b.x - w2 / 2) / (w2 / 2), 2) -
            b.r -
            (i % 5) * 24
          drawCross(ctx, b, inks[b.tone], b.tone === 1 ? strokeFor : null)
        })
      }
    }

    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      pointer.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        on: true,
      }
    }
    const leave = () => {
      pointer.current.on = false
    }
    const down = (e: PointerEvent) => {
      move(e)
      if ('vibrate' in navigator) navigator.vibrate?.(12)
    }
    cv.addEventListener('pointermove', move, { passive: true })
    cv.addEventListener('pointerleave', leave)
    cv.addEventListener('pointerdown', down)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerleave', leave)
      cv.removeEventListener('pointerdown', down)
    }
  }, [gravity])

  return (
    <div className="lab-demo">
      <canvas ref={canvas} className="lab-pile" />
      <div className="lab-ctls">
        <button
          onClick={() => {
            seed(count)
            if ('vibrate' in navigator) navigator.vibrate?.(12)
          }}
        >
          ↻ drop again
        </button>
        <label className="lab-slider">
          crosses {count}
          <input
            type="range"
            min={6}
            max={60}
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          />
        </label>
        <label className="lab-slider">
          gravity {gravity.toFixed(1)}
          <input
            type="range"
            min={0}
            max={20}
            value={gravity * 10}
            onChange={(e) => setGravity(+e.target.value / 10)}
          />
        </label>
      </div>
      <p className="lab-hint">
        <strong>Move the pointer through the pile and shove it.</strong> Set
        gravity to 0 and they drift in the void. This is the one on the list I
        will not decide for you: a pile of crosses you can knock over is either
        magnificent or irreverent, and that is a founder call.
      </p>
    </div>
  )
}
