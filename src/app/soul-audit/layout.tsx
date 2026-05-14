import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Soul Audit',
  description:
    'Write what you’re wrestling with. We listen and suggest the right series for this week — without forcing a quiz on you.',
  alternates: { canonical: '/soul-audit' },
  openGraph: {
    title: 'Soul Audit | Euangelion',
    description:
      'Write what you’re wrestling with. We listen and suggest the right series for this week.',
    url: 'https://euangelion.app/soul-audit',
    type: 'website',
  },
}

export default function SoulAuditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
