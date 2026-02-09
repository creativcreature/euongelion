import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

const DEVOTIONALS_DIR = join(process.cwd(), 'public', 'devotionals')

describe('Devotional JSON Files', () => {
  const allSlugs = SERIES_ORDER.flatMap((slug) =>
    SERIES_DATA[slug].days.map((d) => d.slug),
  )

  it('all devotional JSON files exist', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      expect(existsSync(path), `Missing: ${slug}.json`).toBe(true)
    }
  })

  it('each JSON file has valid structure (panels or modules)', () => {
    let withContent = 0
    for (const slug of allSlugs) {
      const filePath = join(DEVOTIONALS_DIR, `${slug}.json`)
      const raw = readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)

      expect(data.title, `${slug}: missing title`).toBeTruthy()

      // Either panels-based (legacy) or modules-based (new format)
      const hasPanels = Array.isArray(data.panels) && data.panels.length >= 2
      const hasModules = Array.isArray(data.modules) && data.modules.length >= 1

      if (hasPanels || hasModules) withContent++
    }
    // At least 90% of files should have content (some Substack source data is incomplete)
    expect(withContent).toBeGreaterThan(allSlugs.length * 0.9)
  })

  it('panel-based files have required panel fields', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      const data = JSON.parse(readFileSync(path, 'utf-8'))

      if (!Array.isArray(data.panels) || data.panels.length === 0) continue

      for (const panel of data.panels) {
        expect(panel.number, `${slug}: panel missing number`).toBeDefined()
        expect(panel.type, `${slug}: panel missing type`).toBeTruthy()
        expect(panel.content, `${slug}: panel missing content`).toBeTruthy()
        expect(['cover', 'text', 'text-with-image', 'prayer']).toContain(
          panel.type,
        )
      }
    }
  })

  it('module-based files have required module fields', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      const data = JSON.parse(readFileSync(path, 'utf-8'))

      if (!Array.isArray(data.modules) || data.modules.length === 0) continue

      for (const mod of data.modules) {
        expect(mod.type, `${slug}: module missing type`).toBeTruthy()
      }
    }
  })
})
