'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import SeriesRailSection from '@/components/SeriesRailSection'
import { useSoulAuditSubmit } from '@/hooks/useSoulAuditSubmit'
import { MAX_AUDITS_PER_CYCLE } from '@/lib/soul-audit/constants'
import { typographer } from '@/lib/typographer'
import { ALL_SERIES_ORDER, FEATURED_SERIES } from '@/data/series'

/**
 * Homepage TODAY content (founder direction 2026-05-08): use the
 * existing "What Is the Gospel?" Day 1 devotional as a static feature
 * until the Bible-365 plan is fully written. Daily rotation across
 * Bible-365 days is queued for after content fills in.
 */
const HOMEPAGE_TODAY = {
  slug: 'what-is-the-gospel-day-1',
  series: 'what-is-the-gospel',
  // Audit T4 (HOMEPAGE-AUDIT-2026-05-11): drop the "TODAY" kicker until
  // daily rotation actually ships. Calling it FEATURED stops promising
  // a daily heartbeat the product doesn't deliver yet.
  kicker: 'FEATURED · WHAT IS THE GOSPEL? · DAY 1',
  title: 'A Voice in the Wilderness',
  scripture: 'Mark 1:1, 3',
  teaser:
    'The beginning of the good news about Jesus the Messiah — a voice calling in the wilderness, “Prepare the way for the Lord.”',
  // Founder direction 2026-05-12: "use something like heaven or clouds
  // for the image not the shepherd. needs to be header width."
  // Frederic Edwin Church, "Twilight in the Wilderness" (1860) — a
  // luminist painting of a dramatic, glowing sky over wilderness.
  // Literal heaven/cloud imagery + classical art register (not stock
  // photography). 1200x750, ~1.6:1 landscape, served full-width as
  // the page header banner. Sourced from archive/devotional-prints/.
  heroSrc: '/images/site/homepage/hero/header-v2.webp',
  // Founder direction 2026-05-13 (correction): the featured devotional
  // card next to "A Voice in the Wilderness" should NOT reuse the wide
  // banner — it should use the series' own hero image. The
  // what-is-the-gospel series image is a 1248×832 landscape.
  featuredArt: '/images/site/series/what-is-the-gospel.webp',
}

const HOW_STEPS = [
  {
    title: '1. Name it.',
    body: 'Name what is real without polishing it. Honest words are enough.',
    image: '/images/site/homepage/steps/step-1-name.webp',
  },
  {
    title: '2. Read it.',
    body: 'See three plans matched to what you said. Choose one.',
    image: '/images/site/homepage/steps/step-2-read.webp',
  },
  {
    title: '3. Walk it out.',
    body: 'Read your 7-day plan. Take one honest step a day.',
    image: '/images/site/homepage/steps/step-3-walk.webp',
  },
]

/**
 * Homepage hero — static for now (no rotation). Per founder direction
 * 2026-05-08: pin TODAY content to "what-is-the-gospel-day-1" until
 * the Bible-365 plan is fully written. Daily rotation queued for after
 * content fills in. Hero art uses the obj-* sandals-style aesthetic
 * (single-ink object photography) — see HOMEPAGE_TODAY.heroSrc.
 */
function pickHomepageHero(): string {
  return HOMEPAGE_TODAY.heroSrc
}

const FAQ_ITEMS = [
  {
    question: 'What if I am skeptical or feel spiritually numb?',
    answer:
      'This is built for honest questions and earnest searching. Start exactly where you are.',
  },
  {
    question: 'How much time do I need each day?',
    answer:
      'Most days are 5-7 minutes. Long enough to matter, short enough to sustain.',
  },
  {
    question: 'Do I need to sign up first?',
    answer: 'No account required. Start immediately with a custom 7-day plan.',
  },
  {
    question: 'What if I miss a day?',
    answer:
      'No guilt loop. Return the next day and continue your path with the same clarity.',
  },
]

