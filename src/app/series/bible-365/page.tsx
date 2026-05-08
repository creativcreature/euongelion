import type { Metadata } from 'next'
import { SERIES_DATA } from '@/data/series'
import BiblePlanPageClient from './BiblePlanPageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bible in a Year — Euangelion',
  description:
    'A 365-day canonical-chronological reading plan you can join any day. Each day stands alone — read whatever you open the page to.',
  alternates: { canonical: '/series/bible-365' },
  openGraph: {
    title: 'Bible in a Year | Euangelion',
    description:
      'Hop in any day. The whole Bible meets you where you are.',
    type: 'article',
    url: 'https://euangelion.app/series/bible-365',
  },
}

export default function BiblePlanPage() {
  const series = SERIES_DATA['bible-365']
  if (!series) {
    return (
      <div className="mock-home">
        <main className="mock-paper" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <p>Bible-365 plan is loading… (data not registered)</p>
        </main>
      </div>
    )
  }
  return <BiblePlanPageClient series={series} />
}
