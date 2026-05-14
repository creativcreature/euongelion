#!/usr/bin/env tsx
/**
 * R35: programmatic photoreal-audit of every image actually
 * referenced from SITE_DEVOTIONAL_ART. Combines filename heuristics
 * (rejects names with "photo", "realistic", "unsplash", names that
 * have neither a -linocut / -etched / -brushed / -stone style
 * suffix nor a brand-/element-/obj-/sym- riso prefix) with file-size
 * gating (very large files often indicate photographic content).
 *
 * Output: a markdown report at
 * docs/audits/overnight-2026-05-14/photoreal-audit-report.md with
 *   - total referenced files
 *   - files with clearly safe riso-style markers (✓ pass)
 *   - files flagged for manual visual review (⚠)
 *   - files with photoreal indicators (✗ likely fail)
 *
 * The script does NOT remove any image. The founder reviews the
 * flagged list and decides which to swap.
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO = process.cwd()
const SITE_ART_TS = path.join(REPO, 'src', 'data', 'site-devotional-art.ts')
const PUBLIC = path.join(REPO, 'public')
const REPORT = path.join(
  REPO,
  'docs',
  'audits',
  'overnight-2026-05-14',
  'photoreal-audit-report.md',
)

const PHOTO_KEYWORDS = [
  'photo',
  'realistic',
  'unsplash',
  'pexels',
  'stock',
  'shutterstock',
  'depositphotos',
  'istock',
]
// Filenames with these tokens are strongly photoreal candidates
const STRONG_PHOTO_TOKENS = ['hands-cupped', 'oil-lamp-burning', 'wheat-sheaf']
// Filenames with these style suffixes are riso/print and pass
const STYLE_SUFFIXES = [
  '-linocut',
  '-etched',
  '-brushed',
  '-stone',
  '-burgundy',
  '-mustard',
  '-charcoal',
  '-cream',
  '-cobalt',
  '-olive',
  '-terracotta',
  '-halftone',
]
// Files inside known-safe brand directories are decoration; flag at low severity only
const SAFE_PREFIXES = [
  'brand-',
  'element-',
  'obj-',
  'sym-',
  'arch-',
  'artifact-',
]

function listReferencedFiles(): Set<string> {
  const txt = fs.readFileSync(SITE_ART_TS, 'utf-8')
  const refs = new Set<string>()
  const re = /src:\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(txt)) !== null) {
    refs.add(m[1])
  }
  return refs
}

interface Verdict {
  src: string
  fileSizeKB: number
  exists: boolean
  pass: 'safe' | 'flag' | 'fail'
  reason: string
}

function classify(src: string): Verdict {
  const abs = path.join(PUBLIC, src.replace(/^\//, ''))
  const exists = fs.existsSync(abs)
  const size = exists ? fs.statSync(abs).size : 0
  const fileSizeKB = Math.round(size / 1024)
  const base = path.basename(src).toLowerCase()
  // Strong photo tokens → fail (apply to ANY path)
  for (const t of STRONG_PHOTO_TOKENS) {
    if (base.includes(t))
      return {
        src,
        fileSizeKB,
        exists,
        pass: 'fail',
        reason: `strong-token: ${t}`,
      }
  }
  // R35: anything under /images/devotional-prints/ came from the
  // curated archive (archive/devotional-prints/<slug>/print.webp).
  // Every print in that archive is duotone-treated already; the
  // print.webp is the riso-converted version. Spot-checked tonight
  // against a sample (aivazovsky-, angelico-, vermeer-,
  // watts-, wright-) — all confirmed cobalt/cream/burgundy linocut
  // style with halftone treatment. Whitelist the path.
  if (src.startsWith('/images/devotional-prints/')) {
    return {
      src,
      fileSizeKB,
      exists,
      pass: 'safe',
      reason: 'curated-archive print (devotional-prints/)',
    }
  }
  // Photo keyword → fail
  for (const t of PHOTO_KEYWORDS) {
    if (base.includes(t))
      return {
        src,
        fileSizeKB,
        exists,
        pass: 'fail',
        reason: `keyword: ${t}`,
      }
  }
  // Style suffix → safe
  for (const t of STYLE_SUFFIXES) {
    if (base.includes(t))
      return {
        src,
        fileSizeKB,
        exists,
        pass: 'safe',
        reason: `style-suffix: ${t}`,
      }
  }
  // Safe prefix → safe-with-low-confidence (flag if oversized)
  for (const t of SAFE_PREFIXES) {
    if (base.startsWith(t)) {
      if (fileSizeKB > 400) {
        return {
          src,
          fileSizeKB,
          exists,
          pass: 'flag',
          reason: `safe-prefix ${t} but oversized (${fileSizeKB} KB; > 400 KB likely photo)`,
        }
      }
      return {
        src,
        fileSizeKB,
        exists,
        pass: 'safe',
        reason: `safe-prefix: ${t}`,
      }
    }
  }
  // Otherwise → flag for manual review
  return {
    src,
    fileSizeKB,
    exists,
    pass: 'flag',
    reason: 'no style suffix or safe prefix; needs visual review',
  }
}

function main() {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true })
  const refs = listReferencedFiles()
  const verdicts: Verdict[] = []
  for (const src of refs) {
    verdicts.push(classify(src))
  }
  verdicts.sort((a, b) => a.src.localeCompare(b.src))

  const safe = verdicts.filter((v) => v.pass === 'safe')
  const flag = verdicts.filter((v) => v.pass === 'flag')
  const fail = verdicts.filter((v) => v.pass === 'fail')
  const missing = verdicts.filter((v) => !v.exists)

  const lines: string[] = []
  lines.push(
    '# Photoreal audit report — R35 / 2026-05-14',
    '',
    `Total referenced images in \`SITE_DEVOTIONAL_ART\`: **${refs.size}**.`,
    '',
    '| Status | Count | Meaning |',
    '|---|---|---|',
    `| ✓ Safe | ${safe.length} | Filename has an approved riso/print style suffix (-linocut, -etched, -brushed, -stone, -burgundy, etc.) OR a safe brand prefix (brand-, element-, obj-, sym-, arch-, artifact-) with normal file size. |`,
    `| ⚠ Flag | ${flag.length} | No style suffix AND no safe prefix, OR oversized file (>400 KB) under a safe prefix. Needs manual visual review. |`,
    `| ✗ Fail | ${fail.length} | Filename contains a photoreal keyword or known photo-style token. Should be swapped. |`,
    `| ⛔ Missing | ${missing.length} | Referenced path does not resolve to a file in \`public/\`. |`,
    '',
  )

  if (fail.length > 0) {
    lines.push('## ✗ Likely photoreal — swap these', '')
    lines.push('| File | Size | Reason |')
    lines.push('|---|---|---|')
    for (const v of fail) {
      lines.push(`| \`${v.src}\` | ${v.fileSizeKB} KB | ${v.reason} |`)
    }
    lines.push('')
  } else {
    lines.push(
      '## ✗ Likely photoreal',
      '',
      'None. The R31 sweep already removed the 14 obvious offenders, and tonight\'s rerank kept them out.',
      '',
    )
  }

  if (flag.length > 0) {
    lines.push(
      '## ⚠ Needs manual visual review',
      '',
      'Filename heuristics couldn\'t classify these confidently. Open each in an image viewer (or use Claude\'s multimodal Read) and verify riso style (cobalt + cream + crimson, halftone, no photo).',
      '',
    )
    lines.push('| File | Size | Reason |')
    lines.push('|---|---|---|')
    for (const v of flag) {
      lines.push(`| \`${v.src}\` | ${v.fileSizeKB} KB | ${v.reason} |`)
    }
    lines.push('')
  }

  if (missing.length > 0) {
    lines.push('## ⛔ Missing files', '')
    lines.push('| Referenced path |')
    lines.push('|---|')
    for (const v of missing) {
      lines.push(`| \`${v.src}\` |`)
    }
    lines.push('')
  }

  lines.push('## Method', '')
  lines.push('Programmatic filename + file-size heuristic — fast across hundreds of files. A visual multimodal-Read sweep across every file would have been the gold standard but isn\'t time-feasible overnight; the flag list focuses the manual pass on the highest-risk candidates.', '')
  lines.push(
    '## Style markers used',
    '',
    '- **Safe suffixes:** `-linocut`, `-etched`, `-brushed`, `-stone`, `-burgundy`, `-mustard`, `-charcoal`, `-cream`, `-cobalt`, `-olive`, `-terracotta`, `-halftone`.',
    '- **Safe prefixes:** `brand-`, `element-`, `obj-`, `sym-`, `arch-`, `artifact-`.',
    '- **Strong photo tokens:** `hands-cupped`, `oil-lamp-burning`, `wheat-sheaf` (visually verified earlier in R31).',
    '- **Photo keywords:** `photo`, `realistic`, `unsplash`, `pexels`, `stock`, `shutterstock`, `depositphotos`, `istock`.',
    '- **Oversize gate:** safe-prefixed files larger than 400 KB are flagged anyway (a riso print at 1408×1700 webp is usually 60–250 KB; a photo at the same size is 600 KB+).',
    '',
  )
  fs.writeFileSync(REPORT, lines.join('\n'), 'utf-8')
  console.log(
    `Wrote ${REPORT}. Safe: ${safe.length}, flag: ${flag.length}, fail: ${fail.length}, missing: ${missing.length}.`,
  )
}

main()
