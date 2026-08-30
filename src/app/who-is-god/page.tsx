import type { Metadata } from 'next'
import WhoIsGod from '@/components/who-is-god/WhoIsGod'
import './who-is-god.css'

export const metadata: Metadata = {
  // The root layout applies the template '%s | Euangelion', so this must not
  // carry the suffix itself or the tab reads "… | Euangelion | Euangelion".
  title: 'Who is God? An introduction from the beginning',
  description:
    'A complete introduction to God, Jesus and the Holy Spirit for someone starting from nothing — the Hebrew names of God, what the Bible actually is, why Jesus, and what salvation means. No church background assumed.',
  alternates: { canonical: 'https://euangelion.app/who-is-god' },
  openGraph: {
    title: 'You have heard the words God and Jesus. This is what they mean.',
    description:
      'An introduction from the beginning — the names of God in Hebrew, the story the Bible is telling, and what Christians actually claim. Nothing assumed.',
    url: 'https://euangelion.app/who-is-god',
    type: 'article',
  },
}

export default function WhoIsGodPage() {
  return <WhoIsGod />
}
