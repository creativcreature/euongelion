import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Screen-reader landmark contract', () => {
  const files = [
    'src/app/page.tsx',
    'src/app/daily-bread/page.tsx',
    'src/app/soul-audit/results/page.tsx',
    'src/app/wake-up/page.tsx',
    'src/app/wake-up/series/[slug]/SeriesPageClient.tsx',
    'src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx',
  ]

  it('ensures primary routes expose a main landmark target for skip links', () => {
    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(content, `${file} missing main-content landmark`).toContain(
        'id="main-content"',
      )
    }
  })

  it('keeps topbar date semantic with time element in shell header', () => {
    const header = fs.readFileSync(
      path.join(process.cwd(), 'src/components/EuangelionShellHeader.tsx'),
      'utf8',
    )
    expect(header).toContain('<time')
    expect(header).toContain('className="mock-topbar-date"')
    expect(header).toContain("dateTime={now?.toISOString() ?? ''}")
  })
})
