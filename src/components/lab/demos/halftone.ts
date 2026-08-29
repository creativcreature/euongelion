/**
 * The living halftone — the engine behind the animated imagery treatment.
 *
 * WHY THIS IS NOT THE FAILED DITHER PASS. The first attempt quantised each
 * pixel of an already-riso plate through a Bayer matrix, which beat the
 * source's own dot grid against the matrix and produced moiré. This engine
 * RESAMPLES: it averages the source over each output cell and draws ONE dot
 * per cell. Averaging is a low-pass — it destroys the source's dot grid
 * before the new one is imposed, so there is nothing left to beat against.
 * That is the whole fix, and it is why this can run on the real plates.
 *
 * The house rule holds: no greys. Every shadow is dot DENSITY (here, dot
 * radius on flat ink), which is what the brand already claims in print.
 *
 * Animation modes exist because a dot field whose radius is a function of
 * time is a living halftone — the brand's own texture, breathing, rather
 * than a filter laid over it.
 */

export type HalftoneMode = 'still' | 'breathe' | 'resolve' | 'scan' | 'bloom'

export interface HalftoneOpts {
  /** Output cell size in CSS px. Coarse is the point — 6–20 reads as ink. */
  cell: number
  mode: HalftoneMode
  /** 0→1 progress for the entrance modes. */
  t: number
  ink: string
  paper: string
  /** Dot gain: >1 fattens every dot, as ink does on absorbent stock. */
  gain: number
}

/** Rec.709 luma — the perceptual one, so the ramp matches the eye. */
function luma(d: Uint8ClampedArray, i: number) {
  return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
}

/**
 * Average the source into a coarse luminance grid ONCE. Cheap per frame
 * afterwards: animation only re-draws dots, it never re-reads pixels.
 */
export function sampleGrid(
  img: CanvasImageSource,
  w: number,
  h: number,
  cell: number,
): { cols: number; rows: number; lum: Float32Array } | null {
  const cols = Math.max(1, Math.floor(w / cell))
  const rows = Math.max(1, Math.floor(h / cell))
  const off = document.createElement('canvas')
  off.width = cols
  off.height = rows
  const ctx = off.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  // Drawing the whole plate into a cols×rows canvas IS the box filter —
  // the browser's own downscale averages every source pixel in each cell.
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, cols, rows)
  let data: ImageData
  try {
    data = ctx.getImageData(0, 0, cols, rows)
  } catch {
    return null // tainted canvas
  }
  const lum = new Float32Array(cols * rows)
  for (let i = 0; i < cols * rows; i++) lum[i] = luma(data.data, i * 4)
  return { cols, rows, lum }
}

/** Draw one frame of the dot field. */
export function drawHalftone(
  ctx: CanvasRenderingContext2D,
  grid: { cols: number; rows: number; lum: Float32Array },
  w: number,
  h: number,
  o: HalftoneOpts,
) {
  const { cols, rows, lum } = grid
  ctx.save()
  ctx.fillStyle = o.paper
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = o.ink
  const cw = w / cols
  const ch = h / rows
  // A dot that just touches its neighbours at full ink.
  const rMax = (Math.min(cw, ch) / 2) * 1.42 * o.gain

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const l = lum[y * cols + x]
      // Ink is the INVERSE of light: dark source = big dot.
      let v = 1 - l
      const nx = x / cols
      const ny = y / rows

      switch (o.mode) {
        case 'breathe': {
          // A slow diagonal swell. Density itself is alive; nothing moves
          // position, so the image never smears.
          const wave = Math.sin((nx + ny) * 5.2 - o.t * Math.PI * 2) * 0.5 + 0.5
          v *= 0.82 + wave * 0.3
          break
        }
        case 'resolve': {
          // The plate arrives: dots grow in on a diagonal wipe. This is the
          // entrance — an image that is PRINTED rather than faded in.
          const front = o.t * 1.55 - 0.25
          const local = (front - (nx * 0.55 + ny * 0.45)) / 0.3
          v *= Math.max(0, Math.min(1, local))
          break
        }
        case 'scan': {
          // A band of heavier ink travels down, like a press roller.
          const band = Math.abs(((o.t * 1.4) % 1.4) - ny)
          v *= band < 0.09 ? 1.5 : 1
          break
        }
        case 'bloom': {
          // Radial swell from centre — used behind the wordmark.
          const d = Math.hypot(nx - 0.5, ny - 0.5)
          v *= 0.7 + Math.sin(d * 9 - o.t * Math.PI * 2) * 0.3
          break
        }
      }

      v = Math.max(0, Math.min(1.35, v))
      if (v < 0.035) continue
      // sqrt so AREA is linear in density — how real halftones behave.
      const r = Math.sqrt(v) * rMax
      ctx.beginPath()
      ctx.arc((x + 0.5) * cw, (y + 0.5) * ch, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
