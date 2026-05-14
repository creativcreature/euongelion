import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Series',
  description:
    'Every devotional series at Euangelion — Wake-Up Magazine arcs, Substack reading plans, and the Bible-in-a-Year. Pick a 5–7 day journey or settle into the long read.',
  alternates: { canonical: '/series' },
  openGraph: {
    title: 'All Series | Euangelion',
    description:
      'Every devotional series at Euangelion — Wake-Up arcs, Substack reading plans, and the Bible-in-a-Year.',
    url: 'https://euangelion.app/series',
    type: 'website',
  },
}

export default function SeriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
