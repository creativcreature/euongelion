import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Help | Euangelion',
  description: 'How Euangelion works: onboarding, devotional flow, and tools.',
}

export default function HelpPage() {
  return (
    <StaticInfoPage
      breadcrumb="HELP"
      kicker="HELP CENTER"
      title="Get answers and keep moving."
      sections={[
        {
          title: 'How to start',
          body: [
            'Run a Soul Audit and pick one of the five options. We only build the full devotional after you choose.',
            'If you skip sign-up, you can still read and explore. Saving actions ask you to sign in.',
          ],
        },
        {
          title: 'Daily Bread',
          body: [
            'Daily Bread is your devotional home. It tracks current path, archive, bookmarks, highlights, notes, and chat history.',
            'Open Settings to control theme mode, sabbath day, and testing toggles.',
          ],
        },
        {
          title: 'FAQ',
          body: [
            'FAQ content is mirrored on the homepage Q+A section and expanded here for product usage questions.',
            'If you need support, use the Contact & Support page linked in the footer.',
          ],
        },
      ]}
    />
  )
}
