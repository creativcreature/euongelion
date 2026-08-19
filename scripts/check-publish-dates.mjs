#!/usr/bin/env node
/**
 * Every devotional on disk must carry a publication date in the register.
 *
 * A publisher knows when it published a thing. Retroactively that record was
 * reconstructed from evidence and is uneven — 121 of 575 have a true day, the
 * rest only a month. Going forward there is no excuse: a reading that ships
 * without a date is a reading nobody can cite, order, or archive.
 *
 * So this fails a commit that adds devotionals without regenerating the
 * register. The fix is always the same one command, printed on failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEVOTIONALS = path.join(REPO, 'public/devotionals')
const REGISTER = path.join(REPO, 'src/data/devotional-publish-dates.ts')

if (!fs.existsSync(DEVOTIONALS)) {
  console.log('publish-dates: no devotionals directory; nothing to check.')
  process.exit(0)
}
if (!fs.existsSync(REGISTER)) {
  console.error('\npublish-dates: register missing.')
  console.error('  Run: node scripts/build-publish-dates.mjs\n')
  process.exit(1)
}

const slugs = fs.readdirSync(DEVOTIONALS).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
const register = fs.readFileSync(REGISTER, 'utf8')
const recorded = new Set([...register.matchAll(/^\s*'([^']+)':\s*\{\s*publishedAt:/gm)].map((m) => m[1]))

const missing = slugs.filter((s) => !recorded.has(s))
const orphaned = [...recorded].filter((s) => !slugs.includes(s))

if (missing.length) {
  console.error(`\npublish-dates: ${missing.length} devotional(s) have no publication date.`)
  for (const s of missing.slice(0, 10)) console.error(`  - ${s}`)
  if (missing.length > 10) console.error(`  ... and ${missing.length - 10} more`)
  console.error('\n  Run: node scripts/build-publish-dates.mjs')
  console.error('  Then stage src/data/devotional-publish-dates.ts\n')
  process.exit(1)
}

// Orphans are a warning, not a failure: a reading can be withdrawn, and a
// publisher keeps the record of what it published even after it is pulled.
if (orphaned.length) {
  console.log(`publish-dates: ${slugs.length} dated. Note: ${orphaned.length} register entr(y/ies) no longer on disk (withdrawn?).`)
} else {
  console.log(`publish-dates: ${slugs.length} devotionals, all dated.`)
}
