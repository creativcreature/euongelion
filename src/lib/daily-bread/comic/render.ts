/**
 * The Daily Bread V2 comic — deterministic riso line-art renderer.
 *
 * A ComicScript goes in, an SvgNode tree comes out. Pure: no Math.random, no
 * clock, no I/O. Any variation (star fields, grass tufts) is derived from the
 * script id and panel index through the edition's FNV hash, so the same
 * script always draws the same strip.
 *
 * Colour is never baked in as a theme decision. Shapes carry the classes
 * db2-ink / db2-paper / db2-spot / db2-line / db2-dots, which the page's CSS
 * maps to the edition tokens; the hex values on the attributes are only the
 * print fallback when no stylesheet is present.
 *
 * Figures are faceless silhouettes. No speech, no lettering is ever drawn.
 */
import type {
  ComicFigureId,
  ComicPanel,
  ComicPanelFigure,
  ComicScript,
  ComicSettingId,
} from '@/lib/daily-bread/types'
import { hashString, mulberry32 } from '@/lib/daily-bread/prng'
import type { SvgNode } from './svg'

export const PANEL_WIDTH = 400
export const PANEL_HEIGHT = 300
export const STRIP_WIDTH = 1260
export const STRIP_HEIGHT = 320
const GUTTER = 20
const MARGIN = 10
const LINE = 2.2

/* Print fallbacks only — the stylesheet wins (see daily-bread-v2-comic.css). */
const INK_HEX = '#1f2a8d'
const PAPER_HEX = '#f5eee3'
const SPOT_HEX = '#c4192e'

type Attrs = Record<string, string | number>

/* ── Primitives ──────────────────────────────────────────────────────── */

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function safeId(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'strip'
}

export function halftonePatternId(scriptId: string): string {
  return `db2-halftone-${safeId(scriptId)}`
}

function g(children: SvgNode[], attrs: Attrs = {}): SvgNode {
  return { tag: 'g', attrs, children }
}

/** An ink line (no fill). */
function line(d: string, width = LINE, attrs: Attrs = {}): SvgNode {
  return {
    tag: 'path',
    attrs: {
      d,
      class: 'db2-line',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': round(width),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      ...attrs,
    },
  }
}

/** A solid ink shape. */
function ink(d: string): SvgNode {
  return { tag: 'path', attrs: { d, class: 'db2-ink', fill: INK_HEX } }
}

/** A solid crimson spot shape. */
function spot(d: string): SvgNode {
  return { tag: 'path', attrs: { d, class: 'db2-spot', fill: SPOT_HEX } }
}

/** A paper-filled shape with an ink outline (occludes what is behind it). */
function paper(d: string, width = LINE): SvgNode {
  return {
    tag: 'path',
    attrs: {
      d,
      class: 'db2-paper',
      fill: PAPER_HEX,
      stroke: 'currentColor',
      'stroke-width': round(width),
      'stroke-linejoin': 'round',
    },
  }
}

/** A halftone tone area. */
function dots(d: string, patternId: string): SvgNode {
  return {
    tag: 'path',
    attrs: { d, class: 'db2-dots', fill: `url(#${patternId})` },
  }
}

/** A darker halftone tone (larger dots on the same screen). */
function denseDots(d: string, patternId: string): SvgNode {
  return dots(d, `${patternId}-dense`)
}

function circle(
  cx: number,
  cy: number,
  r: number,
  kind: 'ink' | 'paper' | 'spot',
  width = LINE,
): SvgNode {
  const attrs: Attrs = { cx: round(cx), cy: round(cy), r: round(r) }
  if (kind === 'ink')
    return {
      tag: 'circle',
      attrs: { ...attrs, class: 'db2-ink', fill: INK_HEX },
    }
  if (kind === 'spot')
    return {
      tag: 'circle',
      attrs: { ...attrs, class: 'db2-spot', fill: SPOT_HEX },
    }
  return {
    tag: 'circle',
    attrs: {
      ...attrs,
      class: 'db2-paper',
      fill: PAPER_HEX,
      stroke: 'currentColor',
      'stroke-width': round(width),
    },
  }
}

/** A scalloped cloud outline (wool, canopies). */
function cloud(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps: number,
  puff = 1.28,
): string {
  const point = (a: number, k: number) =>
    `${round(cx + Math.cos(a) * rx * k)} ${round(cy + Math.sin(a) * ry * k)}`
  let d = `M ${point(0, 1)}`
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2
    const a1 = ((i + 1) / bumps) * Math.PI * 2
    d += ` Q ${point((a0 + a1) / 2, puff)} ${point(a1, 1)}`
  }
  return `${d} Z`
}

/* ── Figures ─────────────────────────────────────────────────────────────
   Drawn around (0, 0) = the figure's base (grounded figures) or centre (sky
   figures), facing right, at scale 1. `w` is the stroke width in figure units
   so every figure prints at the same line weight whatever its scale.        */

type FigureDraw = (w: number, p: string) => SvgNode[]

