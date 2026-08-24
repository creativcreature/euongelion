/**
 * Renders public/seeking-help-georgia.pdf from src/data/georgia-help.ts.
 *
 * Same source of truth as the web page, so the printed sheet can never drift
 * from the URL printed on it. Follows the Playwright → page.pdf() pattern
 * already used by wakeup-mag/print/handouts/scripts/render-pocket-handout.mjs.
 *
 * Design brief for the print piece is NOT the web page's brief. This one gets
 * photocopied on a parish copier, folded into a coat pocket, and read under a
 * streetlight. So: pure black on white, no tint blocks that turn to mud on a
 * third-generation copy, numbers set large enough to read badly, and the
 * emergency block repeated in the running footer of every page so a torn-off
 * sheet still carries 988.
 *
 *   npm run build:georgia-help-pdf
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { CATEGORIES, EMERGENCY, LAST_VERIFIED } from '../src/data/georgia-help'
import type { Resource } from '../src/data/georgia-help'

const repoRoot = path.resolve(import.meta.dirname, '..')
const outputPdf = path.join(repoRoot, 'public', 'seeking-help-georgia.pdf')
const outputHtml = path.join(
  repoRoot,
  '.cache',
  'seeking-help-georgia-print.html',
)

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Contact block for one resource — the part someone actually acts on. */
function contactHtml(resource: Resource): string {
  const bits: string[] = []
  if (resource.phone)
    bits.push(`<span class="tel">${esc(resource.phone)}</span>`)
  if (resource.altPhone) {
    bits.push(
      `<span class="tel-alt">${esc(resource.altPhone.label)}: ${esc(
        resource.altPhone.phone,
      )}</span>`,
    )
  }
  if (resource.text) bits.push(`<span class="txt">${esc(resource.text)}</span>`)
  if (resource.urlLabel ?? resource.url) {
    bits.push(
      `<span class="url">${esc(resource.urlLabel ?? resource.url ?? '')}</span>`,
    )
  }
  return bits.length
    ? `<p class="contact">${bits.join('<span class="sep"> · </span>')}</p>`
    : ''
}

function resourceHtml(resource: Resource): string {
  const meta = [resource.hours, resource.coverage].filter(Boolean).join(' · ')
  return `
    <div class="res">
      <p class="res-name">${esc(resource.name)}</p>
      <p class="res-what">${esc(resource.what)}</p>
      ${contactHtml(resource)}
      ${meta ? `<p class="res-meta">${esc(meta)}</p>` : ''}
      ${resource.barrier ? `<p class="res-note">Good to know: ${esc(resource.barrier)}</p>` : ''}
      ${resource.caution ? `<p class="res-note res-note--flag">Before you go: ${esc(resource.caution)}</p>` : ''}
    </div>`
}

