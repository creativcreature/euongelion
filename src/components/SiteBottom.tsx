import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
// The version in the footer reads from package.json so a release bump can
// never drift from what the page claims (founder: "all footers should have
// copyright and versioning info", 2026-08-20).
import pkg from '../../package.json'

/**
 * The bottom of every page (F-101).
 *
 * Founder 2026-08-16: "All site pages should have the same footer and bottom
 * masthead as the home page. The copyright needs to be smaller and all in one
 * line."
 *
 * This is the home page's own bottom, lifted out verbatim so there is exactly
 * one of it: the footer link columns, then the EUANGELION masthead, then the
 * legal line. It was previously inlined in `src/app/page.tsx` and simply absent
 * from a dozen other pages, which is why About, Help, Support, Saved and the
 * legal pages all ended mid-air.
 *
 * Order matters and is founder-set (2026-05-13): the legal block lives BELOW
 * the masthead, never inside SiteFooter.
 */
export default function SiteBottom() {
  return (
    <>
      <SiteFooter />

      <section className="mock-bottom-brand">
        <h2 className="text-masthead mock-masthead-word">
          <span className="js-shell-masthead-fit mock-masthead-text">
            EUANGELION
          </span>
        </h2>
      </section>

      {/* One line, at small size. The copyright and the legal links used to
          stack into two paragraphs; the founder wants a single rule of small
          type, so both sit in one flowing line separated by middots. */}
      <section
        className="homepage-bottom-legal"
        aria-label="Copyright and legal"
      >
        <p className="homepage-bottom-legal-line">
          <span>
            EUANGELION is a product of WokeGod LLC. Copyright © 2026 WokeGod
            LLC. All rights reserved.
          </span>
          <span aria-hidden="true"> · </span>
          <span>v{pkg.version}</span>
          <span aria-hidden="true"> · </span>
          <Link href="/terms" className="link-highlight">
            Terms
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy" className="link-highlight">
            Privacy
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/cookie-policy" className="link-highlight">
            Cookie Policy
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/community-guidelines" className="link-highlight">
            Community Guidelines
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/content-disclaimer" className="link-highlight">
            Content Disclaimer
          </Link>
        </p>
      </section>
    </>
  )
}
