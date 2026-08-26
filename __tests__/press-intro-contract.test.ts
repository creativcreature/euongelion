import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * THE PRESS INTRO CASCADE CONTRACT (F-108 r2).
 *
 * r1 shipped for two releases with its signature beat silently dead. The cause
 * was a cascade rule, not a typo: `.press-word` carried
 * `animation: press-set 900ms … both`, and a RUNNING fill:both CSS animation
 * outranks that element's own style attribute. The component computed the
 * hand-off flight correctly on every load and the browser discarded it.
 * Proven by live DOM probe 2026-08-26: the inline attribute read
 * "translate3d(-300px,-350px,0) scale(1.8)" while the computed transform
 * stayed "matrix(1.05846,0,0,1,0,0)"; cancelling the animation made the
 * computed value become "matrix(1.8,0,0,1.8,-300,-350)" instantly.
 *
 * Nothing in type-check, lint or the existing suite could see that. These
 * assertions can. r2 moves every beat to script-created Web Animations, which
 * sort ABOVE CSS animations in the cascade, and this file is what keeps it
 * there.
 */

const root = path.resolve(__dirname, '..')
const css = readFileSync(path.join(root, 'src/app/globals.css'), 'utf8')
const tsx = readFileSync(
  path.join(root, 'src/components/motion/MastheadIntro.tsx'),
  'utf8',
)

/** The press block, sliced out of globals.css by its own banner. */
function pressBlock(): string {
  const start = css.indexOf('/* ═══ THE PRESS IMPRESSION')
  expect(start, 'press block banner not found in globals.css').toBeGreaterThan(
    -1,
  )
  const end = css.indexOf('/* ── /today takes the paper', start)
  expect(end, 'press block end marker not found').toBeGreaterThan(start)
  return css.slice(start, end)
}

/** Rules in the block, as [selector, body] pairs, ignoring @media wrappers. */
function rules(block: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  // Strip comments first so commentary can discuss `animation:` freely.
  const bare = block.replace(/\/\*[\s\S]*?\*\//g, '')
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bare))) {
    const sel = m[1].trim()
    if (sel.startsWith('@')) continue
    out.push([sel, m[2]])
  }
  return out
}

describe('press intro — cascade contract', () => {
  it('a) declares no CSS animation on any element the script animates', () => {
    const offenders = rules(pressBlock())
      .filter(
        ([sel, body]) => /\.press/.test(sel) && /\banimation\s*:/.test(body),
      )
      // The arming sheet's zero-JS failsafe is the ONE allowed animation: it
      // runs on html[data-press='armed']::before, which the script never
      // touches, and it is what removes the sheet if hydration never happens.
      .filter(([sel]) => !sel.includes("[data-press='armed']"))
      .map(([sel]) => sel)
    expect(offenders, 'CSS animation on a script-animated element').toEqual([])
  })

  it('b) declares no transition on any .press element', () => {
    const offenders = rules(pressBlock())
      .filter(
        ([sel, body]) => /\.press/.test(sel) && /\btransition\s*:/.test(body),
      )
      .map(([sel]) => sel)
    expect(offenders, 'CSS transition would race the script clock').toEqual([])
  })

  it('c) React never writes transform, opacity or clip-path inline', () => {
    // Those three are the script's to own. If React writes them, a future
    // stray CSS animation can outrank them again — which is exactly r1.
    const banned = [
      /\.style\.transform\s*=/,
      /\.style\.opacity\s*=/,
      /\.style\.clipPath\s*=/,
      /\bstyle=\{\{[^}]*\btransform\s*:/,
      /\bstyle=\{\{[^}]*\bopacity\s*:/,
    ]
    for (const re of banned) {
      expect(re.test(tsx), `MastheadIntro must not write ${re}`).toBe(false)
    }
  })

  it('d) every setProperty call writes a --press-* custom property', () => {
    const calls = [...tsx.matchAll(/setProperty\(\s*'([^']+)'/g)].map(
      (m) => m[1],
    )
    for (const key of calls) {
      expect(key.startsWith('--press-'), `unexpected setProperty ${key}`).toBe(
        true,
      )
    }
  })

  it('e) .press-word restates none of the masthead type contract', () => {
    // The contract is CLONED from getComputedStyle at measure time. Restating
    // it by hand is what made r1's landing ~4% too small: the intro ran
    // letter-spacing 0.02em / line-height 1 against the masthead's -0.006em /
    // line-height 0.9 / font-kerning: none.
    const block = pressBlock().replace(/\/\*[\s\S]*?\*\//g, '')
    const wordRule = rules(block).find(([sel]) => sel.trim() === '.press-word')
    expect(wordRule, '.press-word rule not found').toBeTruthy()
    const body = wordRule![1]
    for (const prop of [
      'font-family',
      'font-size',
      'font-weight',
      'letter-spacing',
      'line-height',
    ]) {
      expect(
        new RegExp(`\\b${prop}\\s*:`).test(body),
        `.press-word must not declare ${prop} — clone it, never retype it`,
      ).toBe(false)
    }
  })

  it('f) every class the CSS targets actually exists in the component', () => {
    // This is what would have caught the dead .masthead-intro /
    // .masthead-intro-word reduced-motion selectors, which survived a rename
    // and sat in the file doing nothing for two releases.
    const classes = new Set(
      [...pressBlock().matchAll(/\.(press[a-z0-9-]*)/g)].map((m) => m[1]),
    )
    const missing = [...classes].filter((c) => !tsx.includes(c))
    expect(
      missing,
      'press CSS targets classes the component never renders',
    ).toEqual([])
  })

  it('g) both reduced-motion signals are honoured', () => {
    const block = pressBlock()
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(block).toMatch(/html\.reduce-motion/)
    // The JS must check the in-app class too — the media query alone turned
    // that setting into a ~950ms opaque cobalt block in r1.
    expect(tsx).toMatch(/classList\.contains\('reduce-motion'\)/)
  })
})