function robe(w: number, p: string, lean: number): SvgNode[] {
  return [
    paper(
      `M ${-11 + lean} -80 C ${-14 + lean} -60 -19 -30 -21 0 L 17 0 C 15 -30 ${13 + lean} -60 ${10 + lean} -80 Z`,
      w,
    ),
    dots(
      `M ${-11 + lean} -79 C ${-14 + lean} -60 -19 -30 -20 -1 L -7 -1 C -6 -30 ${-5 + lean} -60 ${-4 + lean} -79 Z`,
      p,
    ),
    line(`M ${-9 + lean} -76 C ${-1 + lean} -58 8 -44 15 -28`, w * 0.7),
    line('M -15 1 L -6 1', w * 1.3),
    line('M 9 1 L 18 1', w * 1.3),
  ]
}

function head(w: number, x: number, y: number): SvgNode[] {
  return [
    circle(x, y, 9, 'paper', w),
    ink(
      `M ${x - 10} ${y + 3} C ${x - 12} ${y - 12} ${x + 5} ${y - 16} ${x + 10} ${y - 5} C ${x + 3} ${y - 7} ${x - 3} ${y - 2} ${x - 4} ${y + 11} L ${x - 11} ${y + 13} Z`,
    ),
  ]
}

const traveler: FigureDraw = (w, p) => [
  line('M 27 -100 L 31 2', w * 1.1),
  ...robe(w, p, 0),
  ...head(w, 1, -91),
  line('M 6 -74 C 13 -64 19 -60 28 -62', w),
]

const sower: FigureDraw = (w, p) => [
  ...robe(w, p, 4),
  paper('M -22 -56 C -30 -48 -28 -30 -16 -28 C -6 -28 -6 -48 -14 -56 Z', w),
  dots('M -21 -50 C -26 -44 -25 -32 -16 -31 C -10 -31 -9 -44 -13 -50 Z', p),
  line('M -14 -56 L 4 -78', w * 0.8),
  ...head(w, 6, -91),
  line('M 10 -74 C 20 -80 30 -86 42 -88', w),
  ink('M 44 -84 l 2.2 -3 l 2.2 3 l -2.2 3 Z'),
  ink('M 52 -76 l 2 -3 l 2 3 l -2 3 Z'),
  ink('M 57 -64 l 2 -3 l 2 3 l -2 3 Z'),
  ink('M 50 -56 l 1.8 -2.6 l 1.8 2.6 l -1.8 2.6 Z'),
  ink('M 60 -48 l 1.8 -2.6 l 1.8 2.6 l -1.8 2.6 Z'),
]

const shepherd: FigureDraw = (w, p) => [
  line('M 25 -96 L 28 2', w * 1.1),
  line('M 25 -96 C 23 -112 40 -116 40 -103 C 40 -97 35 -96 34 -100', w * 1.1),
  ...robe(w, p, 0),
  ...head(w, 1, -91),
  line('M -9 -94 C -3 -97 5 -97 10 -94', w * 0.8),
  line('M 6 -74 C 12 -68 18 -68 25 -72', w),
]

const sheep: FigureDraw = (w, p) => [
  line('M -15 -12 L -16 0', w * 1.2),
  line('M -7 -12 L -7 0', w * 1.2),
  line('M 9 -12 L 10 0', w * 1.2),
  line('M 16 -12 L 17 0', w * 1.2),
  paper(cloud(-1, -22, 23, 11, 11), w),
  dots('M -20 -18 C -16 -10 14 -10 20 -18 C 12 -14 -12 -14 -20 -18 Z', p),
  ink(
    'M 18 -29 C 22 -35 30 -33 32 -26 C 34 -21 34 -16 31 -14 C 28 -12 25 -15 22 -19 C 19 -22 17 -25 18 -29 Z',
  ),
  ink('M 20 -29 C 16 -33 12 -32 11 -29 C 14 -27 17 -27 20 -26 Z'),
]

const lamp: FigureDraw = (w) => {
  const rays: SvgNode[] = []
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.02 + (i / 8) * 0.96)
    const cx = 21
    const cy = -88
    rays.push(
      line(
        `M ${round(cx + Math.cos(a) * 17)} ${round(cy + Math.sin(a) * 17)} L ${round(cx + Math.cos(a) * (i % 2 === 0 ? 30 : 25))} ${round(cy + Math.sin(a) * (i % 2 === 0 ? 30 : 25))}`,
        w * 0.8,
      ),
    )
  }
  return [
    ...rays,
    line('M -14 0 L 0 -14 L 14 0', w),
    line('M 0 -14 L 0 -64', w * 1.1),
    paper('M -15 -64 C -15 -69 15 -69 15 -64 C 15 -60 -15 -60 -15 -64 Z', w),
    ink('M -16 -68 C -17 -77 -6 -81 4 -79 C 11 -78 17 -75 22 -73 L 13 -67 Z'),
    line('M -16 -71 C -23 -73 -23 -65 -15 -66', w * 0.8),
    spot(
      'M 18 -74 C 12 -80 15 -90 21 -100 C 26 -90 29 -80 23 -74 C 22 -73 19 -73 18 -74 Z',
    ),
  ]
}

