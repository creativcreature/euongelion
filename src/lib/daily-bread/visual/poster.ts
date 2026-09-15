/**
 * Daily Bread V2 — the static scene poster.
 *
 * This is what a reader sees before any script runs, when motion is reduced,
 * when WebGL is missing, and in the OG image. It samples the SAME field as the
 * live renderer, at time 0, on the SAME rotated screen, so when the canvas
 * fades in over it the dots are already where the poster put them.
 *
 * Pure and server-safe: plain numbers and a plain string. The dot count is
 * capped so the inline SVG never bloats the HTML.
 */
import type { ProceduralSceneId } from '@/lib/daily-bread/types'
import { hash2, normalizeSeed, sceneField } from './field'
import { SCENE_PALETTE, type SceneTheme } from './palette'

const KNOWN_SCENES: ReadonlySet<string> = new Set<ProceduralSceneId>(['living-water', 'grain', 'wilderness-stars'])

/**
 * The halftone screen, shared with the GLSL (`shaders.ts`) so print and pixel
 * agree. Radius is `sqrt(density) * rMax * cell`: dot AREA tracks density.
 */
export const HALFTONE_SCREEN = {
  /** Screen angle of the ink plate, degrees. */
  angleDeg: 15,
  /**
   * Radius at full density, in cells. Dots touch at about 65% and never quite
   * close the corners, so even the deepest shadow keeps its paper pinholes —
   * the screen stays visible in every tone.
   */
  rMax: 0.62,
  /** Below this density a cell prints nothing. */
  minDensity: 0.03,
  /** Share of cells that also carry the crimson plate. Sparingly. */
  spotRate: 0.05,
  /** The crimson plate only lands on midtones. */
  spotBand: [0.14, 0.7] as const,
  /** Misregistration of the crimson plate, in cells (≈1.5 CSS px at display). */
  misregCells: [0.1, -0.07] as const,
} as const

export const POSTER_DEFAULTS = { width: 1200, height: 600, cell: 18 } as const

/** Hard ceiling on circles in one poster (ink + spot). */
export const MAX_POSTER_DOTS = 2600

export interface PosterDot {
  cx: number
  cy: number
  r: number
  spot?: boolean
}

export interface ScenePoster {
  width: number
  height: number
  /** The cell actually used (grown past the request if the cap demanded). */
  cell: number
  dots: PosterDot[]
}

function round1(v: number): number {
  const r = Math.round(v * 10) / 10
  return r === 0 ? 0 : r
}

function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback
}

function sample(
  scene: ProceduralSceneId,
  seed: number,
  width: number,
  height: number,
  cell: number,
): PosterDot[] {
  const s = normalizeSeed(seed)
  const a = (HALFTONE_SCREEN.angleDeg * Math.PI) / 180
  const c = Math.cos(a)
  const sn = Math.sin(a)
  const rMax = HALFTONE_SCREEN.rMax * cell
  const [spotLo, spotHi] = HALFTONE_SCREEN.spotBand
  const [mx, my] = HALFTONE_SCREEN.misregCells

  // The screen is rotated about the top-left corner: screen = R(a) · lattice.
  // Bound the lattice by the frame's corners taken back into lattice space.
  let minI = Infinity
  let maxI = -Infinity
  let minJ = Infinity
  let maxJ = -Infinity
  for (const [x, y] of [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ]) {
    const li = (c * x + sn * y) / cell
    const lj = (-sn * x + c * y) / cell
    minI = Math.min(minI, li)
    maxI = Math.max(maxI, li)
    minJ = Math.min(minJ, lj)
    maxJ = Math.max(maxJ, lj)
  }

  const dots: PosterDot[] = []
  const margin = cell * 0.5
  for (let j = Math.floor(minJ) - 1; j <= Math.ceil(maxJ); j++) {
    for (let i = Math.floor(minI) - 1; i <= Math.ceil(maxI); i++) {
      const lx = (i + 0.5) * cell
      const ly = (j + 0.5) * cell
      const cx = c * lx - sn * ly
      const cy = sn * lx + c * ly
      if (cx < -margin || cx > width + margin) continue
      if (cy < -margin || cy > height + margin) continue
      const d = sceneField(scene, cx / width, cy / height, 0, seed)
      if (d < HALFTONE_SCREEN.minDensity) continue
      const r = Math.sqrt(d) * rMax
      if (r < 0.3) continue
      if (
        d > spotLo &&
        d < spotHi &&
        hash2(i, j, s + 97) < HALFTONE_SCREEN.spotRate
      ) {
        // The crimson plate goes down first so the ink overprints it.
        dots.push({
          cx: round1(cx + mx * cell),
          cy: round1(cy + my * cell),
          r: round1(r),
          spot: true,
        })
      }
      dots.push({ cx: round1(cx), cy: round1(cy), r: round1(r) })
    }
  }
  return dots
}

/**
 * Sample a scene at t = 0 onto the halftone screen. Deterministic; never more
 * than `MAX_POSTER_DOTS` circles (the cell grows until the poster fits).
 */
export function scenePosterDots(
  scene: ProceduralSceneId,
  seed: number,
  opts: { width?: number; height?: number; cell?: number } = {},
): ScenePoster {
  // A scene this renderer version does not know draws nothing honest: refuse,
  // and the component falls to its texture tier (plan §52).
  if (!KNOWN_SCENES.has(scene)) throw new Error(`[daily-bread:visual] unknown scene: ${String(scene)}`)
  const width = positive(opts.width, POSTER_DEFAULTS.width)
  const height = positive(opts.height, POSTER_DEFAULTS.height)
  // Start no finer than the lattice the cap could ever hold.
  let cell = Math.max(
    positive(opts.cell, POSTER_DEFAULTS.cell),
    Math.sqrt((width * height) / MAX_POSTER_DOTS),
  )
  let dots = sample(scene, seed, width, height, cell)
  while (dots.length > MAX_POSTER_DOTS) {
    cell *= 1.06
    dots = sample(scene, seed, width, height, cell)
  }
  return { width, height, cell, dots }
}

/**
 * A complete standalone SVG document for the poster — for OG images as a data
 * URI. Only `svg`, `rect` and `circle` elements; attributes are numbers and
 * palette hex values, nothing user-supplied reaches the string.
 */
export function scenePosterSvg(
  scene: ProceduralSceneId,
  seed: number,
  opts: { theme?: SceneTheme; width?: number; height?: number } = {},
): string {
  const palette = SCENE_PALETTE[opts.theme === 'dark' ? 'dark' : 'light']
  const { width, height, dots } = scenePosterDots(scene, seed, {
    width: opts.width,
    height: opts.height,
  })
  const w = round1(width)
  const h = round1(height)
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="${palette.ink}">`,
    `<rect width="${w}" height="${h}" fill="${palette.paper}"/>`,
  ]
  for (const dot of dots) {
    parts.push(
      dot.spot
        ? `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${palette.spot}"/>`
        : `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}"/>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}
