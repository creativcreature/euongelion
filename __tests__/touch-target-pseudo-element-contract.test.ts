import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * SA-077 (F-121) — the touch hit pad may not share a pseudo-element with the
 * editorial ink underline.
 *
 * The bug this locks out: `EditorialMotionSystem` decorates every
 * `.mock-paper button` at runtime with `ink-line-interactive`, whose `::after`
 * is a 1px gold hover underline held invisible by `transform: scaleX(0)`. The
 * 2026-08-16 touch-target sweep then re-used that SAME `::after` on the
 * /series switcher to mint a 44px hit pad, overriding both `height: 1px` and
 * the collapsing `scaleX(0)`. The underline stopped being a hairline and
 * un-collapsed into a painted 44px slab that bled over the neighbouring rows —
 * the blue boxes in the founder's 2026-08-17 screenshot.
 *
 * The hit pad therefore lives on `::before`, which no other rule claims.
 */
describe('Touch hit pads do not collide with the ink underline', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'globals.css'),
    'utf8',
  )
  const motionSource = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'EditorialMotionSystem.tsx'),
    'utf8',
  )

  /** The `@media (pointer: coarse)` block that mints the 44px hit pads. */
  const coarseBlock = (() => {
    const start = css.indexOf('@media (pointer: coarse)')
    expect(
      start,
      'the coarse-pointer touch-target block must exist',
    ).toBeGreaterThan(-1)
    // Walk braces to find the matching close, so the assertions below can never
    // accidentally read a neighbouring block.
    let depth = 0
    for (let i = css.indexOf('{', start); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') {
        depth -= 1
        if (depth === 0) return css.slice(start, i + 1)
      }
    }
    throw new Error('unbalanced braces in the coarse-pointer block')
  })()

  const CONTROLS = ['.rr-view', '.rr-sort', '.mock-icon-control'] as const

  it('still guarantees a 44px hit area on the dense switcher controls', () => {
    expect(coarseBlock).toContain('max(100%, 44px)')
    for (const control of CONTROLS) {
      expect(
        coarseBlock,
        `${control} must still get an expanded hit area on touch`,
      ).toContain(`${control}::before`)
    }
  })

  it('mints the hit pad on ::before, never on the ink layer’s ::after', () => {
    for (const control of CONTROLS) {
      expect(
        coarseBlock,
        `${control}::after belongs to .ink-line-interactive — the pad must not claim it`,
      ).not.toContain(`${control}::after`)
    }
  })

  it('leaves the ink underline’s ::after geometry intact', () => {
    // The underline is a 1px hairline collapsed by scaleX(0). If either of
    // these is gone the slab bug is back in a new disguise.
    const inkRule = css.slice(css.indexOf('.ink-line-interactive::after'))
    expect(inkRule).toContain('height: 1px')
    expect(inkRule).toContain('transform: scaleX(0)')
  })

  it('documents that the ink layer really does claim ::after on these buttons', () => {
    // Guards the premise: if EditorialMotionSystem stops decorating buttons,
    // this contract can be revisited — but until then ::after is taken.
    expect(motionSource).toContain("classList.add('ink-line-interactive')")
    expect(motionSource).toContain('.mock-paper button')
  })
})