const bread: FigureDraw = (w, p) => [
  line('M -30 1 L 32 1', w * 0.8),
  paper('M -4 -10 C -6 -24 4 -30 14 -30 C 24 -30 32 -22 30 -10 Z', w),
  dots('M 6 -12 C 8 -20 16 -24 26 -22 C 29 -18 30 -14 29 -11 Z', p),
  paper('M -24 0 C -27 -14 -14 -22 -2 -22 C 10 -22 22 -14 20 0 Z', w),
  dots('M -22 -2 C -24 -8 -20 -12 -14 -14 C -14 -8 -10 -4 -4 -2 Z', p),
  line('M -14 -15 L -9 -10', w * 0.8),
  line('M -5 -18 L 0 -12', w * 0.8),
  line('M 4 -16 L 9 -11', w * 0.8),
]

const fish: FigureDraw = (w, p) => [
  ink('M -20 -12 L -35 -23 L -31 -12 L -35 -1 Z'),
  paper('M -21 -12 C -8 -27 16 -25 29 -12 C 16 1 -8 3 -21 -12 Z', w),
  dots('M -17 -13 C -6 -24 10 -23 12 -20 C 8 -15 -2 -12 -17 -13 Z', p),
  line('M 13 -20 C 10 -15 10 -9 13 -5', w * 0.8),
  circle(20, -14, 1.9, 'ink'),
  line('M -2 -5 L -8 1', w * 0.7),
]

const boat: FigureDraw = (w, p) => [
  line('M -4 -22 L -4 -110', w * 1.1),
  line('M -32 -98 L 26 -106', w),
  ink('M -30 -97 C -12 -90 10 -93 25 -104 C 12 -98 -8 -96 -30 -100 Z'),
  paper(
    'M -72 -34 C -60 -24 -40 -22 0 -22 C 40 -22 60 -24 72 -36 C 66 -12 48 4 24 6 L -26 6 C -50 4 -66 -12 -72 -34 Z',
    w,
  ),
  dots(
    'M -66 -20 C -40 -12 40 -12 66 -22 C 60 -8 46 2 24 4 L -26 4 C -48 2 -60 -8 -66 -20 Z',
    p,
  ),
  line('M -68 -27 C -44 -16 44 -16 68 -29', w * 0.7),
  line('M -86 10 C -74 5 -62 13 -48 8', w * 0.8),
  line('M 44 10 C 56 5 68 13 82 8', w * 0.8),
]

const bird: FigureDraw = () => [
  ink(
    'M -22 -6 C -14 -15 -6 -13 0 -2 C 6 -13 14 -17 23 -11 C 13 -9 6 -4 1 3 C -4 -3 -12 -7 -22 -6 Z',
  ),
]

const tree: FigureDraw = (w, p) => [
  line('M -46 1 L 46 1', w * 0.8),
  paper('M -9 0 C -6 -22 -10 -44 -5 -66 L 6 -66 C 8 -44 6 -22 11 0 Z', w),
  dots('M -6 -2 C -4 -22 -7 -44 -3 -64 L 1 -64 C 0 -44 1 -22 0 -2 Z', p),
  paper(cloud(0, -104, 56, 36, 12, 1.22), w),
  dots(cloud(8, -94, 42, 22, 9, 1.18), p),
  line('M -2 -70 C -12 -80 -22 -86 -32 -88', w * 0.8),
  line('M 3 -70 C 12 -82 22 -88 34 -92', w * 0.8),
]

const seed: FigureDraw = (w) => [
  line('M -14 -30 C -8 -24 -6 -16 -8 -8', w * 0.5),
  line('M 6 -32 C 10 -26 12 -18 10 -10', w * 0.5),
  ink('M -8 -6 l 2.4 -3.4 l 2.4 3.4 l -2.4 3.4 Z'),
  ink('M -2 -16 l 2.2 -3.2 l 2.2 3.2 l -2.2 3.2 Z'),
  ink('M 6 -3 l 2.4 -3.4 l 2.4 3.4 l -2.4 3.4 Z'),
  ink('M 10 -13 l 2 -3 l 2 3 l -2 3 Z'),
  ink('M 1 -26 l 2 -3 l 2 3 l -2 3 Z'),
]

const sprout: FigureDraw = (w, p) => {
  const grains: SvgNode[] = []
  for (let i = 0; i < 4; i++) {
    const y = -66 - i * 7
    grains.push(
      ink(
        `M 0 ${y} C -7 ${y - 2} -8 ${y - 8} -4 ${y - 11} C -1 ${y - 8} 0 ${y - 4} 0 ${y} Z`,
      ),
    )
    grains.push(
      ink(
        `M 1 ${y} C 8 ${y - 2} 9 ${y - 8} 5 ${y - 11} C 2 ${y - 8} 1 ${y - 4} 1 ${y} Z`,
      ),
    )
  }
  return [
    paper('M -20 1 C -12 -7 12 -7 20 1 Z', w),
    dots('M -16 0 C -8 -5 8 -5 16 0 Z', p),
    line('M 0 -3 C -2 -20 3 -42 1 -64', w),
    ink('M -1 -18 C -12 -21 -20 -31 -23 -40 C -12 -38 -4 -30 -1 -23 Z'),
    paper('M 2 -32 C 11 -35 19 -45 21 -55 C 11 -52 4 -44 2 -37 Z', w * 0.8),
    ...grains,
    line('M -3 -94 L -6 -104', w * 0.5),
    line('M 1 -95 L 1 -106', w * 0.5),
    line('M 4 -94 L 8 -103', w * 0.5),
  ]
}

