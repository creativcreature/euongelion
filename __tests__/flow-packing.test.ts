import { describe, it, expect } from 'vitest'
import { layout } from '@/components/series/FlowView'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'

/**
 * Founder 2026-08-16: "do not allow for awkward spaces like this."
 *
 * The artboard's one hard requirement is that it has no holes — a gap in the
 * middle of the board reads as a broken grid, and the first build had thirteen
 * of them. These are the column counts FlowView actually ships (2 on a phone,
 * 4, 6, then 8 on a wide desktop); nothing else is ever rendered.
 */
const SHIPPED_COLUMN_COUNTS = [2, 4, 6, 8]

const slugs = ALL_SERIES_ORDER.filter((s) => SERIES_DATA[s])

describe('the Flow artboard packs without holes', () => {
  it.each(SHIPPED_COLUMN_COUNTS)('has no gaps and no overlaps at %i columns', (cols) => {
    const tiles = layout(slugs, cols)
    expect(tiles).toHaveLength(slugs.length)

    const filled = new Set<string>()
    let overlaps = 0
    for (const t of tiles) {
      for (let x = t.cx; x < t.cx + t.w; x += 1) {
        for (let y = t.cy; y < t.cy + t.h; y += 1) {
          const key = `${x}:${y}`
          if (filled.has(key)) overlaps += 1
          filled.add(key)
        }
      }
    }
    expect(overlaps).toBe(0)

    const rows = Math.max(...tiles.map((t) => t.cy + t.h))
    const holes: string[] = []
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!filled.has(`${x}:${y}`)) holes.push(`${x}:${y}`)
      }
    }
    expect(holes).toEqual([])

    // Nothing may sit outside the board.
    tiles.forEach((t) => {
      expect(t.cx).toBeGreaterThanOrEqual(0)
      expect(t.cx + t.w).toBeLessThanOrEqual(cols)
    })
  })

  it('is deterministic — the same input always packs identically', () => {
    const a = layout(slugs, 6)
    const b = layout(slugs, 6)
    expect(a).toEqual(b)
  })

  it('gives the longest reading the largest tile', () => {
    const tiles = layout(slugs, 8)
    const bible = tiles.find((t) => t.slug === 'bible-365')
    expect(bible).toBeDefined()
    expect(bible!.w * bible!.h).toBeGreaterThanOrEqual(4)
  })
})
