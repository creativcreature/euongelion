import Link from 'next/link'

const PRODUCT_LINKS = [
  { href: '/daily-bread', label: 'Daily Bread' },
  { href: '/soul-audit', label: 'Soul Audit' },
  { href: '/series', label: 'Series' },
  { href: '/wake-up', label: 'Wake-Up' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/donation-disclosure', label: 'Donation Transparency' },
  { href: '/support', label: 'Contact & Support' },
]

const HELP_LINKS = [
  { href: '/help', label: 'Help Center' },
  { href: '/help#faq', label: 'FAQ' },
  { href: '/settings', label: 'Settings' },
]

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/community-guidelines', label: 'Community Guidelines' },
  { href: '/content-disclaimer', label: 'Content Disclaimer' },
]

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <section>
      <h2 className="text-label">{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="vw-small link-highlight">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function SiteFooter() {
  return (
    <footer className="mock-site-footer">
      <div className="mock-site-footer-grid">
        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />
        <FooterColumn title="Help" links={HELP_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="mock-site-footer-meta">
        <p className="vw-small">
          Newsletter and product updates coming soon. For now, use Support for
          direct contact.
        </p>
        <p className="vw-small">EUANGELION © 2026</p>
      </div>
    </footer>
  )
}
