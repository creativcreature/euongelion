/**
 * The docked mini player fills the phone, and does not float over the reading.
 *
 * Founder, from the installed PWA with a screenshot: "the normal player needs
 * help. Doesnt fit screen properly." The handle was right-aligned at a 22rem
 * max-width, so on a 393px phone it left a ~64px dead gutter down the left and
 * printed on top of whatever paragraph was behind it.
 *
 * Nothing caught it, and the reason is worth keeping: the handle was INSIDE the
 * viewport the whole time. The repo's overflow contract asserts that nothing
 * breaks its container, and this never did. Fitting and belonging are not the
 * same test — a control can be fully on screen and still be in the wrong place.
 *
 * This is a source scan for the same reason `audio-drawer-styles.test.ts` is:
 * jsdom applies no media queries and computes no layout, so a rule that only
 * matters at 900px cannot be observed through the accessibility tree.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), 'src/components/audio/AudioDrawer.tsx'),
  'utf8',
)

/** The body of the phone-width block that docks the handle. */
function phoneBlock(): string {
  // The LAST @media (max-width: 900px) block in the stylesheet is the handle's;
  // the earlier matches are `sizes` attributes on <Image>, which are markup.
  const marker = '@media (max-width: 900px) {'
  const start = SOURCE.lastIndexOf(marker)
  expect(start).toBeGreaterThan(-1)
  let depth = 0
  for (let i = start + marker.length - 1; i < SOURCE.length; i += 1) {
    if (SOURCE[i] === '{') depth += 1
    else if (SOURCE[i] === '}') {
      depth -= 1
      if (depth === 0) return SOURCE.slice(start, i + 1)
    }
  }
  throw new Error('unterminated phone-width block')
}

describe('the handle docks on a phone', () => {
  const block = phoneBlock()

  it('drops the 22rem cap so the bar spans the screen', () => {
    expect(block).toMatch(/\.lsn-handle\s*\{[^}]*max-width:\s*none/)
    expect(block).toMatch(/\.lsn-handle\s*\{[^}]*width:\s*100%/)
  })

  it('sits flush to both edges — no wrapper padding, no side borders', () => {
    expect(block).toMatch(/\.lsn-handle-wrap\s*\{[^}]*padding:\s*0\s*;/)
    expect(block).toMatch(/\.lsn-handle\s*\{[^}]*border-inline:\s*0/)
  })

  it('moves the gold edge to the top, where a docked surface carries it', () => {
    expect(block).toMatch(
      /\.lsn-handle\s*\{[^}]*border-top:\s*3px solid var\(--color-gold\)/,
    )
  })

  it('lets the title take the slack rather than the controls drifting inward', () => {
    expect(block).toMatch(/\.lsn-handle-open\s*\{[^}]*flex:\s*1/)
  })
})

describe('the desktop pill is left alone', () => {
  // There IS room for a compact right-aligned handle on a wide screen, and the
  // founder's complaint was explicitly about the phone. Widening it everywhere
  // would have been a second change smuggled in under a bug fix.
  it('keeps the 22rem cap outside the phone block', () => {
    const base = SOURCE.slice(0, SOURCE.lastIndexOf('@media (max-width: 900px)'))
    expect(base).toMatch(/\.lsn-handle\s*\{[^}]*max-width:\s*min\(22rem/)
  })

  it('keeps the wrapper right-aligned outside the phone block', () => {
    const base = SOURCE.slice(0, SOURCE.lastIndexOf('@media (max-width: 900px)'))
    expect(base).toMatch(/\.lsn-handle-wrap\s*\{[^}]*justify-content:\s*flex-end/)
  })
})
