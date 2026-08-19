import { describe, expect, it } from 'vitest'
import { parseRange } from '@/lib/audio/range'

/**
 * SA-098 — seeking.
 *
 * Cloudflare's static-asset layer does not implement 206 Partial Content, so
 * before this every scrub in a 20-minute reading refetched the whole track
 * while `_headers` advertised range support anyway. Audio is served from R2
 * now, and this is the parser that decides which bytes come back.
 */
const SIZE = 1_506_799

describe('parseRange', () => {
  it('reads a normal closed range', () => {
    expect(parseRange('bytes=1000000-1000999', SIZE)).toEqual({
      offset: 1_000_000,
      length: 1000,
      end: 1_000_999,
    })
  })

  it('treats an open end as "to the end of the file"', () => {
    expect(parseRange('bytes=1500000-', SIZE)).toEqual({
      offset: 1_500_000,
      length: SIZE - 1_500_000,
      end: SIZE - 1,
    })
  })

  it('reads a SUFFIX range as the last N bytes, not the first', () => {
    // The one that matters: a media element asks this way when a listener
    // drags to the end. Reading it forwards replays the opening instead.
    expect(parseRange('bytes=-500', SIZE)).toEqual({
      offset: SIZE - 500,
      length: 500,
      end: SIZE - 1,
    })
  })

  it('clamps a suffix longer than the file to the whole file', () => {
    expect(parseRange(`bytes=-${SIZE + 10_000}`, SIZE)).toEqual({
      offset: 0,
      length: SIZE,
      end: SIZE - 1,
    })
  })

  it('clamps an end past the last byte', () => {
    const range = parseRange(`bytes=0-${SIZE + 999}`, SIZE)
    expect(range?.end).toBe(SIZE - 1)
    expect(range?.length).toBe(SIZE)
  })

  it('declines anything unsatisfiable, so the caller answers 200', () => {
    expect(parseRange(null, SIZE)).toBeNull()
    expect(parseRange('bytes=-', SIZE)).toBeNull()
    expect(parseRange('bytes=abc-def', SIZE)).toBeNull()
    expect(parseRange('items=0-10', SIZE)).toBeNull()
    // Start at or past the end of the file.
    expect(parseRange(`bytes=${SIZE}-`, SIZE)).toBeNull()
    // Backwards.
    expect(parseRange('bytes=900-100', SIZE)).toBeNull()
    // Zero-length suffix.
    expect(parseRange('bytes=-0', SIZE)).toBeNull()
    // Empty object.
    expect(parseRange('bytes=0-10', 0)).toBeNull()
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseRange('  bytes=0-99  ', SIZE)?.length).toBe(100)
  })
})
