import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The intro animation, rebuilt in two modes (SA-124, F-169... see decision id
 * in docs; ids finalized at commit time).
 *
 * Founder 2026-08-24: "The homepage animation is not working at all the way it
 * should... I need 2 versions - one for Darkmode, one for Light Mode. The Color
 * of the euangelion needs to match the mode color. If Light Mode, Euangelion
 * should be Blue, if Dark Mode it should be white. I also want the subtle text
 * rollover." Reference: https://telhaclarke.com.au/
 *
 * The old sequence was one mode wearing two coats: a cobalt sheet with a cream
 * knockout in BOTH themes, only resolving to the mode's colour at the very last
 * frame of the hand-off. So in light mode the word was cream for the whole
 * intro and turned blue as it landed — which is precisely "not working the way
 * it should".
 */
const css = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'globals.css'),
  'utf8',
)

function pressBlock(): string {
  const start = css.indexOf('.press {')
  expect(start).toBeGreaterThan(-1)
  // Everything from the press root through its keyframes.
  const end = css.indexOf('.mock-masthead-block {', start)
  return css.slice(start, end === -1 ? start + 12000 : end)
}

describe('intro animation: two modes', () => {
  const block = pressBlock()

  it('paints the mode ground, not a cobalt sheet in both themes', () => {
    // Light: the sheet is paper. Dark: the sheet is the dark ground.
    expect(block).toMatch(/--press-ink:\s*#f[0-9a-f]{5}/i)
    const darkIdx = block.indexOf("data-theme='dark'")
    expect(darkIdx).toBeGreaterThan(-1)
    const darkBlock = block.slice(darkIdx, darkIdx + 600)
    expect(darkBlock).toMatch(/--press-ink:\s*#171b69/i)
  })

  it('the wordmark is BLUE in light mode from the first frame', () => {
    // --press-word is the colour the word is drawn in, not merely what it
    // becomes on landing.
    expect(block).toMatch(/--press-word:\s*#1f2a8d/i)
  })

  it('the wordmark is WHITE/cream in dark mode from the first frame', () => {
    const darkIdx = block.indexOf("data-theme='dark'")
    const darkBlock = block.slice(darkIdx, darkIdx + 600)
    expect(darkBlock).toMatch(/--press-word:\s*#efe5d8/i)
  })

  it('the word is drawn in the mode colour, never knocked out of cobalt', () => {
    // The colour lives on `.press-word`, which both plates carry.
    const wordIdx = block.indexOf('.press-word {')
    expect(wordIdx).toBeGreaterThan(-1)
    const wordBlock = block.slice(wordIdx, block.indexOf('}', wordIdx))
    expect(wordBlock).toMatch(/color:\s*var\(--press-word\)/)
    // The old contract is gone: no cream knockout, no colour change on landing.
    expect(block).not.toContain('--press-paper')
    expect(block).not.toContain('--press-land')
  })

  it('reveals the wordmark by mask, the way the reference does', () => {
    // A clip/mask reveal per line — not a fade, not a slide-in panel.
    expect(block).toMatch(/clip-path/)
  })

  it('the letter mask is ONE face tall and the roll travels one face', () => {
    // Verified visually 2026-08-24: without the explicit height the wrapper
    // sizes to BOTH copies, the window shows the letter doubled, and the
    // column rolls straight past it — the word disappears mid-intro. The
    // travel is a percentage of the two-face column, so one face is 50%.
    const letterIdx = block.indexOf('.press-letter {')
    const letterBlock = block.slice(letterIdx, block.indexOf('}', letterIdx))
    // ONE LINE BOX, NOT ONE EM. `1em` is the font SIZE; this masthead runs
    // line-height 0.9, so at the fitted 226.6px size an em-tall mask stands
    // 22.7px proud of the real line box. Measured 2026-08-27: the type-parity
    // gate reported `dw: 0, dh: 23` — width exact, height wrong — and dropped
    // the whole sequence to its sheet-only exit. This only bit once the
    // wordmark printed IN PLACE; the earlier version scaled to fit and hid it.
    // `1lh` tracks whatever line-height was cloned from the masthead.
    expect(letterBlock).toMatch(/height:\s*1lh/)
    expect(letterBlock).toMatch(/overflow:\s*hidden/)

    const rollIdx = block.indexOf('.press-letter-roll {')
    const letterBlock2 = block.slice(rollIdx, block.indexOf('}', rollIdx))

    // THE TRAVEL NOW LIVES IN THE COMPONENT, NOT A @keyframes.
    // F-108 r4 drives every beat with script-created Web Animations, because a
    // CSS animation on a `.press-*` element sorts BELOW them in the cascade —
    // that is the exact bug that left the hand-off dead for two releases
    // (proven by DOM probe 2026-08-26). The requirement is unchanged and still
    // asserted: the column is two faces tall and travels exactly one face,
    // +50% (mask empty, letter yet to arrive) to -50% (duplicate fills it).
    const tsx = fs.readFileSync(
      path.resolve(__dirname, '../src/components/motion/MastheadIntro.tsx'),
      'utf8',
    )
    expect(tsx).toMatch(/translate3d\(0,\s*50%,\s*0\)/)
    expect(tsx).toMatch(/translate3d\(0,\s*-50%,\s*0\)/)
    // And the resting state must be the empty mask, or the letters are simply
    // present rather than arriving.
    expect(letterBlock2).toMatch(/translate3d\(0,\s*50%,\s*0\)/)
    // One FACE, never a whole column: 100% would roll the duplicate straight
    // past the window and empty the mask.
    expect(tsx).not.toMatch(/translate3d\(0,\s*-?100%,\s*0\)/)
  })
})

describe('subtle text rollover', () => {
  it('nav links wipe an underline on hover rather than snapping one on', () => {
    const i = css.indexOf('.mock-nav-item:is(:hover, :focus-visible)')
    expect(i).toBeGreaterThan(-1)
    const around = css.slice(i - 1600, i + 400)
    expect(around).toMatch(/\.mock-nav-item::before/)
    expect(around).toMatch(/transform:\s*scaleX/)
    expect(around).toMatch(/transition:[^;]*transform/)
  })

  it('uses ::before — EditorialMotionSystem owns ::after on these links', () => {
    const i = css.indexOf('.mock-nav-item::before')
    expect(i).toBeGreaterThan(-1)
    expect(css).not.toContain('.mock-nav-item::after')
  })

  it('respects reduced motion', () => {
    const i = css.indexOf('.mock-nav-item::before')
    const tail = css.slice(i, i + 2000)
    expect(tail).toMatch(/prefers-reduced-motion/)
  })
})
