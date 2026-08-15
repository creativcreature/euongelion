#!/usr/bin/env node
/**
 * SA-052 verification gate for series masters.
 *
 * Steps 1 and 2 are measured here. Step 3 — period dress, dense-dot skin, no
 * blacked-out faces — CANNOT be measured and is not attempted. This script
 * prints which plates still need a human look rather than pretending to pass
 * them. A plate can clear both measurements and still be wrong.
 *
 *   node scripts/imagery/verify-masters.mjs [dir]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const require = createRequire(path.join(REPO, 'package.json'))
const sharp = require('sharp')

const DIR =
  process.argv[2] ||
  process.env.SERIES_MASTERS_DIR ||
  '/private/tmp/claude-501/-Users-jamesparker-Documents-app-projects-external-euangelion/763444a7-3863-4387-888d-c4f34b4de80d/scratchpad/series-final'

// Warm cream paper, not blue ink. Deliberately generous on the blue channel so
// a faint printed tint still counts as printed rather than blank.
const isPaper = (r, g, b) => r > 228 && g > 212 && b > 158 && r - b < 112

const HERO_W = 1408
const HERO_H = 768

async function check(file) {
  const src = path.join(DIR, file)

  // Step 1 — border, sampled on the crop the site actually renders.
  const hero = await sharp(src)
    .resize(HERO_W, HERO_H, { fit: 'cover', position: 'centre' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const px = (x, y) => {
    const i = (y * hero.info.width + x) * hero.info.channels
    return [hero.data[i], hero.data[i + 1], hero.data[i + 2]]
  }
  const ys = [Math.round(HERO_H * 0.25), Math.round(HERO_H * 0.5), Math.round(HERO_H * 0.75)]
  const edges = [
    ...ys.map((y) => px(3, y)),
    ...ys.map((y) => px(hero.info.width - 4, y)),
  ]
  const paperEdges = edges.filter(([r, g, b]) => isPaper(r, g, b)).length
  const borderOk = paperEdges < 3

  // Step 2 — blank-paper coverage across the whole frame.
  const small = await sharp(src)
    .resize(200, 200, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let blank = 0
  let total = 0
  for (let i = 0; i < small.data.length; i += small.info.channels) {
    total++
    if (isPaper(small.data[i], small.data[i + 1], small.data[i + 2])) blank++
  }
  const blankPct = (100 * blank) / total
  const blankOk = blankPct < 2

  return { file, borderOk, paperEdges, blankPct, blankOk, pass: borderOk && blankOk }
}

const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()
  : []

if (!files.length) {
  console.error(`no masters in ${DIR}`)
  process.exit(1)
}

const results = []
for (const f of files) results.push(await check(f))

const w = Math.max(...results.map((r) => r.file.length))
for (const r of results) {
  const border = r.borderOk ? 'ok  ' : `BAD(${r.paperEdges}/6)`
  const blankTxt = `${r.blankPct.toFixed(1)}%`.padStart(6)
  const verdict = r.pass ? 'pass' : 'FAIL'
  console.log(
    `  ${r.file.padEnd(w)}  border ${border}  blank ${blankTxt}  ${verdict}`,
  )
}

const failed = results.filter((r) => !r.pass)
console.log()
console.log(`measured: ${results.length}   passed: ${results.length - failed.length}   failed: ${failed.length}`)
if (failed.length) {
  console.log(`regenerate: ${failed.map((r) => r.file.replace(/\.png$/, '')).join(' ')}`)
}
console.log()
console.log('Step 3 is NOT measured. Open every passing plate and confirm:')
console.log('  period dress · dense-dot brown skin · no blacked-out faces · no modern clothing')

process.exit(failed.length ? 1 : 0)
