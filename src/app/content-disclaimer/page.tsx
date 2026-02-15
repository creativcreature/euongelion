import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Content Disclaimer | Euangelion',
  description: 'Important content limitations and responsibility notice.',
}

export default function ContentDisclaimerPage() {
  return (
    <StaticInfoPage
      breadcrumb="CONTENT DISCLAIMER"
      kicker="LEGAL"
      title="Content Disclaimer"
      sections={[
        {
          title: 'Spiritual guidance',
          body: [
            'Euangelion provides devotional and educational content and does not replace medical, psychological, legal, or crisis care.',
            'If you are in immediate danger, contact emergency services or local crisis resources.',
          ],
        },
        {
          title: 'Third-party references',
          body: [
            'Embedded external resources are provided for contextual study and remain owned by their original creators.',
            'Users are responsible for applying personal discernment and seeking qualified counsel where needed.',
          ],
        },
      ]}
    />
  )
}
