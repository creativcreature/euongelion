#!/usr/bin/env node
/**
 * Readability gate for devotional prose (SA-053).
 *
 * The useful measurement here is NOT the average grade level — the catalog
 * already sits at ~7.7 Flesch-Kincaid, which is 8th grade. What makes a day feel
 * dense is the TAIL: a handful of 80-95 word sentences that a reader stalls on,
 * which an average washes out completely. So this reports both, and gates on the
 * tail.
 *
 *   node scripts/check-readability.mjs <series-slug> [...]
 *   node scripts/check-readability.mjs --all
 *   node scripts/check-readability.mjs <slug> --list    # show every offending sentence
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(REPO, 'public/devotionals')

// Prose WE author. Scripture is quoted, vocab is definitional, cta is UI copy —
// none of them are ours to simplify, so none of them are measured.
const PROSE = new Set([
  'teaching', 'reflection', 'story', 'insight',
  'bridge', 'takeaway', 'comprehension', 'profile', 'pullquote',
])

export const TARGETS = {
  fkMax: 8.5,        // 8th grade, allowing the "slightly elevated" the founder wants
  over30MaxPct: 8,   // share of sentences at 30+ words
  hardCapWords: 45,  // no sentence may exceed this, ever
}

const syllables = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = w.match(/[aeiouy]{1,2}/g)
  return m ? m.length : 1
}

const strip = (s) =>
  String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function sentencesOf(slug) {
  const out = []
  const files = fs.readdirSync(DIR).filter((f) => f.startsWith(`${slug}-day-`)).sort()
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
    for (const m of d.modules || []) {
      if (!PROSE.has(m.type)) continue
      for (const k of ['content', 'body', 'text']) {
        if (typeof m[k] !== 'string') continue
        for (const raw of strip(m[k]).split(/[.!?]+(?=\s|$)/)) {
          const t = raw.trim()
          const n = t.split(/\s+/).filter((x) => /[a-z]/i.test(x)).length
          if (n >= 3) out.push({ text: t, words: n, type: m.type, day: f, quote: /["“”]/.test(t) })
        }
      }
    }
  }
  return { files, sentences: out }
}

export function score(sentences) {
  const words = sentences.flatMap((s) => s.text.split(/\s+/)).filter((w) => /[a-z]/i.test(w))
  const wps = words.length / sentences.length
  const spw = words.reduce((a, w) => a + syllables(w), 0) / words.length
  const over30 = sentences.filter((s) => s.words >= 30)
  const overCap = sentences.filter((s) => s.words > TARGETS.hardCapWords)
  return {
    words: words.length,
    fk: 0.39 * wps + 11.8 * spw - 15.59,
    ease: 206.835 - 1.015 * wps - 84.6 * spw,
    wps,
    over30, overCap,
    over30Pct: (100 * over30.length) / sentences.length,
  }
}

const args = process.argv.slice(2)
const list = args.includes('--list')
let slugs = args.filter((a) => !a.startsWith('--'))
if (args.includes('--all')) {
  slugs = [...new Set(fs.readdirSync(DIR).map((f) => f.replace(/-day-\d+\.json$/, '')))].sort()
}
if (!slugs.length) {
  console.error('usage: check-readability.mjs <series-slug> [...] | --all [--list]')
  process.exit(1)
}

let failed = 0
const rows = []
for (const slug of slugs) {
  const { files, sentences } = sentencesOf(slug)
  if (!sentences.length) continue
  const r = score(sentences)
  const ok = r.fk <= TARGETS.fkMax && r.over30Pct <= TARGETS.over30MaxPct && !r.overCap.length
  if (!ok) failed++
  rows.push({ slug, days: files.length, ...r, ok })
}

console.log(
  'series'.padEnd(34) + 'days'.padStart(5) + 'FK'.padStart(7) + 'ease'.padStart(6) +
  'w/sent'.padStart(8) + '30w+'.padStart(7) + 'over45'.padStart(8) + '  verdict',
)
for (const r of rows) {
  console.log(
    r.slug.padEnd(34) +
      String(r.days).padStart(5) +
      r.fk.toFixed(1).padStart(7) +
      r.ease.toFixed(0).padStart(6) +
      r.wps.toFixed(1).padStart(8) +
      (r.over30Pct.toFixed(1) + '%').padStart(7) +
      String(r.overCap.length).padStart(8) +
      '  ' + (r.ok ? 'pass' : 'FAIL'),
  )
  if (list && r.overCap.length) {
    for (const s of r.overCap.sort((a, b) => b.words - a.words)) {
      console.log(`      ${String(s.words).padStart(3)}w  ${s.type}${s.quote ? ' · quote' : ''}  ${s.day}`)
      console.log(`           "${s.text.slice(0, 160)}…"`)
    }
  }
}

console.log()
console.log(`targets: FK ≤ ${TARGETS.fkMax} · 30w+ ≤ ${TARGETS.over30MaxPct}% · nothing over ${TARGETS.hardCapWords}w`)
console.log(`series measured: ${rows.length}   failing: ${failed}`)
console.log()
console.log('The average is rarely the problem. A day reads dense because of a few')
console.log('very long sentences, and an average hides them — so the tail is the gate.')

process.exit(failed ? 1 : 0)
