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
 *   node scripts/imagery/verify-masters.mjs [dir] --intensity=3
 *
 * INTENSITY READ-BACK (SA-131): with --intensity=N the gate also reports what each
 * plate ACTUALLY measures on the 1-5 scale against what was asked for. This matters
 * because the calibration run proved the generator does not track a requested ink
 * percentage linearly — the only reliable control loop is generate, measure, and
 * regenerate the rungs that missed. A plate more than 1 rung off target is flagged.
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

// Lightness alone cannot tell "quiet but printed" from "blank". The founder's
// rule is that even the quietest region carries tone — and a printed region has
// DOT TEXTURE, so its local pixel variance is non-zero, while truly unprinted
// paper is flat. This threshold was calibrated on the AIRY plates, which read as
// 8-53% "paper" by lightness yet visibly carry halftone grain throughout.
const FLAT_VARIANCE = 6

// Sample local variance across the light regions of the image.
async function litShare(src) {
  const { data, info } = await sharp(src).resize({ width: 800 }).greyscale().raw().toBuffer({ resolveWithObject: true })
  let lit = 0
  for (let i = 0; i < data.length; i++) if (data[i] > 200) lit++
  return (100 * lit) / (info.width * info.height)
}

async function flatness(src) {
  // MUST sample at native resolution. Downscaling averages the halftone dots
  // away before they can be measured, so a correctly printed quiet area reads
  // as flat and every AIRY plate fails. This cost one full false-negative pass.
  const meta = await sharp(src).metadata()
  const N = Math.min(600, meta.width, meta.height)
  const left = Math.round((meta.width - N) / 2)
  const top = Math.round((meta.height - N) / 2)
  const { data, info } = await sharp(src)
    .extract({ left, top, width: N, height: N })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const at = (x, y) => data[y * info.width + x]

  let lightCells = 0
  let flatCells = 0
  // 5x5 neighbourhoods, stepped, so we measure texture not gradient
  for (let y = 2; y < N - 2; y += 4) {
    for (let x = 2; x < N - 2; x += 4) {
      const c = at(x, y)
      if (c < 200) continue // not a light region; ink texture is not in question
      lightCells++
      let sum = 0
      let sq = 0
      let n = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = at(x + dx, y + dy)
          sum += v
          sq += v * v
          n++
        }
      }
      const mean = sum / n
      const varr = sq / n - mean * mean
      if (varr < FLAT_VARIANCE) flatCells++
    }
  }
  // share of the light area that is genuinely featureless
  return lightCells ? (100 * flatCells) / lightCells : 0
}

const HERO_W = 1408
const HERO_H = 768

const intensityArg = process.argv.find((a) => a.startsWith('--intensity='))
const WANT = intensityArg ? Number(intensityArg.slice('--intensity='.length)) : null
if (intensityArg && (!Number.isInteger(WANT) || WANT < 1 || WANT > 5)) {
  console.error(`--intensity must be a whole number 1-5, got "${intensityArg.slice(12)}"`)
  process.exit(1)
}

// Endpoints measured 2026-08-29 (SA-131): rung 1 is the median of the shipped site
// plates in the light cluster, rung 5 the approved baroque set. Deep mass carries
// most of the weight because it separated approved from rejected in every round;
// lit share and ink share agree with it and are kept as corroboration.
const E_LO = { deep: 3.15, lit: 47.39, ink: 23.67 }
const E_HI = { deep: 73.61, lit: 5.27, ink: 85.41 }
const onScale = (v, lo, hi) => 1 + 4 * Math.max(0, Math.min(1, (v - lo) / (hi - lo)))

async function intensityOf(src) {
  const { data, info } = await sharp(src).resize({ width: 1200 }).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const n = info.width * info.height
  let deep = 0
  let lit = 0
  let ink = 0
  for (let i = 0; i < n; i++) {
    const L = 0.2126 * data[i * ch] + 0.7152 * data[i * ch + 1] + 0.0722 * data[i * ch + 2]
    if (L < 64) deep++
    if (L > 200) lit++
    if (L < 128) ink++
  }
  const pct = (c) => (100 * c) / n
  return (
    onScale(pct(deep), E_LO.deep, E_HI.deep) * 0.5 +
    onScale(pct(lit), E_LO.lit, E_HI.lit) * 0.3 +
    onScale(pct(ink), E_LO.ink, E_HI.ink) * 0.2
  )
}

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
  // A pale edge is NOT a border defect — AIRY plates legitimately run cream to
  // the edge. A real print border is pale AND FLAT (unprinted). Requiring both
  // stops the check failing every correct airy composition, which it did on
  // three separate plates before this was fixed.
  const paleEdges = edges.filter(([r, g, b]) => isPaper(r, g, b)).length
  const edgeStrip = await sharp(src)
    .extract({
      left: 0,
      top: Math.round((await sharp(src).metadata()).height * 0.3),
      width: 48,
      height: 240,
    })
    .greyscale()
    .raw()
    .toBuffer()
  let sum = 0
  let sq = 0
  for (const v of edgeStrip) {
    sum += v
    sq += v * v
  }
  const edgeVar = sq / edgeStrip.length - (sum / edgeStrip.length) ** 2
  const paperEdges = paleEdges
  const borderOk = paleEdges < 3 || edgeVar >= FLAT_VARIANCE

  // Step 2 — is any of the quiet area genuinely UNPRINTED (flat), rather than
  // merely light? Lightness alone rejects correct AIRY plates.
  const flatPct = await flatness(src)
  // Below this much lit area there is no cream worth judging: the "light region"
  // sample is a handful of glow pixels, which are smooth by design. Reporting n/a
  // is honest; failing would reject every correct high-intensity plate.
  const lit = await litShare(src)
  const blankMeasurable = lit >= 5
  const blankOk = !blankMeasurable || flatPct < 25

  const intensity = WANT === null ? null : await intensityOf(src)
  const intensityOk = intensity === null || Math.abs(intensity - WANT) <= 1
  return {
    file, borderOk, paperEdges, blankPct: flatPct, blankOk, blankMeasurable, intensity, intensityOk,
    pass: borderOk && blankOk && intensityOk,
  }
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
  const blankTxt = r.blankMeasurable ? `${r.blankPct.toFixed(0)}%`.padStart(5) : '  n/a'
  const verdict = r.pass ? 'pass' : 'FAIL'
  const intTxt =
    r.intensity === null
      ? ''
      : `  intensity ${r.intensity.toFixed(1)}/5 (asked ${WANT})${r.intensityOk ? '' : ' OFF-TARGET'}`
  console.log(
    `  ${r.file.padEnd(w)}  border ${border}  flat ${blankTxt}${intTxt}  ${verdict}`,
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
