import Link from 'next/link'

/**
 * Audit Manus §9 (HOMEPAGE-AUDIT-2026-05-11): footer rebalanced so the
 * mission leads and legal links don't dominate. Previously: 4 equal
 * columns + a footer note that newsletter was "coming soon" (a missed
 * waiting-list opportunity, per the audit). Now: a one-sentence mission
 * line at the top of the footer, the editorial colophon below it, and
 * legal links compressed into a single quiet row at the bottom.
 */

// Phase 1.4 — footer link hygiene: ensure the daily (/today) and weekly
// (/sunday) editions are reachable from the footer now that the top nav
// is tightened to 5 items. Daily Bread + Library remain here as the
// returning-user surfaces dropped from the top nav.
const PRODUCT_LINKS = [
  // SA-059: the paper is The Daily Bread now; TODAY is your own reading.
  { href: '/daily-bread', label: 'The Daily Bread' },
  { href: '/today', label: 'Today' },
  { href: '/sunday', label: 'Sunday Edition' },
  { href: '/soul-audit', label: 'Soul Audit' },
  { href: '/series', label: 'Series' },
  { href: '/library', label: 'Library' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/donation-disclosure', label: 'Donation Transparency' },
  { href: '/support', label: 'Contact & Support' },
  { href: '/help', label: 'Help Center' },
]

const RESOURCES_LINKS = [
  { href: '/how-we-write', label: 'How we write' },
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
  const headingId = `footer-col-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <nav aria-labelledby={headingId}>
      <h2 id={headingId} className="text-label">
        {title}
      </h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="vw-small link-highlight">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function SiteFooter() {
  return (
    <footer className="mock-site-footer" aria-label="Site footer">
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
