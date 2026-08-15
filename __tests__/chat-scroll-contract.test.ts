import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * F-092: the chat message list grew instead of scrolling, pushing the reply
 * AND the composer below the viewport. Founder: "I cannot access the content
 * the chat wrote out as its below my visibility."
 *
 * Cause: a `flex-1` child inherits `min-height: auto`, which refuses to shrink
 * below its content, so `overflow-y: auto` never engages. Measured before the
 * fix, with 3000px of content injected: clientHeight 3145, scrollHeight 3145,
 * scrolls false, composer off-screen. After: clientHeight 541, scrollHeight
 * 3145, scrolls true, composer visible.
 *
 * The whole chain needs `min-h-0` — the grid, the conversation column and the
 * scroller. Fixing only the scroller is not enough, which is why this asserts
 * all three rather than one.
 */
const src = fs.readFileSync(
  path.join(process.cwd(), 'src/components/DevotionalChat.tsx'),
  'utf8',
)

describe('chat scroll contract', () => {
  it('the message list is the scroller and can shrink', () => {
    expect(src).toContain('min-h-0 flex-1 overflow-y-auto')
  })

  it('the conversation column can shrink below its content', () => {
    expect(src).toContain('flex h-full min-h-0 flex-col')
  })

  it('the panel grid can shrink below its content', () => {
    expect(src).toContain('grid h-full min-h-0')
  })

  it('no flex-1 scroller is left without min-h-0', () => {
    // Catches a future `flex-1 overflow-y-auto` added without the guard.
    const offenders = [...src.matchAll(/className="([^"]*flex-1[^"]*)"/g)]
      .map((m) => m[1])
      .filter((cls) => cls.includes('overflow-y-auto'))
      .filter((cls) => !cls.includes('min-h-0'))
    expect(offenders).toEqual([])
  })
})
