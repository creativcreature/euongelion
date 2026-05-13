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
  { href: '/library', label: 'My Library' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/donation-disclosure', label: 'Donation Transparency' },
  { href: '/support', label: 'Contact & Support' },
  { href: '/help', label: 'Help Center' },
]

const RESOURCES_LINKS = [
  { href: '/about/translations', label: 'Translations' },
  { href: '/credits', label: 'Credits & Licensing' },
  { href: '/sitemap.xml', label: 'Sitemap' },
  { href: '/llms.txt', label: 'AI Crawler Stance' },
]

// LEGAL_LINKS moved to <BottomLegal /> in src/app/page.tsx — they now
// render BELOW the EUANGELION masthead per founder direction 2026-05-13.

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
        <FooterColumn title="Resources" links={RESOURCES_LINKS} />
      </div>
    </footer>
  )
}
