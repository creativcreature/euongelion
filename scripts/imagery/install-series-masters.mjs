#!/usr/bin/env node
/**
 * Install verified masters into the site, archiving what they replace.
 *
 * FOUNDER CONSTRAINT: originals remain intact. Every file this overwrites is
 * copied to public/images/site/series/_archive-<date>/ first, so the whole pass
 * is reversible by moving that folder back.
 *
 * heroImage in src/data/series.ts already points at
 * /images/site/series/<slug>.webp, so this is a file replace with no code
 * change. The four founder-approved plates are skipped by name.
 *
 *   node scripts/imagery/install-series-masters.mjs            # dry run
 *   node scripts/imagery/install-series-masters.mjs --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const require = createRequire(path.join(REPO, 'package.json'))
const sharp = require('sharp')

const SRC =
  process.env.SERIES_MASTERS_DIR ||
  '/private/tmp/claude-501/-Users-jamesparker-Documents-app-projects-external-euangelion/763444a7-3863-4387-888d-c4f34b4de80d/scratchpad/series-final'
const DEST = path.join(REPO, 'public/images/site/series')
const ARCHIVE = path.join(REPO, 'design-sources/series-archive-2026-08-15')

const spec = JSON.parse(
  fs.readFileSync(path.join(HERE, 'series-image-subjects.json'), 'utf8'),
)
const approved = new Set(spec._approved_do_not_regenerate)

const write = process.argv.includes('--write')

// Install a BAND, not a square.
//
// next.config.ts sets images.unoptimized, so Next serves this file raw with no
// srcset — the browser does the scaling. The headline slot is aspect-ratio
// 1408/768 at `sizes="(max-width:900px) 100vw, 66vw"`, which is ~1267 CSS px on
// a 1920 desktop and ~1125 device px on a 375pt phone at 3x. A 1024 square was
// therefore being UPSCALED ~1.24x in the exact slot it matters most, and
// upscaled Ben-Day dots read as grain and mush.
//
// 1600x872 is ~1.83:1 — the same shape as the 1408/768 slot, so `object-fit:
// cover` crops almost nothing, and close enough to OG's 1.91:1 to serve the
// social card too. It is also LIGHTER than the square it replaces (431 KB vs
// 446 KB at these settings) because a square spends most of its pixels on
// exactly the bands that `cover` throws away.
const WIDTH = 1600
const HEIGHT = 872
const QUALITY = 60

const masters = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace(/\.png$/, ''))
  .filter((slug) => !approved.has(slug))
  .sort()

if (write) fs.mkdirSync(ARCHIVE, { recursive: true })

let installed = 0
let archived = 0

for (const slug of masters) {
  const src = path.join(SRC, `${slug}.png`)
  const dest = path.join(DEST, `${slug}.webp`)
  const existed = fs.existsSync(dest)

  if (write) {
    if (existed) {
      fs.copyFileSync(dest, path.join(ARCHIVE, `${slug}.webp`))
      archived++
    }
    await sharp(src)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY })
      .toFile(dest)
    installed++
  }

  const kb = write ? Math.round(fs.statSync(dest).size / 1024) : 0
  console.log(
    `  ${slug.padEnd(38)} ${existed ? 'replace' : 'new    '} ${write ? `${kb} KB` : ''}`,
  )
}

console.log()
console.log(`masters: ${masters.length}   installed: ${installed}   archived: ${archived}`)
console.log(`skipped (founder-approved): ${[...approved].join(', ')}`)
if (write) {
  console.log(`\noriginals archived to ${path.relative(REPO, ARCHIVE)}`)
  console.log('revert: move that folder back over the slugs it holds')
} else {
  console.log('\nDRY RUN — pass --write to install.')
}
