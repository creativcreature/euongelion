import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Community Guidelines | Euangelion',
  description: 'Publishing and interaction expectations for community content.',
}

export default function CommunityGuidelinesPage() {
  return (
    <StaticInfoPage
      breadcrumb="COMMUNITY GUIDELINES"
      kicker="LEGAL"
      title="Community Guidelines"
      sections={[
        {
          title: 'Respectful participation',
          body: [
            'Be truthful, charitable, and respectful in all public submissions.',
            'Harassment, hate speech, or abusive content is removed.',
          ],
        },
        {
          title: 'Public devotional submissions',
          body: [
            'Public visibility is opt-in and includes automated safety, plagiarism, and citation checks before publication.',
            'Repeated policy violations may result in account restrictions.',
          ],
        },
      ]}
    />
  )
}
