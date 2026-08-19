/**
 * HTTP Range parsing for narration audio.
 *
 * Its own module because a Next route file may only export route handlers and a
 * fixed set of config values — exporting a helper from one fails the build's
 * route type check — and because this is the part worth testing directly. The
 * suffix form is the subtle one and it is the one a media element uses when a
 * listener drags to the end of a reading.
 */
export interface ByteRange {
  offset: number
  /** Number of bytes to read, inclusive of both ends. */
  length: number
  /** Last byte index, for `Content-Range`. */
  end: number
}

/**
 * `bytes=START-END`, either end optional. Null when absent or unsatisfiable,
 * which the caller answers with a normal 200.
 */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null {
  if (!header || size <= 0) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  let offset: number
  let end: number
  if (rawStart === '') {
    // `bytes=-500` means the LAST 500 bytes, not the first 500. Reading this
    // backwards serves the opening of a track when a player asked for its end,
    // which is how a seek to the finish silently replays the beginning.
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    offset = Math.max(0, size - suffix)
    end = size - 1
  } else {
    offset = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
  }
  if (!Number.isFinite(offset) || !Number.isFinite(end)) return null
  if (offset < 0 || offset >= size || end < offset) return null
  end = Math.min(end, size - 1)
  return { offset, length: end - offset + 1, end }
}
