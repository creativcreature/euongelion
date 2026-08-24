import type { Metadata } from 'next'
import SeekingHelpGeorgia from '@/components/seeking-help/SeekingHelpGeorgia'

export const metadata: Metadata = {
  title: 'If you need help in Georgia | Euangelion',
  description:
    'Verified Georgia help lines and services — crisis support, shelter, food, rent and utility help, healthcare, recovery, legal aid, and more. Free, printable, no sign-up.',
  alternates: { canonical: 'https://euangelion.app/seeking-help-georgia' },
  openGraph: {
    title: 'If you need help in Georgia',
    description:
      'People who will pick up the phone: food, a bed, the power bill, a doctor, a lawyer, someone to talk to at three in the morning.',
    url: 'https://euangelion.app/seeking-help-georgia',
    type: 'article',
  },
}

export default function SeekingHelpGeorgiaPage() {
  return <SeekingHelpGeorgia />
}
