import Link from 'next/link'

/**
 * Audit Manus §9 (HOMEPAGE-AUDIT-2026-05-11): footer rebalanced so the
 * mission leads and legal links don't dominate. Previously: 4 equal
 * columns + a footer note that newsletter was "coming soon" (a missed
 * waiting-list opportunity, per the audit). Now: a one-sentence mission
 * line at the top of the footer, the editorial colophon below it, and
 * legal links compressed into a single quiet row at the bottom.
 */

const PRODUCT_LINKS = [
  { href: '/daily-bread', label: 'Daily Bread' },
  { href: '/soul-audit', label: 'Soul Audit' },
  { href: '/wake-up', label: 'Wake-Up' },
  { href: '/series', label: 'Series' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/donation-disclosure', label: 'Donation Transparency' },
  { href: '/support', label: 'Contact & Support' },
  { href: '/help', label: 'Help Center' },
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
      <div className="mock-site-footer-mission">
        <p className="vw-small text-secondary type-prose">
          The product is shaped by the conviction that the gospel does its own
          work when given honest space to land. Anchored in the Apostles’ and
          Nicene Creeds. Voices from Augustine, à Kempis, Spurgeon, Tozer, and
          more.
        </p>
      </div>

      <div className="mock-site-footer-grid">
        <FooterColumn title="Read" links={PRODUCT_LINKS} />
        <FooterColumn title="About" links={COMPANY_LINKS} />
      </div>

      <div className="mock-site-footer-meta">
        <p className="vw-small text-muted">EUANGELION © 2026</p>
        <p className="vw-small text-muted mock-site-footer-legal">
          {LEGAL_LINKS.map((link, idx) => (
            <span key={link.href}>
              {idx > 0 && <span aria-hidden="true"> · </span>}
              <Link href={link.href} className="link-highlight">
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </footer>
  )
}
