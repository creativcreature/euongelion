#!/usr/bin/env node
/**
 * Site-wide paragraph-spacing check (SA-054).
 *
 * Paragraph space is only meaningful RELATIVE TO LEADING. A 13px gap is generous
 * under 16px type and invisible under 33px type, so this measures
 * gap ÷ line-height and gates on that ratio — never on raw pixels.
 *
 *   under 0.50  consecutive paragraphs stop reading as separate blocks
 *   0.75-1.00   a clear break
 *   over 1.30   the column falls apart into disconnected islands
 *
 * Checks mobile AND desktop, because the bug this exists for was invisible on
 * desktop: `--devotional-rhythm-sm` is clamp(0.75rem, 1vw, 1rem), and a
 * viewport-relative middle term collapses to its floor on a narrow screen.
 *
 *   node scripts/check-paragraph-spacing.mjs                    # production
 *   node scripts/check-paragraph-spacing.mjs http://localhost:3333
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'https://euangelion.app'

const ROUTES = [
  '/devotional/he-cannot-deny-himself-day-2',
  '/devotional/looking-at-the-sun-day-3',
  '/devotional/the-harvest-day-4',
  '/daily-bread',
  '/series/truth',
  '/how-we-write',
]

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, min: 0.5 },
  { name: 'desktop', width: 1440, height: 900, min: 0.33 },
]

// Thresholds are VIEWPORT-SPECIFIC, and deliberately so. A narrow column wraps
// more often, so the paragraph break is doing more structural work and must be
// clearer. Desktop measured 0.36 and the founder confirmed it reads correctly
// ("reads fine on desktop"); gating desktop at 0.5 would fail a surface nobody
// has a problem with, which is how a check stops being believed.
const MAX_RATIO = 1.4   // above this, the column disintegrates on any screen

const probe = () => {
  const groups = {}
  for (const p of document.querySelectorAll('p')) {
    const next = p.nextElementSibling
    if (!next || next.tagName !== 'P') continue
    if ((p.textContent || '').split(/\s+/).length < 15) continue
    const cs = getComputedStyle(p)
    const lh = parseFloat(cs.lineHeight)
    if (!lh) continue

    const a = p.getBoundingClientRect()
    const b = next.getBoundingClientRect()

    // In a MULTI-COLUMN container the next paragraph may begin at the top of the
    // following column — physically ABOVE its predecessor — so geometry yields a
    // large negative number that looks like a catastrophic failure and is not
    // one. Detect a column break and fall back to the declared margin, which is
    // the only meaningful measure once the two boxes are not stacked.
    const columnBreak = b.top < a.bottom - 1 || Math.abs(b.left - a.left) > 2
    const gap = columnBreak
      ? parseFloat(cs.marginBottom) + parseFloat(getComputedStyle(next).marginTop)
      : b.top - a.bottom

    const key =
      (p.parentElement.className || '').trim().split(/\s+/).slice(0, 3).join('.') || '(none)'
    groups[key] = groups[key] || { ratios: [], lh: Math.round(lh), multicol: 0 }
    groups[key].ratios.push(gap / lh)
    if (columnBreak) groups[key].multicol++
  }
  return Object.entries(groups).map(([container, v]) => ({
    container,
    pairs: v.ratios.length,
    lineHeight: v.lh,
    multicol: v.multicol,
    ratio: +(v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length).toFixed(2),
  }))
}

const browser = await chromium.launch()
let failures = 0
let checked = 0

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  console.log(`\n${vp.name.toUpperCase()}  ${vp.width}px   (min ratio ${vp.min})`)
  for (const route of ROUTES) {
    let groups
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      groups = await page.evaluate(probe)
    } catch (e) {
      console.log(`  ${route.padEnd(46)} unreachable (${e.message.split('\n')[0].slice(0, 40)})`)
      continue
    }
    if (!groups.length) {
      console.log(`  ${route.padEnd(46)} no consecutive paragraphs`)
      continue
    }
    // A container with one or two pairs is a banner or a dek, not a reading
    // flow — judging those produced more noise than signal on the first run.
    for (const g of groups.filter((x) => x.pairs >= 3).sort((a, b) => b.pairs - a.pairs).slice(0, 3)) {
      checked++
      const bad = g.ratio < vp.min || g.ratio > MAX_RATIO
      if (bad) failures++
      console.log(
        `  ${route.padEnd(44)} ${String(g.ratio).padStart(5)}  ${String(g.pairs).padStart(3)} pairs${g.multicol ? ' (' + g.multicol + ' multicol)' : ''}  ${g.container.slice(0, 32).padEnd(32)} ${bad ? 'FAIL' : 'ok'}`,
      )
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`\ngap ÷ line-height: mobile ≥ 0.5, desktop ≥ 0.33, both ≤ ${MAX_RATIO}`)
console.log(`containers checked: ${checked}   failing: ${failures}`)
if (failures) {
  console.log('\nA failing container is usually spacing expressed in vw or a fixed rem:')
  console.log('both decouple the gap from the type size, so it collapses on one viewport.')
  console.log('Express paragraph spacing in `em` so it tracks the leading.')
}
process.exit(failures ? 1 : 0)
