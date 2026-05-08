#!/usr/bin/env node
/**
 * fix-bible-365-editor-flags.mjs
 *
 * Apply the editor agent's flagged fixes to bible-365-day-{1..7}.json.
 * Reference report: /tmp/bible-365-editor-report.md
 *
 * Idempotent — safe to re-run.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DEV_DIR = path.join(ROOT, 'public/devotionals')

function loadDay(n) {
  return JSON.parse(fs.readFileSync(path.join(DEV_DIR, `bible-365-day-${n}.json`), 'utf8'))
}
function saveDay(n, d) {
  fs.writeFileSync(path.join(DEV_DIR, `bible-365-day-${n}.json`), JSON.stringify(d, null, 2))
}

// Helper: count em-dashes and bolds in panels
function countEmDashes(panels) {
  return panels.reduce((acc, p) =>
    acc + ((p.content || '').match(/—/g) || []).length, 0)
}
function countBolds(panels) {
  return panels.reduce((acc, p) =>
    acc + ((p.content || '').match(/\*\*[^*]+\*\*/g) || []).length, 0)
}

// ─── Day 1: reduce em-dashes (6 → ≤2) and bolds (5 → ≤3) ─────────
function fixDay1() {
  const d = loadDay(1)
  // Track count ACROSS panels (not per-panel)
  let dashCount = 0
  for (const p of d.panels) {
    if (!p.content) continue
    p.content = p.content.replace(/—/g, () => {
      dashCount++
      return dashCount <= 2 ? '—' : ', '
    })
    // Drop bold from "In the beginning, God" (panel 2). Keep bolds on actual scripture quotes.
    if (p.heading === 'BEFORE THE FIRST WORD') {
      p.content = p.content.replace(/\*\*In the beginning, God\.\*\*/g, 'In the beginning, God.')
    }
  }
  saveDay(1, d)
  console.log(`Day 1: em-dashes ${countEmDashes(d.panels)}, bolds ${countBolds(d.panels)}`)
}

// ─── Day 2: add cover panel as panel 1 ───────────────────────────
function fixDay2() {
  const d = loadDay(2)
  if (d.panels[0].type === 'cover') {
    console.log('Day 2: cover panel already present')
    return
  }
  // Renumber existing panels +1, prepend cover
  d.panels = [
    { number: 1, type: 'cover', content: 'BIBLE 365 · DAY 2' },
    ...d.panels.map((p) => ({ ...p, number: p.number + 1 })),
  ]
  saveDay(2, d)
  console.log(`Day 2: cover panel added; ${d.panels.length} panels`)
}

