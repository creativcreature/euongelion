import Image from 'next/image'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import ResourceCard from '@/components/seeking-help/ResourceCard'
import { CATEGORIES, EMERGENCY, LAST_VERIFIED } from '@/data/georgia-help'

/** Derived, never hard-coded — the copy below claims a number to the reader. */
const ENTRY_COUNT =
  EMERGENCY.length + CATEGORIES.reduce((n, c) => n + c.resources.length, 0)

/**
 * /seeking-help-georgia
 *
 * A page we can hand to someone in trouble in Georgia.
 *
 * Deliberately a server component with no client JavaScript: every
 * interaction is a native anchor or a tel: link, so the page works on a bad
 * connection, on an old phone, and with JS disabled. The people this page is
 * for are exactly the people whose phones do not run React well.
 *
 * Reading order is triage order — emergency numbers before prose, the PDF
 * before the list, and the list before the sections. Scripture sits at the
 * very bottom, on purpose: nobody looking for a shelter bed tonight should
 * have to scroll past a devotional to find a phone number.
 */

export default function SeekingHelpGeorgia() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <div className="gahelp-root shell-content-pad mx-auto max-w-5xl">
          <Breadcrumbs
            className="mb-6"
            items={[{ label: 'HOME', href: '/' }, { label: 'SEEKING HELP' }]}
          />

          {/* ── Emergency band. Above everything. ──────────────────── */}
          <section
            className="gahelp-emergency"
            aria-labelledby="gahelp-emergency-heading"
          >
            <p className="gahelp-emergency-kicker">
              If you are in danger right now
            </p>
            <h2 id="gahelp-emergency-heading" className="sr-only">
              Emergency numbers
            </h2>
            <div className="gahelp-emergency-grid">
              <a
                href="tel:988"
                className="gahelp-emergency-btn"
                aria-label="Call or text 988, the Suicide and Crisis Lifeline"
              >
                <span className="gahelp-emergency-btn-num">988</span>
                <span className="gahelp-emergency-btn-label">
                  Call or text · Suicide &amp; Crisis Lifeline
                </span>
              </a>
              <a
                href="sms:741741&body=HOME"
                className="gahelp-emergency-btn"
                aria-label="Text HOME to 741741, the Crisis Text Line"
              >
                <span className="gahelp-emergency-btn-num">741741</span>
                <span className="gahelp-emergency-btn-label">
                  Text HOME · Crisis Text Line
                </span>
              </a>
              <a
                href="tel:911"
                className="gahelp-emergency-btn"
                aria-label="Call 911 for a medical or safety emergency"
              >
                <span className="gahelp-emergency-btn-num">911</span>
                <span className="gahelp-emergency-btn-label">
                  Someone is hurt or in danger now
                </span>
              </a>
            </div>
            <p className="gahelp-emergency-foot">
              All three are free, any hour. You do not need insurance, an ID, or
              a good reason.
            </p>
          </section>

          {/* ── Masthead ───────────────────────────────────────────── */}
          {/* The PDF sits INSIDE the header, directly under the h1 and above
              the standfirst. Measured, not guessed: with the header's full
              standfirst first, the download button landed at 1210px on a
              375×812 phone — far below the fold. Title → action → explanation
              puts it at ~730px, which is the only arrangement that actually
              honours "linked above fold" on a phone. */}
          <header className="gahelp-header">
            <p className="text-label vw-small gahelp-kicker">
              GEORGIA · OUTREACH
            </p>
            <h1 className="vw-heading-lg gahelp-title">
              If you need help in Georgia
            </h1>

            <div className="gahelp-actions">
              <a
                href="/seeking-help-georgia.pdf"
                className="cta-major text-label gahelp-pdf-btn"
                download
              >
                Download / print this list (PDF)
              </a>
              <p className="gahelp-actions-note">
                All {ENTRY_COUNT} entries, black and white, made to survive a
                photocopier. 988 is printed on every page.
              </p>
            </div>

            <p className="vw-body-lg gahelp-standfirst">
              This is a list of people who will pick up the phone. Food, a bed,
              the power bill, a doctor, a lawyer, someone to talk to at three in
              the morning. Most of it is free. None of it requires you to
              believe anything.
            </p>
          </header>

          {/* ── Triage grid ────────────────────────────────────────── */}
          <nav
            className="gahelp-triage"
            aria-labelledby="gahelp-triage-heading"
          >
            <h2
              id="gahelp-triage-heading"
              className="text-label vw-small gahelp-section-kicker"
            >
              Start here — what do you need?
            </h2>
            <ul className="gahelp-triage-grid">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <a href={`#${category.id}`} className="gahelp-tile">
                    <span className="gahelp-tile-label">
                      {category.tileLabel}
                    </span>
                    <span className="gahelp-tile-arrow" aria-hidden="true">
                      ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="gahelp-hero">
            <Image
              src="/images/site/seeking-help/hero.webp"
              alt=""
              width={1400}
              height={467}
              priority
            />
          </div>

          {/* ── The list ───────────────────────────────────────────── */}
          {CATEGORIES.map((category) => (
            <section
              key={category.id}
              id={category.id}
              className="gahelp-section"
              aria-labelledby={`${category.id}-heading`}
            >
              <h2
                id={`${category.id}-heading`}
                className="vw-heading-md gahelp-section-title"
              >
                {category.title}
              </h2>
              <p className="vw-body gahelp-section-intro">{category.intro}</p>

              {/* Section plate. alt="" on purpose — the heading above already
                  carries the meaning, so announcing the illustration would
                  just put furniture between a screen-reader user and the
                  phone numbers. Lazy + async below the first section. */}
              <div className="gahelp-plate">
                <Image
                  src={`/images/site/seeking-help/${category.id}.webp`}
                  alt=""
                  width={1000}
                  height={667}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="gahelp-cards">
                {category.resources.map((resource) => (
                  <ResourceCard key={resource.name} resource={resource} />
                ))}
              </div>

              <a href="#gahelp-triage-heading" className="gahelp-back">
                ↑ Back to the list
              </a>
            </section>
          ))}

          {/* ── Honesty about the page itself ──────────────────────── */}
          <section
            className="gahelp-colophon"
            aria-labelledby="gahelp-colophon-heading"
          >
            <h2
              id="gahelp-colophon-heading"
              className="text-label vw-small gahelp-section-kicker"
            >
              About this list
            </h2>
            <p className="vw-body">
              Every number and link here was checked against the
              provider&rsquo;s own site or the responsible state agency on{' '}
              <strong>{LAST_VERIFIED}</strong>. Things change anyway — funds run
              out, hours move, programs close. If a number here does not work,
              dial{' '}
              <a href="tel:211" className="link-highlight">
                211
              </a>
              . A real person will look up what is actually open today.
            </p>
            <p className="vw-body">
              Where we know about a catch — a waiting list, an income limit, a
              program that requires you to attend something — we said so on the
              card. We would rather tell you before you drive across town than
              after.
            </p>
            <p className="vw-body">
              This list is not complete, and it leans toward metro Atlanta in
              places simply because that is where more services are. If you know
              something that belongs here, or something here that has gone
              wrong, tell us at{' '}
              <a href="/support" className="link-highlight">
                our support page
              </a>
              .
            </p>
            <p className="vw-body gahelp-disclaimer">
              Euangelion does not run any of these programs and cannot control
              what happens when you contact them. This page is information, not
              medical, legal, or financial advice.
            </p>
          </section>

          {/* ── The one place we say the quiet part ────────────────── */}
          <section
            className="gahelp-benediction"
            aria-label="A word before you go"
          >
            <p className="gahelp-verse">
              &ldquo;The Lord is near to the brokenhearted and saves the crushed
              in spirit.&rdquo;
            </p>
            <p className="gahelp-verse-ref">Psalm 34:18</p>
            <p className="gahelp-benediction-note">
              We put that at the bottom rather than the top for a reason. If you
              came here for a phone number, you should have found one before you
              found us. Whatever brought you here, we are glad you are still
              here.
            </p>
          </section>
        </div>

        <SiteBottom />
      </main>
    </div>
  )
}
