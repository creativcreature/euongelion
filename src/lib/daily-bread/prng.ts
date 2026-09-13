/**
 * Seeded randomness for Daily Bread V2. Same seed in, same paper out — the
 * composition, comic and procedural scene of an edition are reproducible from
 * its seed forever. Never Math.random in the pipeline.
 */

/** FNV-1a 32-bit. */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, good enough for layout decisions. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  chance(p: number): boolean
}

export function createRng(seed: number | string): Rng {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed)
  const int = (maxExclusive: number) => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`rng.int: bad bound ${maxExclusive}`)
    }
    return Math.floor(next() * maxExclusive)
  }
  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick: empty list')
      return items[int(items.length)]
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice()
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
    chance: (p: number) => next() < p,
  }
}

/** The canonical seed string for an editorial date. */
export function editionSeed(dateSlug: string): string {
  return `daily-bread:v2:${dateSlug}`
}
