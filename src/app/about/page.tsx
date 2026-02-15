import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'About | Euangelion',
  description: 'Why Euangelion exists and what it is building.',
}

export default function AboutPage() {
  return (
    <StaticInfoPage
      breadcrumb="ABOUT"
      kicker="ABOUT EUANGELION"
      title="Daily devotionals for the hungry soul."
      sections={[
        {
          title: 'Mission',
          body: [
            'Euangelion helps people find their next faithful step through curated devotional pathways.',
            'The product is built for honest reflection, grounded scripture, and sustained rhythm.',
          ],
        },
        {
          title: 'How it works',
          body: [
            'Soul Audit matches a user to devotional options first, then builds the selected path.',
            'Daily Bread becomes the user home for reading progress, saves, and archives.',
          ],
        },
      ]}
    />
  )
}