const door: FigureDraw = (w, p) => [
  paper('M -44 0 L -44 -80 L 44 -80 L 44 0 Z', w),
  dots('M 24 -79 L 43 -79 L 43 -1 L 24 -1 Z', p),
  ink('M -50 -90 L 50 -90 L 50 -80 L -50 -80 Z'),
  ink('M -14 0 L -14 -38 C -14 -58 14 -58 14 -38 L 14 0 Z'),
  paper('M 14 0 L 14 -44 L 25 -40 L 25 4 Z', w * 0.9),
  ink('M -36 -64 L -26 -64 L -26 -52 L -36 -52 Z'),
  line('M -24 2 L 30 2', w),
  line('M -44 -30 L -30 -30', w * 0.6),
  line('M 30 -56 L 44 -56', w * 0.6),
]

const well: FigureDraw = (w, p) => [
  line('M -28 -40 L -28 -88', w * 1.1),
  line('M 28 -40 L 28 -88', w * 1.1),
  line('M -36 -88 L 36 -88', w * 1.2),
  line('M 4 -88 L 4 -62', w * 0.7),
  paper('M -4 -62 L 12 -62 L 10 -50 L -2 -50 Z', w * 0.8),
  paper(
    'M -34 -40 L -34 -4 C -34 6 34 6 34 -4 L 34 -40 C 34 -32 -34 -32 -34 -40 Z',
    w,
  ),
  dots('M 14 -34 L 33 -38 L 33 -5 C 30 1 22 2 14 3 Z', p),
  line('M -34 -26 C -20 -19 20 -19 34 -26', w * 0.7),
  line('M -34 -12 C -20 -5 20 -5 34 -12', w * 0.7),
  line('M -14 -34 L -14 -23', w * 0.6),
  line('M 8 -21 L 8 -9', w * 0.6),
  line('M -22 -8 L -22 1', w * 0.6),
  paper('M -34 -40 C -34 -48 34 -48 34 -40 C 34 -32 -34 -32 -34 -40 Z', w),
  ink('M -27 -40 C -27 -45 27 -45 27 -40 C 27 -36 -27 -36 -27 -40 Z'),
]

const star: FigureDraw = (w) => {
  const halo: SvgNode[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    halo.push(
      line(
        `M ${round(Math.cos(a) * 26)} ${round(Math.sin(a) * 26)} L ${round(Math.cos(a) * 34)} ${round(Math.sin(a) * 34)}`,
        w * 0.8,
      ),
    )
  }
  return [
    ...halo,
    paper(
      'M 0 -24 L 4.5 -4.5 L 24 0 L 4.5 4.5 L 0 24 L -4.5 4.5 L -24 0 L -4.5 -4.5 Z',
      w,
    ),
    ink('M -11 -11 L -2 -4 L 11 -11 L 4 -2 L 11 11 L 2 4 L -11 11 L -4 2 Z'),
  ]
}

const sun: FigureDraw = (w) => {
  const rays: SvgNode[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r2 = i % 2 === 0 ? 38 : 32
    rays.push(
      line(
        `M ${round(Math.cos(a) * 27)} ${round(Math.sin(a) * 27)} L ${round(Math.cos(a) * r2)} ${round(Math.sin(a) * r2)}`,
        w,
      ),
    )
  }
  return [...rays, circle(0, 0, 20, 'spot')]
}

const wave: FigureDraw = (w, p) => {
  const body =
    'M -70 0 C -60 -30 -36 -58 0 -63 C 30 -67 53 -52 55 -34 C 56 -25 48 -21 42 -26 C 37 -31 41 -41 30 -43 C 16 -45 8 -30 14 -13 C 18 -4 30 0 44 0 Z'
  return [
    paper(body, w),
    dots(body, `${p}-dense`),
    line(body, w),
    paper(
      'M -44 -44 C -28 -58 2 -66 24 -62 C 44 -58 56 -45 55 -32 C 55 -25 48 -21 42 -26 C 45 -35 40 -47 26 -51 C 6 -56 -20 -52 -44 -44 Z',
      w,
    ),
    paper('M 36 -27 L 34 -18 L 41 -24 L 42 -15 L 46 -23', w * 0.7),
    line('M -30 -30 C -20 -40 -8 -44 4 -44', w * 0.6),
    line('M -44 -14 C -34 -24 -22 -28 -10 -28', w * 0.6),
    circle(-10, -70, 3, 'paper', w * 0.7),
    circle(8, -76, 2.4, 'paper', w * 0.7),
    circle(28, -72, 2, 'paper', w * 0.7),
    line('M 44 0 C 56 -3 64 3 76 0', w * 0.8),
  ]
}

