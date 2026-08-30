'use client'

/**
 * Drawing Near — the scrolling halftone atmosphere (experiment, SA-133 / F-177).
 *
 * SCOPE IS DELIBERATE AND NARROW. This mounts for `drawing-near-*` and nothing
 * else. Every other reading in the catalogue renders exactly as before: the
 * component is not referenced from any shared path, adds no global CSS, and
 * paints into its own fixed layer behind the article.
 *
 * WHAT IT DOES. Each plate that appears in the page also appears BEHIND the
 * page, as a coarse halftone texture, while you read toward it. The band fades
 * up as its plate approaches, parallaxes slower than the text, fades out, and
 * leaves a gap of clean paper before the next one begins. One plate is ever
 * visible at a time — the gap is the point, not a side effect.
 *
 * WHY IT REUSES THE SA-128 ENGINE. `halftone.ts` RESAMPLES (averages the source
 * into coarse cells, then draws one dot per cell) rather than re-quantising per
 * pixel. Running a Bayer matrix over plates that are already riso halftone beats
 * one grid against the other and produces moiré. Averaging destroys the source
 * grid first, which is what makes this safe on the real artwork.
 *
 * WHY THE DOTS ARE DRAWN ONCE. The dot field is expensive (thousands of arcs);
 * scrolling is not the moment to recompute it. Each plate is rasterised once
 * into an offscreen canvas and the scroll handler only translates it — so the
 * per-frame cost is a single drawImage regardless of how dense the field is.
 * Coalesced to one rAF per frame rather than one per scroll event (SA-129).
 *
 * CONTRAST IS MEASURED, NOT ASSUMED. The layer reads the reader's live
 * `--mock-paper` / `--mock-ink` (the themes run from cream through navy to
 * black), picks multiply on light paper and screen on dark, and caps its own
 * alpha. Type is never competing with more than a faint tone.
 */

import { useEffect, useRef, useState } from 'react'
import { sampleGrid, drawHalftone } from '@/components/lab/demos/halftone'

/** Peak alpha of the texture. Founder: the images should fade more than not. */
const PEAK_LIGHT = 0.3
const PEAK_DARK = 0.5
/**
 * Output cell in CSS px. Founder: the dots were "way too large" and the plate
 * read as an abstract field rather than the picture. Fine enough that the
 * SUBJECT is legible — the reference's menu image is recognisable, not a
 * texture swatch — while still obviously a printed screen rather than a photo.
 */
const CELL = 5
/**
 * RANGE COMPRESSION — how the picture stays visible without flooding the page.
 *
 * These plates are intensity 5: about 79% of each frame is deep ink. Fed
 * straight into a halftone, "dark source = big dot" closes nearly every cell
 * and the page floods to a flat grey that eats the type (measured on the first
 * pass: 12,914 of 13,360 sampled pixels painted).
 *
 * The first fix was a hard gate — print only the deepest shadows. It solved the
 * flood and lost the picture, which is the wrong trade: founder wants to SEE the
 * image, not a texture standing in for it. So instead of clipping the range, it
 * is COMPRESSED. A gamma above 1 pushes the midtones down and the ceiling holds
 * the darkest cells below full, so every tone in the plate still varies — the
 * subject stays readable — and no cell is ever solid.
 */
const GAMMA = 1.5
const CEILING = 0.72
/**
 * How far past "cover" the plate is scaled before it is sampled.
 *
 * sampleGrid stretches whatever it is given across the whole output, so handing
 * it the plate directly both distorts it and shows the entire composition at
 * once — which reads as a small picture pinned behind the page rather than as
 * stock. Founder: "images too zoomed out." Cropping into the plate at this
 * factor keeps the aspect honest and puts one large piece of the artwork behind
 * the reading, the way the reference crops into its engraving.
 *
 * REVERTED to this value 2026-08-30. A later pass replaced cropping with drawing
 * the whole plate small in a field of paper; the founder judged the earlier
 * sizing better — "Revert the background image size. The last version worked."
 * The corrections made alongside that experiment are kept: finer screen, softer
 * edge fades, and holding the first texture until below the fold.
 */
const ZOOM = 1.25
/** How much slower than the text the texture travels. */
const PARALLAX = 0.18

/**
 * A band keeps ELEMENT references, not scroll offsets.
 *
 * Anchors captured once at mount go stale: the layer builds before the plates
 * have loaded and the article is still short, so every centre recorded then is
 * wrong by the time anything is on screen. Measured on day 1, that put the
 * intro band's peak at the top of its range instead of its middle. Reading the
 * rects at draw time costs a handful of reads per frame and cannot drift.
 */
type Band = {
  src: string
  /** Span is measured from these each frame. `to` defaults to `from`. */
  from: HTMLElement
  to?: HTMLElement
  /** Extra reach past the span, as a multiple of viewport height. */
  pad: number
}