export default function Home() {
  const router = useRouter()
  const {
    text: auditText,
    setText: setAuditText,
    isSubmitting,
    error,
    setError,
    lastFailedSubmission,
    submit: submitAudit,
    reset: handleResetAudit,
    hydrated,
    auditCount,
    limitReached,
    showLowContextHint,
  } = useSoulAuditSubmit()

  const [faqIndex, setFaqIndex] = useState(0)
  const [activeFaqQuestion, setActiveFaqQuestion] = useState<string | null>(
    null,
  )
  // Auto-rotate highlight across desktop FAQ row. Hover overrides the
  // highlight to the card under cursor; releasing hover resumes rotation.
  // First card (index 0 of the visible window) starts highlighted.
  const [faqAutoIndex, setFaqAutoIndex] = useState(0)
  const [faqHoverIndex, setFaqHoverIndex] = useState<number | null>(null)
  const [resumeRoute, setResumeRoute] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const featuredSlugs = useMemo(() => {
    const seeded = [...FEATURED_SERIES, ...ALL_SERIES_ORDER]
    const deduped = Array.from(new Set(seeded))
    return deduped.slice(0, 6)
  }, [])
  const faqWindow = useMemo(
    () =>
      [0, 1, 2].map(
        (offset) => FAQ_ITEMS[(faqIndex + offset) % FAQ_ITEMS.length],
      ),
    [faqIndex],
  )
  const faqItemsToRender = isMobileViewport ? FAQ_ITEMS : faqWindow

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const hasAuthCallbackParams =
      params.has('code') || params.has('token_hash') || params.has('type')

    if (!hasAuthCallbackParams) return

    const query = params.toString()
    router.replace(`/auth/callback${query ? `?${query}` : ''}`)
  }, [router])

  useEffect(() => {
    if (!isMobileViewport) {
      setActiveFaqQuestion(null)
    }
  }, [isMobileViewport])

  // Auto-rotate FAQ highlight every 4s on desktop. Pause while hovered.
  useEffect(() => {
    if (isMobileViewport) return
    if (faqHoverIndex !== null) return
    const id = window.setInterval(() => {
      setFaqAutoIndex((prev) => (prev + 1) % 3)
    }, 4000)
    return () => window.clearInterval(id)
  }, [isMobileViewport, faqHoverIndex])

  useEffect(() => {
    let cancelled = false

    async function resolveCurrentHome() {
      try {
        const response = await fetch('/api/soul-audit/current', {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Current route unavailable.')

        const payload = (await response.json()) as {
          hasCurrent?: boolean
          route?: string
        }
        if (cancelled) return

        if (
          payload.hasCurrent &&
          typeof payload.route === 'string' &&
          payload.route !== '/'
        ) {
          setResumeRoute(payload.route)
        } else {
          setResumeRoute(null)
          localStorage.removeItem('soul-audit-selection-v2')
        }
      } catch {
        if (cancelled) return
        setResumeRoute(null)
      }
    }

    void resolveCurrentHome()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Defensive reset in case mobile menu state from another route left scroll locked.
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 900px)')
    const syncViewport = () => setIsMobileViewport(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  // Schema.org JSON-LD: declare the site (with sitelinks search box)
  // and surface the on-page FAQ as structured data so search engines
  // can render rich results. Static — does not depend on hydration.
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Euangelion',
    url: 'https://euangelion.app',
    description:
      'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://euangelion.app/series?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  // Audit T15 — Organization schema gives Google + AI search a clean
  // entity for "Euangelion." sameAs intentionally empty until the
  // founder confirms canonical social handles.
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Euangelion',
    url: 'https://euangelion.app',
    logo: 'https://euangelion.app/icons/icon-512.png',
    description:
      'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
    sameAs: [] as string[],
    foundingDate: '2026',
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <div className="mock-home mock-homepage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main id="main-content" className="mock-paper">
        {/* Audit T3: stable, screen-reader-only H1 anchors page identity
            for search engines. The visible H2 below is the daily devotional
            title, which is a rotating field. */}
        <h1 className="sr-only">
          Euangelion — A daily newspaper of the Gospel
        </h1>
        <EuangelionShellHeader />

        {/* TODAY hero — Bible-365 daily devotional surface (per founder
            redesign 2026-05-08 + BrandBrain "homepage daily devotional"
            spec). Active-plan resume banner takes precedence when present. */}
        {resumeRoute && (
          <section
            className="homepage-resume-banner"
            aria-label="Your active devotional plan"
          >
            <p className="text-label mock-kicker">YOUR PLAN</p>
            <p className="mock-body">
              You have a devotional waiting. Pick up where you left off.
            </p>
            <Link
              href={resumeRoute}
              className="mock-btn mock-btn-inline text-label"
            >
              CONTINUE MY DEVOTIONAL
            </Link>
          </section>
        )}

        {/* Founder direction 2026-05-13: split the prior single hero
            into three blocks — full-bleed banner image, a "What is
            this place?" intro section, then the featured devotional
            with image-left / text-right (2/3 + 1/3). */}
        <section
          className="homepage-hero-banner"
          aria-label="Euangelion home banner"
        >
          <div className="homepage-hero-banner-art">
            <Image
              src={pickHomepageHero()}
              alt={`Illustration accompanying ${HOMEPAGE_TODAY.title}`}
              fill
              sizes="100vw"
              priority
            />
          </div>
        </section>

        <section
          className="homepage-what-is-this"
          aria-label="What is this place?"
        >
          <p className="text-label mock-kicker">WHAT IS THIS PLACE?</p>
          <h2 className="mock-title-center">
            A daily newspaper of the Gospel.
          </h2>
          <p className="mock-subcopy-center">
            {typographer(
              "Five-to-seven minutes a day. Ancient wisdom, modern design, no engagement bait. Whatever you're carrying, there's a passage already waiting for it.",
            )}
          </p>
        </section>

        <section
          className="homepage-featured-devotional"
          id="today-devotional"
          aria-label="Today's featured devotional"
        >
          <div className="homepage-featured-devotional-art">
            <Image
              src={HOMEPAGE_TODAY.featuredArt}
              alt={`Illustration accompanying ${HOMEPAGE_TODAY.title}`}
              fill
              sizes="(max-width: 900px) 100vw, 66vw"
            />
          </div>

          <div className="homepage-featured-devotional-main">
            <p className="text-label mock-kicker">{HOMEPAGE_TODAY.kicker}</p>
            <p
              className="text-label"
              style={{ opacity: 0.7, margin: '0 0 0.2rem' }}
            >
              {HOMEPAGE_TODAY.scripture}
            </p>
            {/* Audit T3: demoted from H1 to H2. The stable H1 lives at
                the top of <main> (screen-reader-only). */}
            <h2 className="mock-title mock-homepage-prompt-title">
              {typographer(HOMEPAGE_TODAY.title)}
            </h2>
            <p className="mock-subcopy">{typographer(HOMEPAGE_TODAY.teaser)}</p>

            <Link
              href={`/devotional/${HOMEPAGE_TODAY.slug}`}
              className="mock-btn mock-btn-inline text-label"
            >
              BEGIN THIS DEVOTIONAL
            </Link>
            <Link
              href="/series/bible-365"
              className="text-label homepage-bible365-browse-link"
            >
              Or browse the 365-day plan →
            </Link>
          </div>
        </section>

        {/* Trust signal row */}
        <section className="homepage-trust-row" aria-label="Quick reassurance">
          <p className="text-label">
            FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY
          </p>
        </section>

        {/* Audit Manus §2 (Updated 2026-05-13): prior copy read like
            navigation ("Seven questions for the searching"). Audit
            wanted EDITORIAL TEASERS — a reason to click *today*.
            Cards now lead with specific headlines from inside each
            section. */}
        <section
          className="homepage-section-index"
          aria-label="Sections of the paper"
        >
          <Link href="/wake-up" className="homepage-section-card">
            <p className="text-label vw-small text-gold">WAKE-UP</p>
            <p className="vw-body">
              Identity Crisis · Too Busy for God · Why Jesus?
            </p>
            <p className="vw-small text-secondary">
              Seven honest 5-day paths for the searching. Editor&rsquo;s pick
              today: Identity Crisis.
            </p>
          </Link>
          <Link href="/series/bible-365" className="homepage-section-card">
            <p className="text-label vw-small text-gold">BIBLE 365</p>
            <p className="vw-body">
              The throughline of Scripture, one day at a time.
            </p>
            <p className="vw-small text-secondary">
              Genesis, Mark, Psalms — every day stands alone. Hop in today; the
              thread holds.
            </p>
          </Link>
          <Link href="/series" className="homepage-section-card">
            <p className="text-label vw-small text-gold">ALL SERIES</p>
            <p className="vw-body">
              32 paths through what people actually carry.
            </p>
            <p className="vw-small text-secondary">
              Anxiety · doubt · grief · the daily grind · the question of Jesus.
            </p>
          </Link>
        </section>

        {/* Audit Manus §2 — Zone 2 Featured Series rail moved UP so the
            strongest headlines on the site (Identity Crisis, Too Busy
            for God, Why Jesus?) sit above the Soul Audit / How-It-Works
            block, not buried below it. */}
        <SeriesRailSection
          label="Featured Series"
          subtitle="Plans for what people actually wrestle with."
          slugs={featuredSlugs}
          layout="rail"
          cardVariant="large"
        />

        <section className="mock-more-row mock-series-more-row">
          <Link href="/series" className="mock-btn text-label">
            BROWSE EVERY PLAN
          </Link>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
        </section>

        {/* Audit T6 — Editorial colophon trust strip. Now sits between
            Zone 2 (Section Index + Featured Series) and Zone 3 (Soul
            Audit + How-It-Works + FAQ). Editorial form, no metric
            numbers, no SaaS testimonials. */}
        <section className="homepage-trust-row" aria-label="What grounds this">
          <p className="text-label">
            ANCHORED IN THE APOSTLES&rsquo; AND NICENE CREEDS · VOICES FROM
            AUGUSTINE, À KEMPIS, SPURGEON, TOZER, AND MORE
          </p>
        </section>

        {/* Audit Manus §2 — Zone 3 Invitation. Soul Audit moved BELOW
            the Section Index per the audit's three-zone model. It's a
            tool, not the headline. */}
        <section className="homepage-soul-audit" id="start-audit">
          <p className="text-label mock-kicker">SOUL AUDIT</p>
          <h2 className="mock-title mock-homepage-prompt-title">
            Or — start where you actually are.
          </h2>
          <p className="mock-subcopy">
            {typographer(
              "Tell us what's actually going on. We'll match you to a 7-day path.",
            )}
          </p>

          <textarea
            value={auditText}
            onChange={(e) => {
              setAuditText(e.target.value)
              setError(null)
            }}
            placeholder="What are you wrestling with?"
            rows={3}
            disabled={isSubmitting}
            className="mock-textarea"
            aria-label="What are you wrestling with?"
          />

          {/* Sample prompt pills */}
          <div className="homepage-prompt-pills">
            {[
              'I feel anxious about my future',
              'I\u2019m doubting everything I thought I believed',
              'I keep falling into the same sin',
              'I don\u2019t know what I believe',
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                className="homepage-prompt-pill text-label"
                onClick={() => {
                  setAuditText(pill)
                  setError(null)
                }}
                disabled={isSubmitting}
              >
                {pill}
              </button>
            ))}
          </div>

          {showLowContextHint && (
            <p className="mock-footnote">
              Add one more sentence for more precise curation.
            </p>
          )}

          <button
            type="button"
            className="mock-btn mock-btn-inline text-label"
            onClick={() => void submitAudit(auditText)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'BUILDING YOUR PLAN...' : 'GET MATCHED'}
          </button>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
          {hydrated && auditCount > 0 && !limitReached && (
            <p className="mock-footnote">
              Audit {auditCount + 1} of {MAX_AUDITS_PER_CYCLE}
            </p>
          )}
          {hydrated && limitReached && (
            <p className="mock-footnote">
              All {MAX_AUDITS_PER_CYCLE} audits used. Reset to start fresh.
            </p>
          )}
          {hydrated && auditCount > 0 && (
            <button
              type="button"
              className="mock-reset-btn text-label"
              onClick={() => void handleResetAudit()}
            >
              Start a new audit
            </button>
          )}
          {error && <p className="mock-error">{error}</p>}
          {lastFailedSubmission && !isSubmitting && (
            <button
              type="button"
              className="mock-reset-btn text-label"
              onClick={() => void submitAudit(lastFailedSubmission)}
            >
              Retry Last Submit
            </button>
          )}
        </section>

        <section className="homepage-howitworks">
          <p className="text-label mock-kicker">HERE&rsquo;S HOW IT WORKS</p>
          <h2 className="mock-title-center">
            Three steps. Five minutes a day.
          </h2>
          <p className="mock-subcopy-center">
            Honest input. Focused output that meets where you are.
          </p>
        </section>

        <section className="mock-steps-grid homepage-howitworks-grid">
          {HOW_STEPS.map((step) => {
            // Strip the leading "1. " from the title to produce a clean alt.
            const altText = step.title
              .replace(/^\d+\.\s*/, '')
              .replace(/\.$/, '')
            return (
              <article key={step.title} className="mock-step-card">
                <div className="mock-step-image-wrap">
                  <div className="mock-step-image">
                    <Image
                      src={step.image}
                      alt={altText}
                      fill
                      sizes="(max-width: 900px) 100vw, 320px"
                    />
                  </div>
                </div>
                <div className="mock-step-copy">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mock-faq-row">
          <article className="mock-faq-lead">
            <h3>
              {isMobileViewport ? 'Before you begin.' : 'Before you begin.'}
            </h3>
            <p>
              {isMobileViewport
                ? 'Honest answers, no pressure.'
                : 'Honest answers, no pressure.'}
            </p>
          </article>

          {!isMobileViewport && (
            <button
              type="button"
              className="mock-arrow"
              aria-label="Previous question"
              onClick={() =>
                setFaqIndex(
                  (prev) => (prev - 1 + FAQ_ITEMS.length) % FAQ_ITEMS.length,
                )
              }
            >
              &lt;
            </button>
          )}

          {faqItemsToRender.map((item, idx) => {
            const cardId = `faq-card-${idx}`
            const answerId = `faq-answer-${idx}`
            const isActive =
              isMobileViewport && activeFaqQuestion === item.question

            if (isMobileViewport) {
              return (
                <button
                  type="button"
                  key={`${item.question}-${idx}`}
                  id={cardId}
                  className={`mock-faq-card ${isActive ? 'is-active' : ''}`}
                  aria-expanded={isActive}
                  aria-controls={answerId}
                  onClick={() =>
                    setActiveFaqQuestion((previous) =>
                      previous === item.question ? null : item.question,
                    )
                  }
                >
                  <p className="mock-faq-question">{item.question}</p>
                  <p id={answerId} className="mock-faq-answer">
                    {item.answer}
                  </p>
                </button>
              )
            }

            // Desktop: auto-rotate highlight across the 3 visible cards.
            // Hover takes precedence — when the user hovers any card, that
            // one is highlighted instead. Releasing hover resumes rotation.
            const highlightIdx = faqHoverIndex ?? faqAutoIndex
            const isHighlighted = idx === highlightIdx
            return (
              <button
                type="button"
                key={`${item.question}-${idx}`}
                id={cardId}
                className={`mock-faq-card ${isHighlighted ? 'is-active' : ''}`}
                aria-expanded={isHighlighted}
                aria-controls={answerId}
                onMouseEnter={() => setFaqHoverIndex(idx)}
                onMouseLeave={() => setFaqHoverIndex(null)}
                onFocus={() => setFaqHoverIndex(idx)}
                onBlur={() => setFaqHoverIndex(null)}
              >
                <p className="mock-faq-question">{item.question}</p>
                <p id={answerId} className="mock-faq-answer">
                  {item.answer}
                </p>
              </button>
            )
          })}

          {!isMobileViewport && (
            <button
              type="button"
              className="mock-arrow"
              aria-label="Next question"
              onClick={() =>
                setFaqIndex((prev) => (prev + 1) % FAQ_ITEMS.length)
              }
            >
              &gt;
            </button>
          )}
        </section>
        <section className="mock-more-row">
          <Link href="/help#faq" className="mock-btn text-label">
            VIEW FULL FAQ
          </Link>
        </section>

        {/* Bottom CTA — link to hero rather than duplicate textarea */}
        <section className="mock-cta">
          <p className="text-label mock-kicker">READY TO BEGIN?</p>
          {resumeRoute ? (
            <>
              <h2 className="mock-cta-headline">
                Your devotional is ready to continue.
              </h2>
              <p className="mock-subcopy-center">
                Jump back into your current day and keep your rhythm.
              </p>
              <Link href={resumeRoute} className="mock-btn text-label">
                CONTINUE MY DEVOTIONAL
              </Link>
            </>
          ) : (
            <>
              {/* Audit Manus §2 (Updated 2026-05-13): the closing CTA
                  used to funnel to the Soul Audit tool. Now the primary
                  invitation is to READ — the Soul Audit is a quiet
                  secondary link for readers who want a personalized
                  path. */}
              <h2 className="mock-cta-headline">
                Start with one honest sentence — or with today&rsquo;s page.
              </h2>
              <p className="mock-subcopy-center">
                You do not need certainty before you begin. You need a next
                step. You need grace.
              </p>
              <Link
                href={`/devotional/${HOMEPAGE_TODAY.slug}`}
                className="mock-btn text-label"
              >
                READ TODAY&rsquo;S DEVOTIONAL
              </Link>
              <a
                href="#start-audit"
                className="text-label vw-small"
                style={{
                  display: 'inline-block',
                  marginTop: '0.75rem',
                  opacity: 0.78,
                }}
              >
                Or — start the Soul Audit →
              </a>
            </>
          )}
        </section>

        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