const FIGURES: Record<ComicFigureId, FigureDraw> = {
  sower,
  shepherd,
  sheep,
  lamp,
  bread,
  fish,
  boat,
  bird,
  tree,
  seed,
  sprout,
  door,
  traveler,
  well,
  star,
  sun,
  wave,
}

/** Base size of each figure at script scale 1, relative to its drawing. */
const FIGURE_SIZE: Record<ComicFigureId, number> = {
  sower: 1.3,
  shepherd: 1.3,
  traveler: 1.3,
  sheep: 1.35,
  lamp: 1.15,
  bread: 1.3,
  fish: 1.2,
  boat: 1.1,
  bird: 1.2,
  tree: 1.1,
  seed: 1.3,
  sprout: 1.25,
  door: 1.2,
  well: 1.2,
  star: 1,
  sun: 1,
  wave: 1.1,
}

function drawFigure(figure: ComicPanelFigure, patternId: string): SvgNode {
  const draw = FIGURES[figure.figure]
  if (!draw) throw new Error(`Unknown comic figure: ${String(figure.figure)}`)
  const scale = figure.scale * FIGURE_SIZE[figure.figure]
  const x = round(figure.x * PANEL_WIDTH)
  const y = round(figure.y * PANEL_HEIGHT)
  const sx = figure.flip ? -scale : scale
  return g(draw(LINE / scale, patternId), {
    transform: `translate(${x} ${y}) scale(${round(sx)} ${round(scale)})`,
  })
}

/* ── Settings ───────────────────────────────────────────────────────────
   Each setting paints a back layer and (for the boat) a front layer that
   sits over figures standing inside it.                                    */

interface SettingLayers {
  back: SvgNode[]
  front: SvgNode[]
  /** Figures whose base is below this y are drawn over the front layer. */
  frontFrom: number
}

interface SettingContext {
  p: string
  rand: () => number
  figures: ReadonlySet<ComicFigureId>
}

function tufts(
  ctx: SettingContext,
  count: number,
  y0: number,
  y1: number,
): SvgNode[] {
  const out: SvgNode[] = []
  for (let i = 0; i < count; i++) {
    const x = round(12 + ctx.rand() * 376)
    const y = round(y0 + ctx.rand() * (y1 - y0))
    out.push(
      line(
        `M ${x - 4} ${y - 5} L ${x} ${y} L ${x + 1} ${y - 7} M ${x} ${y} L ${x + 5} ${y - 4}`,
        1.3,
      ),
    )
  }
  return out
}

function ripples(
  ctx: SettingContext,
  count: number,
  y0: number,
  y1: number,
): SvgNode[] {
  const out: SvgNode[] = []
  for (let i = 0; i < count; i++) {
    const x = round(10 + ctx.rand() * 350)
    const y = round(y0 + ((i + ctx.rand() * 0.6) / count) * (y1 - y0))
    const len = round(18 + ctx.rand() * 22)
    out.push(
      line(
        `M ${x} ${y} c ${round(len / 3)} -3 ${round((len * 2) / 3)} 3 ${len} 0`,
        1.4,
      ),
    )
  }
  return out
}

function field(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    dots(
      'M 0 92 L 0 80 C 50 70 90 72 130 80 C 170 88 210 72 260 70 C 310 68 350 78 400 74 L 400 92 Z',
      ctx.p,
    ),
    line(
      'M 0 80 C 50 70 90 72 130 80 C 170 88 210 72 260 70 C 310 68 350 78 400 74',
      1.6,
    ),
    line('M 0 92 L 400 92', 1.8),
  ]
  const rows = [104, 120, 142, 170, 206, 250, 302]
  rows.forEach((y, k) => {
    back.push(
      line(
        `M -4 ${y} C 130 ${y - 5 - k} 270 ${y + 5 + k} 404 ${y - 3}`,
        1.2 + k * 0.18,
      ),
    )
  })
  back.push(
    dots(
      `M -4 142 C 130 135 270 149 404 139 L 404 167 C 270 177 130 164 -4 170 Z`,
      ctx.p,
    ),
  )
  for (let i = 0; i < 16; i++) {
    const k = 3 + Math.floor(ctx.rand() * 3)
    const y = rows[k] + 6 + ctx.rand() * 10
    const x = round(10 + ctx.rand() * 380)
    back.push(line(`M ${x} ${round(y)} l ${round(4 + k)} -1`, 1.4))
  }
  return { back, front: [], frontFrom: Infinity }
}

