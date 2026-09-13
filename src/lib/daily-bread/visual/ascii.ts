/**
 * Daily Bread V2 — the ASCII renderer.
 *
 * The same scene field, printed in characters instead of dots: a denser glyph
 * where there is more ink. Used when the edition asks for `ascii`, and as the
 * Canvas2D path when WebGL is unavailable.
 */
import type { ProceduralSceneId } from '@/lib/daily-bread/types'
import { sceneField } from './field'

/** Lightest to heaviest. A space is clean paper. */
export const ASCII_RAMP = ' .·:;+*#'

/**
 * Tone curve: the halftone field carries a mid-grey "wash" nearly everywhere,
 * which in glyphs reads as a wall of punctuation. Paper below the floor stays
 * paper, and the rest is eased so only real ink gets heavy characters.
 */
const ASCII_FLOOR = 0.24
const ASCII_GAMMA = 1.35

export function asciiTone(density: number): number {
  const v = Math.max(0, Math.min(1, (density - ASCII_FLOOR) / (1 - ASCII_FLOOR)))
  return Math.pow(v, ASCII_GAMMA)
}

/** One frame as `rows` strings of `cols` characters. Deterministic. */
export function asciiFrame(
  scene: ProceduralSceneId,
  seed: number,
  t: number,
  cols: number,
  rows: number,
): string[] {
  const c = Math.max(0, Math.floor(cols))
  const r = Math.max(0, Math.floor(rows))
  const last = ASCII_RAMP.length - 1
  const lines: string[] = []
  for (let j = 0; j < r; j++) {
    let line = ''
    for (let i = 0; i < c; i++) {
      const d = sceneField(scene, (i + 0.5) / c, (j + 0.5) / r, t, seed)
      line += ASCII_RAMP[Math.min(last, Math.floor(asciiTone(d) * ASCII_RAMP.length))]
    }
    lines.push(line)
  }
  return lines
}

/**
 * Paint a frame: paper first, then each glyph centred in its cell so the grid
 * holds regardless of the font's advance width.
 */
export function drawAsciiFrame(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  opts: {
    width: number
    height: number
    ink: string
    paper: string
    font: string
  },
): void {
  const { width, height } = opts
  ctx.fillStyle = opts.paper
  ctx.fillRect(0, 0, width, height)
  const rows = lines.length
  if (rows === 0) return
  const cols = lines[0].length
  if (cols === 0) return
  const cw = width / cols
  const ch = height / rows
  ctx.fillStyle = opts.ink
  ctx.font = opts.font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let j = 0; j < rows; j++) {
    const line = lines[j]
    const y = (j + 0.5) * ch
    for (let i = 0; i < line.length; i++) {
      const glyph = line[i]
      if (glyph === ' ') continue
      ctx.fillText(glyph, (i + 0.5) * cw, y)
    }
  }
}
