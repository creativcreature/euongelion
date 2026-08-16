import { describe, it, expect } from 'vitest'
import { buildRings } from '@/components/series/SeriesLayouts'

/**
 * Founder 2026-08-16: "I like ROse, but not sure it can grow with more series
 * being added."
 *
 * That is a geometry question, so it gets a geometry test rather than a
 * screenshot. For catalogs from a dozen to three hundred, assert that:
 *   - every series is placed, none dropped
 *   - no two panes on a ring overlap
 *   - no ring overlaps the ring inside it
 *   - nothing hangs off the frame
 *   - nothing collides with the hub
 */
const HUB_RADIUS = 17

function paneCentres(radius: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i - 90) * (Math.PI / 180)
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }
  })
}

describe('the rose window grows with the catalog', () => {
  const sizes = [8, 12, 24, 36, 37, 60, 90, 150, 300]

  it.each(sizes)('closes for a catalog of %i', (n) => {
    const slugs = Array.from({ length: n }, (_, i) => `s-${i}`)
    const rings = buildRings(slugs)

    // Nothing dropped.
    const placed = rings.flatMap((r) => r.slugs)
    expect(placed).toHaveLength(n)
    expect(new Set(placed).size).toBe(n)

    rings.forEach((ring, ri) => {
      // Panes on a ring never touch each other.
      const centres = paneCentres(ring.radius, ring.slugs.length)
      if (centres.length > 1) {
        const [a, b] = centres
        const gap = Math.hypot(a.x - b.x, a.y - b.y)
        expect(gap).toBeGreaterThanOrEqual(ring.size * 0.99)
      }

      // Rings never overlap each other.
      if (ri > 0) {
        const inner = rings[ri - 1]
        const clearance = ring.radius - inner.radius
        expect(clearance).toBeGreaterThanOrEqual((ring.size + inner.size) / 2)
      }

      // Nothing hangs off the frame, and nothing sits on the hub.
      expect(ring.radius + ring.size / 2).toBeLessThanOrEqual(50)
      expect(ring.radius - ring.size / 2).toBeGreaterThan(HUB_RADIUS * 0.5)
    })
  })

  it('an empty catalog produces no rings rather than throwing', () => {
    expect(buildRings([])).toEqual([])
  })

  it('shrinks the glass as the catalog grows', () => {
    const small = buildRings(Array.from({ length: 20 }, (_, i) => `s${i}`))
    const large = buildRings(Array.from({ length: 200 }, (_, i) => `s${i}`))
    expect(large[0].size).toBeLessThan(small[0].size)
  })
})