function shore(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    ink('M 0 88 L 0 66 C 26 58 62 62 92 76 C 104 82 116 86 126 88 Z'),
    dots(
      'M 0 88 L 400 88 L 400 176 C 330 166 270 190 200 180 C 130 170 70 192 0 184 Z',
      ctx.p,
    ),
    line('M 0 88 L 400 88', 1.8),
    line('M 0 184 C 70 192 130 170 200 180 C 270 190 330 166 400 176', LINE),
    line('M 0 196 C 60 202 140 184 210 192 C 280 200 330 182 400 188', 1.2),
    ...ripples(ctx, 6, 100, 160),
  ]
  for (let i = 0; i < 18; i++) {
    const x = 8 + ctx.rand() * 384
    const y = 214 + ctx.rand() * 80
    back.push(circle(x, y, 1.1, 'ink'))
  }
  return { back, front: [], frontFrom: Infinity }
}

function hillside(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    dots(
      'M 0 96 L 0 84 C 60 72 130 78 180 88 C 240 98 320 72 400 80 L 400 96 Z',
      ctx.p,
    ),
    line('M 0 84 C 60 72 130 78 180 88 C 240 98 320 72 400 80', 1.6),
    dots(
      'M -4 176 C 80 124 180 112 260 130 C 320 144 360 150 404 146 L 404 176 C 360 180 320 176 260 162 C 180 146 80 158 -4 206 Z',
      ctx.p,
    ),
    line('M -4 176 C 80 124 180 112 260 130 C 320 144 360 150 404 146', LINE),
    ...tufts(ctx, 12, 196, 292),
  ]
  return { back, front: [], frontFrom: Infinity }
}

function road(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    dots(
      'M 0 100 L 0 88 C 50 78 110 82 160 92 C 200 98 250 80 300 82 C 340 84 370 90 400 86 L 400 100 Z',
      ctx.p,
    ),
    line(
      'M 0 88 C 50 78 110 82 160 92 C 200 98 250 80 300 82 C 340 84 370 90 400 86',
      1.6,
    ),
    line('M 0 100 L 400 100', 1.8),
    dots(
      'M -4 101 L 226 101 C 216 115 204 130 190 146 C 120 136 50 142 -4 150 Z',
      ctx.p,
    ),
    dots(
      'M 404 101 L 234 101 C 244 115 256 130 270 144 C 320 138 370 140 404 144 Z',
      ctx.p,
    ),
    line('M -4 150 C 50 142 120 136 190 146', 1.2),
    line('M 270 144 C 320 138 370 140 404 144', 1.2),
    line('M 40 304 C 140 206 200 136 226 101', LINE),
    line('M 372 304 C 300 206 256 136 234 101', LINE),
  ]
  for (const x of [64, 82, 356]) {
    back.push(
      ink(
        `M ${x} 100 C ${x - 6} 90 ${x - 4} 70 ${x} 60 C ${x + 4} 70 ${x + 6} 90 ${x} 100 Z`,
      ),
    )
  }
  for (let i = 0; i < 7; i++) {
    const t = ctx.rand()
    const y = round(120 + t * 170)
    const left = i % 2 === 0
    const x = left
      ? round(226 - (y - 101) * 0.95 - 10)
      : round(234 + (y - 101) * 0.72 + 10)
    back.push(
      paper(
        `M ${x - 4} ${y} C ${x - 4} ${y - 5} ${x + 4} ${y - 5} ${x + 4} ${y} Z`,
        1.2,
      ),
    )
  }
  return { back, front: [], frontFrom: Infinity }
}

function night(ctx: SettingContext): SettingLayers {
  const sky =
    'M -4 -4 L 404 -4 L 404 204 C 330 196 270 212 190 204 C 110 196 60 208 -4 202 Z'
  const back: SvgNode[] = [denseDots(sky, ctx.p)]
  for (let i = 0; i < 22; i++) {
    const x = 6 + ctx.rand() * 388
    const y = 6 + ctx.rand() * 176
    back.push(circle(x, y, 1 + ctx.rand() * 1.6, 'paper', 0))
  }
  for (let i = 0; i < 3; i++) {
    const x = round(20 + ctx.rand() * 360)
    const y = round(14 + ctx.rand() * 120)
    back.push(
      paper(
        `M ${x} ${y - 6} L ${x + 1.5} ${y - 1.5} L ${x + 6} ${y} L ${x + 1.5} ${y + 1.5} L ${x} ${y + 6} L ${x - 1.5} ${y + 1.5} L ${x - 6} ${y} L ${x - 1.5} ${y - 1.5} Z`,
        0,
      ),
    )
  }
  if (!ctx.figures.has('star') && !ctx.figures.has('sun')) {
    const x = round(
      ctx.rand() < 0.5 ? 52 + ctx.rand() * 40 : 300 + ctx.rand() * 50,
    )
    const y = round(40 + ctx.rand() * 20)
    back.push(
      paper(
        `M ${x} ${y - 15} A 15 15 0 1 0 ${x} ${y + 15} A 11 13 0 1 1 ${x} ${y - 15} Z`,
        0,
      ),
    )
  }
  back.push(
    line('M -4 202 C 60 208 110 196 190 204 C 270 212 330 196 404 204', LINE),
  )
  if (
    ctx.figures.has('boat') ||
    ctx.figures.has('wave') ||
    ctx.figures.has('fish')
  ) {
    back.push(...ripples(ctx, 7, 222, 290))
  } else {
    back.push(
      line('M -4 232 C 80 222 170 238 250 228 C 320 220 370 226 404 224', 1.2),
    )
    back.push(...tufts(ctx, 8, 240, 292))
  }
  return { back, front: [], frontFrom: Infinity }
}