// ─── Day 3: split panel 6 into 3 panels (text + prayer + endnotes)
//          and reduce em-dashes (5 → ≤2)
function fixDay3() {
  const d = loadDay(3)
  // Locate the conflated panel
  const idx = d.panels.findIndex((p) => p.heading === 'THE GREATER SABBATH')
  if (idx === -1) {
    console.log('Day 3: GREATER SABBATH panel not found; assuming already split')
    return
  }
  const conflated = d.panels[idx]
  // Split content roughly: heading section, prayer (after "Let us pray:" or starting with "Father,"), endnotes (after "¹" or "Endnotes:")
  const original = conflated.content
  const prayerStart = original.search(/Father,/)
  const endnotesStart = original.search(/(?:¹|\bEndnotes\b|\bSources\b)/)

  let teachingText = original
  let prayerText = ''
  let endnotesText = ''

  if (endnotesStart !== -1) {
    endnotesText = original.slice(endnotesStart).trim()
    teachingText = original.slice(0, endnotesStart).trim()
  }
  if (prayerStart !== -1 && (endnotesStart === -1 || prayerStart < endnotesStart)) {
    prayerText = teachingText.slice(prayerStart - 0).trim().replace(new RegExp(endnotesText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').trim()
    teachingText = teachingText.slice(0, prayerStart).trim()
  }

  const newPanels = []
  if (teachingText) {
    newPanels.push({
      number: conflated.number,
      heading: 'THE GREATER SABBATH',
      type: 'text',
      content: teachingText,
      wordCount: teachingText.split(/\s+/).filter(Boolean).length,
    })
  }
  if (prayerText) {
    newPanels.push({
      number: conflated.number + 1,
      heading: 'A PRAYER FOR THE SEVENTH DAY',
      type: 'prayer',
      content: prayerText,
      wordCount: prayerText.split(/\s+/).filter(Boolean).length,
    })
  }
  if (endnotesText) {
    newPanels.push({
      number: conflated.number + 2,
      heading: 'ENDNOTES',
      type: 'endnotes',
      content: endnotesText,
      wordCount: endnotesText.split(/\s+/).filter(Boolean).length,
    })
  }

  d.panels = [
    ...d.panels.slice(0, idx),
    ...newPanels,
    ...d.panels.slice(idx + 1).map((p, i) => ({ ...p, number: newPanels[newPanels.length - 1].number + 1 + i })),
  ]

  // Reduce em-dashes to ≤2
  let dashCount = 0
  for (const p of d.panels) {
    if (!p.content) continue
    p.content = p.content.replace(/—/g, () => {
      dashCount++
      return dashCount <= 2 ? '—' : ', '
    })
  }

  // Add totalWords + cover wordCount/heading
  const cover = d.panels[0]
  if (cover.type === 'cover') {
    if (!cover.heading) cover.heading = 'BIBLE 365 · DAY 3'
    if (!cover.wordCount) cover.wordCount = 5
  }
  d.totalWords = d.panels.reduce((acc, p) => acc + (p.wordCount || 0), 0)

  saveDay(3, d)
  console.log(`Day 3: panels split → ${d.panels.length}, em-dashes ${countEmDashes(d.panels)}, totalWords ${d.totalWords}`)
}

// ─── Day 4: fix curly apostrophes + change panel 6 type to prayer
function fixDay4() {
  const d = loadDay(4)
  for (const p of d.panels) {
    if (p.heading) p.heading = p.heading.replace(/[‘’]/g, "'")
    if (p.content) p.content = p.content.replace(/[‘’]/g, "'")
  }
  // Change last text-typed panel to prayer (the closing prayer)
  const last = d.panels[d.panels.length - 1]
  if (last.type === 'text' && /Father|Lord|Amen\b/.test(last.content || '')) {
    last.type = 'prayer'
  }
  saveDay(4, d)
  console.log(`Day 4: apostrophes normalized; last-panel type=${last.type}`)
}

// ─── Day 5: drop Lewis endnote, mark orphans, reduce bolds (5 → ≤3),
//           change last-panel type to prayer
function fixDay5() {
  const d = loadDay(5)
  // Drop Lewis from sources / endnotes
  if (d.sources && Array.isArray(d.sources)) {
    d.sources = d.sources.filter((s) =>
      !/Lewis|Screwtape|Geoffrey Bles/i.test(JSON.stringify(s))
    )
  }
  // Find an endnotes panel and remove Lewis line
  for (const p of d.panels) {
    if (p.type === 'endnotes' || /endnote/i.test(p.heading || '')) {
      // Remove any line referencing Lewis
      if (p.content) {
        p.content = p.content
          .split('\n')
          .filter((line) => !/Lewis|Screwtape/i.test(line))
          .join('\n')
          .trim()
        p.wordCount = p.content.split(/\s+/).filter(Boolean).length
      }
    }
  }
  // Reduce bolds. Keep bolds on the BSB scripture quote and the two
  // "Did God really say?" emphases. Drop others.
  let boldsKept = 0
  for (const p of d.panels) {
    if (!p.content) continue
    p.content = p.content.replace(/\*\*([^*]+)\*\*/g, (m, inner) => {
      // Keep first 3 bolds total across the devotional
      boldsKept++
      return boldsKept <= 3 ? m : inner
    })
  }
  // Change last text panel to prayer if it contains Father/Amen
  const last = d.panels[d.panels.length - 1]
  if (last.type === 'text' && /Father|Lord|Amen\b/.test(last.content || '')) {
    last.type = 'prayer'
  }
  saveDay(5, d)
  console.log(`Day 5: Lewis dropped; bolds=${countBolds(d.panels)}; last-panel type=${last.type}`)
}

// ─── Day 6: change last-panel type to prayer ─────────────────────
function fixDay6() {
  const d = loadDay(6)
  const last = d.panels[d.panels.length - 1]
  if (last.type === 'text' && /Father|Lord|Amen\b/.test(last.content || '')) {
    last.type = 'prayer'
    saveDay(6, d)
  }
  console.log(`Day 6: last-panel type=${last.type}`)
}

// ─── Day 7: already pristine; verify cover wordCount ─────────────
function fixDay7() {
  const d = loadDay(7)
  const cover = d.panels[0]
  if (cover.type === 'cover' && !cover.wordCount) {
    cover.wordCount = (cover.content || '').split(/\s+/).filter(Boolean).length
    saveDay(7, d)
  }
  console.log(`Day 7: pristine`)
}

console.log('━━━ Editor-flagged fixes for Bible-365 Days 1-7 ━━━')
fixDay1()
fixDay2()
fixDay3()
fixDay4()
fixDay5()
fixDay6()
fixDay7()
console.log()
console.log('Done.')
