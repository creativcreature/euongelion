/**
 * Retroactive tagging pass (F-095 / SA-051).
 *
 * Lives here so it imports the REAL resolver — one implementation of
 * attribution, not a second copy in a build script that can drift from it.
 * Inert unless explicitly invoked:
 *
 *   RED_LETTER_APPLY=1 npx vitest run __tests__/red-letter-apply.test.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRedLetter } from '@/lib/red-letter-resolve'

const DIR = 'public/devotionals'
const APPLY = process.env.RED_LETTER_APPLY === '1'

describe('red letter across the catalog', () => {
  it(APPLY ? 'tags every devotional' : 'reports coverage (set RED_LETTER_APPLY=1 to write)', () => {
    let modules = 0
    let tagged = 0
    let files = 0
    const byTranslation: Record<string, { total: number; tagged: number }> = {}

    for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
      const p = path.join(DIR, file)
      const doc = JSON.parse(fs.readFileSync(p, 'utf8'))
      let changed = false

      for (const mod of doc.modules ?? []) {
        if (mod.type !== 'scripture' || !mod.passage) continue
        const spans = resolveRedLetter(mod.reference, mod.passage)
        if (!mod.reference?.match(/^(Matthew|Mark|Luke|John|Acts|Revelation)\b/)) continue

        modules += 1
        const tr = (mod.translation || '?').toUpperCase()
        byTranslation[tr] = byTranslation[tr] ?? { total: 0, tagged: 0 }
        byTranslation[tr].total += 1

        if (spans.length === 0) continue
        tagged += 1
        byTranslation[tr].tagged += 1

        if (JSON.stringify(mod.redLetter ?? []) !== JSON.stringify(spans)) {
          mod.redLetter = spans
          changed = true
        }
      }

      if (changed) {
        files += 1
        if (APPLY) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n')
      }
    }

    const pct = Math.round((tagged / Math.max(modules, 1)) * 100)
    const lines = Object.entries(byTranslation)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([tr, s]) => `${tr} ${s.tagged}/${s.total}`)
      .join('  ')
    fs.writeFileSync(
      'scripts/red-letter/coverage.txt',
      `${APPLY ? 'APPLIED' : 'DRY RUN'}\nmodules ${modules}\ntagged ${tagged} (${pct}%)\nfiles changed ${files}\n${lines}\n`,
    )

    // The catalog must stay majority-attributed; a regression in the resolver
    // that silently stopped matching would otherwise pass unnoticed.
    expect(modules).toBeGreaterThan(100)
    expect(pct).toBeGreaterThan(50)
  })
})
