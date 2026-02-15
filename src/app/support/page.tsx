import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Contact & Support | Euangelion',
  description: 'Support channels and contact information for Euangelion.',
}

export default function SupportPage() {
  return (
    <StaticInfoPage
      breadcrumb="SUPPORT"
      kicker="CONTACT & SUPPORT"
      title="Need help? Reach out."
      sections={[
        {
          title: 'Support',
          body: [
            'Email support@euangelion.app for account, billing, and devotional flow issues.',
            'For privacy requests, include the email tied to your account and requested action.',
          ],
        },
        {
          title: 'Response expectations',
          body: [
            'We aim to respond within 1-2 business days.',
            'Urgent account lockout and billing issues are prioritized.',
          ],
        },
      ]}
    />
  )
}