function readToken(el: Element, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

/** Rec.709 on a hex or rgb() string, so the blend choice is measured. */
function luminanceOf(color: string): number {
  const m = color.match(/#([0-9a-f]{6})/i)
  let r: number, g: number, b: number
  if (m) {
    const n = parseInt(m[1], 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  } else {
    const p = color.match(/(\d+(?:\.\d+)?)/g)
    if (!p || p.length < 3) return 1
    ;[r, g, b] = p.slice(0, 3).map(Number)
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export default function DrawingNearAtmosphere({
  heroSrc,
}: {
  heroSrc?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Bumped when the reader changes theme, to re-read the palette.
  const [rebuild, setRebuild] = useState(0)

  useEffect(() => {
    const cv: HTMLCanvasElement | null = canvasRef.current
    if (!cv) return
    const c2d = cv.getContext('2d')
    if (!c2d) return
    const canvas: HTMLCanvasElement = cv
    const ctx: CanvasRenderingContext2D = c2d

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const shell = document.querySelector('.mock-paper') ?? document.body
    const paper = readToken(shell, '--mock-paper', '#f5eee3')
    const ink = readToken(shell, '--mock-ink', '#141414')
    const darkPaper = luminanceOf(paper) < 0.5
    const peak = darkPaper ? PEAK_DARK : PEAK_LIGHT
    // ALWAYS multiply. Founder: on dark mode the ground must darken against the
    // page, not lighten it.
    //
    // The trap this fixes: on the dark themes `--mock-ink` is the TEXT colour,
    // which is cream (#efe5d8 on navy, #d8d0c0 on night). Painting dots in it
    // and screening produced light dots — the opposite of ink on stock. So the
    // dot colour is the reader's ink only when that ink is actually dark, and a
    // deep tone otherwise, and the blend never changes.
    canvas.style.mixBlendMode = 'multiply'
    const dot = luminanceOf(ink) < 0.5 ? ink : '#05060f'

    let bands: Band[] = []
    let plates = new Map<string, HTMLCanvasElement>()
    let raf = 0
    let vw = 0
    let vh = 0

    /** Rasterise one plate's dot field once, at the size it will be shown. */
    async function rasterise(src: string): Promise<HTMLCanvasElement | null> {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.decoding = 'async'
      img.src = src
      try {
        await img.decode()
      } catch {
        return null
      }
      const w = vw
      const h = Math.round(vh * 1.45) // taller than the viewport, so it can travel

      // Crop into the plate at ZOOM past cover, centred, BEFORE sampling. This
      // is the step that keeps the aspect ratio true: sampleGrid stretches its
      // source to fill, so it must be handed something already the right shape.
      const stage = document.createElement('canvas')
      stage.width = w
      stage.height = h
      const sctx = stage.getContext('2d')
      if (!sctx) return null
      const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const scale = cover * ZOOM
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      const dx = (w - dw) / 2
      const dy = (h - dh) / 2
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(img, dx, dy, dw, dh)

      const grid = sampleGrid(stage, w, h, CELL)
      if (!grid) return null
      // Apply the shadow gate to the sampled luminance BEFORE drawing. The
      // SA-128 engine is shared with the lab and is left exactly as it is;
      // this shapes its input rather than its behaviour.
      for (let i = 0; i < grid.lum.length; i++) {
        const ink = 1 - grid.lum[i]
        grid.lum[i] = 1 - Math.pow(ink, GAMMA) * CEILING
      }
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d')
      if (!octx) return null
      // Paper is painted by the page beneath; this layer carries ink only, so
      // the halftone is drawn onto transparency rather than onto a paper fill.
      drawHalftone(octx, grid, w, h, {
        cell: CELL,
        mode: 'still',
        t: 0,
        ink: dot,
        paper: 'rgba(0,0,0,0)',
        gain: 1.0,
      })

      // Fade the plate's own top and bottom to nothing. The band envelope
      // already fades the whole layer in and out over scroll, but the plate
      // itself still had a hard horizontal edge where the raster ended, which
      // reads as the bottom of a panel sliding past. Softening the raster means
      // the texture always dissolves into paper rather than stopping.
      // Founder: the fade was eating too much of the plate. It now runs over
      // the image's own top and bottom edge only, not a fifth of the frame.
      const fade = octx.createLinearGradient(0, 0, 0, h)
      fade.addColorStop(0, 'rgba(0,0,0,1)')
      fade.addColorStop(0.1, 'rgba(0,0,0,0)')
      fade.addColorStop(0.9, 'rgba(0,0,0,0)')
      fade.addColorStop(1, 'rgba(0,0,0,1)')
      octx.globalCompositeOperation = 'destination-out'
      octx.fillStyle = fade
      octx.fillRect(0, 0, w, h)
      // The same treatment on the left and right edges. Without it the plate
      // ends in two hard verticals and reads as a panel dropped behind the
      // page rather than as ground showing through it.
      const side = octx.createLinearGradient(0, 0, w, 0)
      side.addColorStop(0, 'rgba(0,0,0,1)')
      side.addColorStop(0.12, 'rgba(0,0,0,0)')
      side.addColorStop(0.88, 'rgba(0,0,0,0)')
      side.addColorStop(1, 'rgba(0,0,0,1)')
      octx.fillStyle = side
      octx.fillRect(0, 0, w, h)
      octx.globalCompositeOperation = 'source-over'
      return off
    }

    /** Anchor a band on every plate that actually appears in the article. */
    function collectBands() {
      const figures = Array.from(
        document.querySelectorAll<HTMLElement>('figure.inline-image-module'),
      )
      const next: Band[] = []
      if (heroSrc) {
        // Founder: "intro image should start behind the first scripture and end
        // by reflection or so." The v2 two-minute open pins that order —
        // scripture, vocab, teaching, reflection, prayer, cta — so sections 1
        // and 4 ARE those two modules. Anchoring to the real elements means no
        // shared component needed a hook added for this.
        const first = document.getElementById('devotional-section-1')
        const until = document.getElementById('devotional-section-4')
        if (first && until) {
          next.push({ src: heroSrc, from: first, to: until, pad: 0.2 })
        }
      }
      for (const fig of figures) {
        const img = fig.querySelector('img')
        const src = img?.getAttribute('src')
        if (!src) continue
        next.push({ src, from: fig, pad: 1.3 })
      }
      bands = next
    }

    async function build() {
      vw = window.innerWidth
      vh = window.innerHeight
      canvas.width = Math.round(vw * window.devicePixelRatio)
      canvas.height = Math.round(vh * window.devicePixelRatio)
      canvas.style.width = `${vw}px`
      canvas.style.height = `${vh}px`
      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0,
      )
      collectBands()
      const made = new Map<string, HTMLCanvasElement>()
      for (const b of bands) {
        if (made.has(b.src)) continue
        const off = await rasterise(b.src)
        if (off) made.set(b.src, off)
      }
      plates = made
      draw()
    }

    function draw() {
      raf = 0
      ctx.clearRect(0, 0, vw, vh)
      const mid = window.scrollY + vh / 2
      // Founder: the first texture starts below the fold. The opening screen is
      // the title and the anchor verse, and it stays clean paper — the ground
      // only begins to print once the reader has committed to scrolling.
      const revealed = Math.max(
        0,
        Math.min(1, (window.scrollY - vh * 0.9) / (vh * 0.55)),
      )
      if (revealed <= 0) return
      for (const b of bands) {
        const off = plates.get(b.src)
        if (!off) continue
        // Live measurement — see the Band type.
        const ra = b.from.getBoundingClientRect()
        const rb = (b.to ?? b.from).getBoundingClientRect()
        const top = ra.top + window.scrollY
        const bottom = rb.bottom + window.scrollY
        const centre = (top + bottom) / 2
        const height = (bottom - top) / 2 + vh * b.pad
        const d = Math.abs(mid - centre)
        if (d > height) continue
        // Envelope: full in the middle of the band, nothing at its edges, so
        // consecutive plates are separated by clean paper rather than a mix.
        const e = 1 - d / height
        const alpha =
          peak * Math.pow(Math.sin(e * Math.PI * 0.5), 1.6) * revealed
        if (alpha < 0.004) continue
        const travel = reduced ? 0 : (mid - centre) * PARALLAX
        ctx.globalAlpha = alpha
        ctx.drawImage(off, 0, (vh - off.height) / 2 + travel)
      }
      ctx.globalAlpha = 1
      carveReadingColumn()
    }

    /**
     * Take the texture back out from behind the reading measure.
     *
     * Founder requirement: the typography must be contrasted against the
     * images. In the reference the texture lives in the margins and the column
     * you actually read sits on clean ground — so rather than dropping the
     * whole layer's alpha until it disappears, the dots are erased where the
     * words are and kept at full strength at the edges. That buys contrast
     * where it is needed without losing the effect where it is visible.
     */
    function carveReadingColumn() {
      const measure = Math.min(1120, vw * 0.78)
      const x0 = (vw - measure) / 2
      const g = ctx.createLinearGradient(x0, 0, x0 + measure, 0)
      // Soft shoulders: a hard edge would read as a printed panel.
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.16, 'rgba(0,0,0,0.5)')
      g.addColorStop(0.5, 'rgba(0,0,0,0.62)')
      g.addColorStop(0.84, 'rgba(0,0,0,0.5)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = g
      ctx.fillRect(x0, 0, measure, vh)
      ctx.restore()
    }

    function onScroll() {
      // One read per frame, not one per event (SA-129).
      if (!raf) raf = requestAnimationFrame(draw)
    }

    let resizeTimer = 0
    function onResize() {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => void build(), 180)
    }

    void build()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    // The reader can change theme mid-reading. Colours and blend are read once
    // at mount, so without this the layer keeps the palette it started with —
    // light-theme ink sitting on a night-theme page.
    const themeWatch = new MutationObserver(() => setRebuild((n) => n + 1))
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    const shellWatch = new MutationObserver(() => setRebuild((n) => n + 1))
    const home = document.querySelector('.mock-home')
    if (home) {
      shellWatch.observe(home, {
        attributes: true,
        attributeFilter: ['data-reading-theme'],
      })
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.clearTimeout(resizeTimer)
      themeWatch.disconnect()
      shellWatch.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [heroSrc, rebuild])

  return (
    <canvas
      ref={canvasRef}
      className="drawing-near-atmosphere"
      aria-hidden="true"
    />
  )
}
