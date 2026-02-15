import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Donation Disclosure | Euangelion',
  description: 'How support contributions are allocated and reported.',
}

export default function DonationDisclosurePage() {
  return (
    <StaticInfoPage
      breadcrumb="DONATION DISCLOSURE"
      kicker="LEGAL"
      title="Donation Disclosure"
      sections={[
        {
          title: 'Contribution model',
          body: [
            'Donations are support contributions and are not tax-deductible at launch.',
            'Contributions are allocated with the default split: 60% charity, 25% operations, 15% labor.',
          ],
        },
        {
          title: 'Transparency',
          body: [
            'Euangelion publishes allocation reporting on a public transparency page.',
            'Paid users also see a personal + global allocation view in dashboard contexts.',
          ],
        },
      ]}
    />
  )
}