function room(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    ink('M -4 -4 L 404 -4 L 404 14 L -4 14 Z'),
    ink('M 40 14 L 56 14 L 56 22 L 40 22 Z'),
    ink('M 180 14 L 196 14 L 196 22 L 180 22 Z'),
    ink('M 320 14 L 336 14 L 336 22 L 320 22 Z'),
    dots('M 302 226 L 302 124 C 302 94 358 94 358 124 L 358 226 Z', ctx.p),
    line('M 302 226 L 302 124 C 302 94 358 94 358 124 L 358 226', LINE),
    line('M 292 226 L 292 120 C 292 82 368 82 368 120 L 368 226', 1.2),
    ink('M 58 96 L 58 116 L 76 116 L 76 96 C 76 84 58 84 58 96 Z'),
    line('M -4 226 L 404 226', LINE),
    dots('M -4 227 L 404 227 L 404 304 L -4 304 Z', ctx.p),
  ]
  for (const x of [-40, 60, 160, 260, 360, 460]) {
    back.push(line(`M ${round(200 + (x - 200) * 0.55)} 227 L ${x} 304`, 1.1))
  }
  for (let i = 0; i < 6; i++) {
    const x = round(20 + ctx.rand() * 250)
    const y = round(40 + ctx.rand() * 160)
    back.push(line(`M ${x} ${y} l ${round(10 + ctx.rand() * 12)} 0`, 1))
  }
  return { back, front: [], frontFrom: Infinity }
}

function garden(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [line('M 0 84 L 400 84', 1.6)]
  for (const [x, r] of [
    [44, 16],
    [96, 12],
    [338, 18],
  ] as const) {
    back.push(line(`M ${x} 84 L ${x} ${84 - r}`, 1.4))
    back.push(dots(cloud(x, 84 - r - r * 0.6, r, r * 0.7, 7, 1.2), ctx.p))
    back.push(line(cloud(x, 84 - r - r * 0.6, r, r * 0.7, 7, 1.2), 1.2))
  }
  back.push(paper('M -4 118 L 404 118 L 404 136 L -4 136 Z', 1.8))
  for (let x = 14; x < 400; x += 34) {
    back.push(line(`M ${x} 118 L ${x} 127 M ${x + 17} 127 L ${x + 17} 136`, 1))
  }
  back.push(line('M -4 127 L 404 127', 1))
  for (const y of [196, 258]) {
    back.push(
      dots(
        `M -4 ${y} C 90 ${y - 16} 310 ${y - 16} 404 ${y} L 404 ${y + 14} C 310 ${y + 4} 90 ${y + 4} -4 ${y + 14} Z`,
        ctx.p,
      ),
    )
    back.push(line(`M -4 ${y} C 90 ${y - 16} 310 ${y - 16} 404 ${y}`, 1.6))
    for (let i = 0; i < 7; i++) {
      const x = round(24 + i * 56 + ctx.rand() * 14)
      const top = round(y - 10 - Math.sin((x / 400) * Math.PI) * 10)
      back.push(
        line(
          `M ${x} ${top + 8} C ${x - 2} ${top} ${x - 6} ${top - 4} ${x - 10} ${top - 5} M ${x} ${top + 8} C ${x + 2} ${top} ${x + 6} ${top - 5} ${x + 9} ${top - 7}`,
          1.3,
        ),
      )
    }
  }
  return { back, front: [], frontFrom: Infinity }
}

function boatSetting(ctx: SettingContext): SettingLayers {
  const back: SvgNode[] = [
    dots('M 0 100 L 0 90 C 40 84 90 86 130 94 L 150 100 Z', ctx.p),
    line('M 0 100 L 400 100', 1.8),
    dots('M -4 101 L 404 101 L 404 304 L -4 304 Z', ctx.p),
    ...ripples(ctx, 5, 112, 170),
    line('M 214 204 L 214 36', LINE * 1.2),
    line('M 170 58 L 262 44', LINE),
    ink('M 172 60 C 196 70 236 66 260 46 C 238 56 200 60 172 56 Z'),
    line('M 214 38 L 132 196', 1.1),
  ]
  const front: SvgNode[] = [
    paper(
      'M 52 186 C 100 204 150 210 200 210 C 250 210 300 204 348 184 C 338 222 304 244 262 248 L 138 248 C 96 244 62 222 52 186 Z',
      LINE,
    ),
    dots(
      'M 62 214 C 120 226 280 226 338 212 C 326 232 300 244 262 246 L 138 246 C 100 244 74 232 62 214 Z',
      ctx.p,
    ),
    line('M 56 196 C 110 214 290 214 344 194', 1.4),
    line('M 20 256 C 40 250 60 260 84 254', 1.6),
    line('M 316 256 C 336 250 356 260 380 252', 1.6),
  ]
  return { back, front, frontFrom: 246 }
}