function buildHtml(): string {
  const emergency = EMERGENCY.map(
    (r) =>
      `<div class="eb"><span class="eb-num">${esc(
        r.phone ?? r.text?.replace(/\D/g, '') ?? '',
      )}</span><span class="eb-label">${esc(r.text ?? r.what)}</span></div>`,
  ).join('')

  const sections = CATEGORIES.map(
    (category) => `
      <section class="cat">
        <h2>${esc(category.title)}</h2>
        <p class="cat-intro">${esc(category.intro)}</p>
        ${category.resources.map(resourceHtml).join('')}
      </section>`,
  ).join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>If you need help in Georgia</title>
<style>
  @page { size: Letter; margin: 0.5in 0.45in 0.62in; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #000; background: #fff;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 8.4pt; line-height: 1.34;
  }
  .sans { font-family: Helvetica, Arial, sans-serif; }

  header.mast { border-bottom: 2.5pt solid #000; padding-bottom: 7pt; margin-bottom: 9pt; }
  .mast-kicker {
    font-family: Helvetica, Arial, sans-serif; font-size: 6.6pt; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 4pt;
  }
  h1 { font-size: 21pt; line-height: 1.04; margin: 0 0 5pt; font-weight: normal; }
  .mast-sub { margin: 0; font-size: 8.6pt; line-height: 1.4; max-width: 78%; }

  /* Emergency block — heaviest thing on the page, by design. */
  .emergency { border: 2.5pt solid #000; padding: 6pt 7pt 5pt; margin: 0 0 10pt; }
  .emergency-kicker {
    font-family: Helvetica, Arial, sans-serif; font-size: 6.6pt; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; margin: 0 0 4pt;
  }
  .emergency-row { display: flex; gap: 12pt; }
  .eb { flex: 1; border-left: 1pt solid #000; padding-left: 6pt; }
  .eb:first-child { border-left: 0; padding-left: 0; }
  .eb-num {
    display: block; font-family: Helvetica, Arial, sans-serif;
    font-size: 15pt; font-weight: 700; line-height: 1;
  }
  .eb-label { display: block; font-size: 7.2pt; line-height: 1.28; margin-top: 2pt; }

  .cols { column-count: 2; column-gap: 16pt; column-fill: auto; }
  .cat { break-inside: avoid-column; margin: 0 0 9pt; }
  .cat h2 {
    font-family: Helvetica, Arial, sans-serif; font-size: 8.4pt; font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase;
    border-bottom: 1pt solid #000; padding-bottom: 2.4pt; margin: 0 0 4pt;
  }
  .cat-intro { margin: 0 0 5pt; font-size: 7.6pt; line-height: 1.36; font-style: italic; }

  .res { break-inside: avoid; margin: 0 0 6.5pt; }
  .res-name { margin: 0; font-weight: bold; font-size: 8.4pt; line-height: 1.25; }
  .res-what { margin: 1pt 0 2pt; font-size: 7.6pt; line-height: 1.32; }
  .contact { margin: 0 0 1.5pt; font-family: Helvetica, Arial, sans-serif; font-size: 7.4pt; }
  .tel { font-size: 10.5pt; font-weight: 700; letter-spacing: 0.005em; }
  .tel-alt, .txt { font-size: 7.2pt; }
  .url { font-size: 7.2pt; }
  .sep { opacity: 0.55; }
  .res-meta { margin: 0; font-size: 6.9pt; line-height: 1.3; font-style: italic; }
  .res-note {
    margin: 1.6pt 0 0; font-size: 6.9pt; line-height: 1.3;
    padding-left: 4.5pt; border-left: 1pt solid #000;
  }
  .res-note--flag { border-left: 2.5pt solid #000; font-weight: 500; }

  footer.colophon {
    border-top: 1.5pt solid #000; margin-top: 8pt; padding-top: 5pt;
    font-size: 7pt; line-height: 1.38; column-span: all;
  }
  footer.colophon strong { font-weight: bold; }
</style></head>
<body>
  <header class="mast">
    <p class="mast-kicker">Euangelion · euangelion.app/seeking-help-georgia</p>
    <h1>If you need help in Georgia</h1>
    <p class="mast-sub">People who will pick up the phone. Food, a bed, the power bill, a doctor,
    a lawyer, someone to talk to at three in the morning. Most of it is free. None of it
    requires you to believe anything.</p>
  </header>

  <div class="emergency">
    <p class="emergency-kicker">If you are in danger right now</p>
    <div class="emergency-row">${emergency}</div>
  </div>

  <div class="cols">
    ${sections}
    <footer class="colophon">
      <strong>About this list.</strong> Every number was checked against the provider's own site or
      the responsible state agency on ${esc(LAST_VERIFIED)}. Things change — funds run out, hours
      move, programs close. <strong>If a number here does not work, dial 211</strong> and a real
      person will look up what is open today. Where we know about a catch — a waiting list, an
      income limit, a program that requires you to attend something — we said so. Euangelion does
      not run any of these programs. This sheet is information, not medical, legal, or financial
      advice. Copy it, fold it, hand it to someone. The current version always lives at
      euangelion.app/seeking-help-georgia
    </footer>
  </div>
</body></html>`
}

async function main() {
  const html = buildHtml()
  await fs.mkdir(path.dirname(outputHtml), { recursive: true })
  await fs.writeFile(outputHtml, html, 'utf8')

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.pdf({
      path: outputPdf,
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      // 988 rides along on every page, so a torn-off sheet still carries it.
      footerTemplate: `
        <div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7pt;
                    padding:0 0.45in;display:flex;justify-content:space-between;color:#000;">
          <span>Crisis, any hour: call or text <b>988</b> · Text HOME to <b>741741</b> · Anything else: <b>211</b></span>
          <span>euangelion.app/seeking-help-georgia · <span class="pageNumber"></span>/<span class="totalPages"></span></span>
        </div>`,
      margin: {
        top: '0.5in',
        bottom: '0.62in',
        left: '0.45in',
        right: '0.45in',
      },
    })
  } finally {
    await browser.close()
  }

  const { size } = await fs.stat(outputPdf)
  console.log(
    `✓ ${path.relative(repoRoot, outputPdf)} — ${(size / 1024).toFixed(0)}KB, ` +
      `${CATEGORIES.reduce((n, c) => n + c.resources.length, 0) + EMERGENCY.length} entries`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
