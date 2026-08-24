import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import ModuleRenderer from '@/components/ModuleRenderer'

afterEach(cleanup)

/**
 * Rendered-DOM assertions for the all-these-things series (SA-123 / F-168).
 *
 * devo-go Phase 12 requires this for any new module shape: curl proves the
 * JSON was DELIVERED, not that it RENDERED. The 2026-07-12 blank-panels
 * regression shipped perfect JSON over HTTP while the reader painted empty
 * boxes, and since the bordered panels were removed on 2026-07-22 a null
 * render is now a SILENT gap — harder to spot, so this matters more, not less.
 */
const DIR = path.join(process.cwd(), 'public/devotionals')
const days = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  n,
  json: JSON.parse(
    fs.readFileSync(path.join(DIR, `all-these-things-day-${n}.json`), 'utf8'),
  ),
}))

describe('all-these-things — real day data reaches the DOM', () => {
  it.each(days)('day $n renders every prose module non-empty', ({ json }) => {
    const prose = json.modules.filter((m: { type: string }) =>
      ['teaching', 'story', 'insight', 'bridge', 'recap', 'sabbath'].includes(
        m.type,
      ),
    )
    expect(prose.length).toBeGreaterThan(0)
    for (const mod of prose) {
      const { container, unmount } = render(<ModuleRenderer module={mod} />)
      // A module that renders to nothing is the exact failure mode this guards.
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(40)
      unmount()
    }
  })

  it('renders the two-minute-open teaching write-up on day 1', () => {
    const open = days[0].json.modules[2]
    expect(open.type).toBe('teaching')
    render(<ModuleRenderer module={open} />)
    expect(screen.getByText(/There Is An Order In The Sentence/i)).toBeTruthy()
  })

  it('renders red-letter scripture spans as marked-up words of Christ', () => {
    const day1 = days[0].json
    const mod = day1.modules.find(
      (m: { type: string; redLetter?: string[] }) =>
        m.type === 'scripture' && m.redLetter?.length,
    )
    expect(mod, 'day 1 must carry a red-letter scripture module').toBeTruthy()
    const { container } = render(<ModuleRenderer module={mod} />)
    // SA-051: the words of Christ carry the .wj class.
    expect(container.querySelector('.wj')).toBeTruthy()
  })

  it('renders the video module with its verified id and title', () => {
    const day3 = days[2].json
    const vid = day3.modules.find((m: { type: string }) => m.type === 'video')
    expect(vid.videoId).toBe('HNJYvCKiny4')
    const { container } = render(<ModuleRenderer module={vid} />)
    expect(container.textContent).toMatch(/Habakkuk 2/)
  })

  it('renders the Silence story on the pivot day', () => {
    const day3 = days[2].json
    const story = day3.modules.find(
      (m: { type: string; heading?: string }) =>
        m.type === 'story' && /Silence/i.test(m.heading ?? ''),
    )
    expect(story, 'day 3 must carry the Silence story').toBeTruthy()
    const { container } = render(<ModuleRenderer module={story} />)
    expect(container.textContent).toMatch(/fumie/i)
  })
})