const SETTINGS: Record<ComicSettingId, (ctx: SettingContext) => SettingLayers> =
  {
    field,
    shore,
    hillside,
    road,
    night,
    room,
    garden,
    boat: boatSetting,
  }

/* ── Panels and strips ──────────────────────────────────────────────── */

/**
 * One 400x300 panel as a <g>. `patternId` defaults to the strip's halftone
 * pattern; standalone panel SVGs pass their own so each SVG is self-contained.
 */
export function renderComicPanel(
  panel: ComicPanel,
  index: number,
  scriptId: string,
  patternId: string = halftonePatternId(scriptId),
): SvgNode {
  const drawSetting = SETTINGS[panel.setting]
  if (!drawSetting)
    throw new Error(`Unknown comic setting: ${String(panel.setting)}`)
  const ctx: SettingContext = {
    p: patternId,
    rand: mulberry32(hashString(`${scriptId}:${index}`)),
    figures: new Set(panel.figures.map((f) => f.figure)),
  }
  const layers = drawSetting(ctx)
  const behind: SvgNode[] = []
  const infront: SvgNode[] = []
  for (const figure of panel.figures) {
    const node = drawFigure(figure, patternId)
    if (figure.y * PANEL_HEIGHT >= layers.frontFrom) infront.push(node)
    else behind.push(node)
  }
  return g(
    [
      {
        tag: 'rect',
        attrs: {
          x: 0,
          y: 0,
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
          class: 'db2-paper',
          fill: PAPER_HEX,
        },
      },
      g(layers.back),
      g(behind),
      g(layers.front),
      g(infront),
    ],
    { class: `db2-panel db2-panel-${index + 1}` },
  )
}

function screen(id: string, radius: number): SvgNode {
  return {
    tag: 'pattern',
    attrs: { id, patternUnits: 'userSpaceOnUse', width: 6, height: 6 },
    children: [
      {
        tag: 'circle',
        attrs: { cx: 1.5, cy: 1.5, r: radius, class: 'db2-ink', fill: INK_HEX },
      },
      {
        tag: 'circle',
        attrs: { cx: 4.5, cy: 4.5, r: radius, class: 'db2-ink', fill: INK_HEX },
      },
    ],
  }
}

/** The halftone screens: a light tone and a dense (night) tone. */
function halftoneDefs(patternId: string): SvgNode {
  return {
    tag: 'defs',
    attrs: {},
    children: [screen(patternId, 1.15), screen(`${patternId}-dense`, 1.6)],
  }
}

function border(x: number, y: number, width: number, height: number): SvgNode {
  return {
    tag: 'rect',
    attrs: {
      x,
      y,
      width,
      height,
      class: 'db2-line',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2.6,
    },
  }
}

/** Panel content clipped to its frame by a nested viewport. */
function panelViewport(content: SvgNode, x: number, y: number): SvgNode {
  return {
    tag: 'svg',
    attrs: {
      x,
      y,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      viewBox: `0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`,
    },
    children: [content],
  }
}

/** The whole three-panel strip: viewBox 0 0 1260 320. */
export function renderComicStrip(script: ComicScript): SvgNode {
  const patternId = halftonePatternId(script.id)
  const panels = script.panels.map((panel, index) => {
    const x = MARGIN + index * (PANEL_WIDTH + GUTTER)
    return g(
      [
        panelViewport(
          renderComicPanel(panel, index, script.id, patternId),
          0,
          0,
        ),
        border(0, 0, PANEL_WIDTH, PANEL_HEIGHT),
      ],
      { transform: `translate(${x} ${MARGIN})` },
    )
  })
  return {
    tag: 'svg',
    attrs: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`,
      role: 'img',
      class: 'db2-comic-strip',
      preserveAspectRatio: 'xMidYMid meet',
    },
    children: [
      { tag: 'title', attrs: {}, text: script.title },
      halftoneDefs(patternId),
      {
        tag: 'rect',
        attrs: {
          x: 0,
          y: 0,
          width: STRIP_WIDTH,
          height: STRIP_HEIGHT,
          class: 'db2-paper',
          fill: PAPER_HEX,
        },
      },
      ...panels,
    ],
  }
}

/** One panel as its own SVG (viewBox 0 0 400 300), for the narrow stack. */
export function renderComicPanelSvg(
  script: ComicScript,
  index: number,
): SvgNode {
  const panel = script.panels[index]
  if (!panel) throw new Error(`Comic ${script.id} has no panel ${index + 1}`)
  const patternId = `${halftonePatternId(script.id)}-p${index + 1}`
  return {
    tag: 'svg',
    attrs: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`,
      role: 'img',
      class: 'db2-comic-panel',
      preserveAspectRatio: 'xMidYMid meet',
    },
    children: [
      { tag: 'title', attrs: {}, text: `${script.title}, panel ${index + 1}` },
      halftoneDefs(patternId),
      renderComicPanel(panel, index, script.id, patternId),
      border(1.3, 1.3, PANEL_WIDTH - 2.6, PANEL_HEIGHT - 2.6),
    ],
  }
}
