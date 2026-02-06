import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

const DEVOTIONALS_DIR = join(process.cwd(), 'public', 'devotionals')

describe('Devotional JSON Files', () => {
  const allSlugs = SERIES_ORDER.flatMap((slug) =>
    SERIES_DATA[slug].days.map((d) => d.slug),
  )

  it('all 35 devotional JSON files exist', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      expect(existsSync(path), `Missing: ${slug}.json`).toBe(true)
    }
  })

  it('each JSON file has valid structure', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      const raw = readFileSync(path, 'utf-8')
      const data = JSON.parse(raw)

      expect(data.title, `${slug}: missing title`).toBeTruthy()
      expect(data.panels, `${slug}: missing panels`).toBeInstanceOf(Array)
      expect(
        data.panels.length,
        `${slug}: should have at least 2 panels`,
      ).toBeGreaterThanOrEqual(2)
      expect(data.totalWords, `${slug}: missing totalWords`).toBeGreaterThan(0)
    }
  })

  it('each panel has required fields', () => {
    for (const slug of allSlugs) {
      const path = join(DEVOTIONALS_DIR, `${slug}.json`)
      const data = JSON.parse(readFileSync(path, 'utf-8'))

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
})
