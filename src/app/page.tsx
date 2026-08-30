'use client'

import { useEffect, useMemo, useState } from 'react'
import AUDIO_MANIFEST from '@/data/audio-manifest.json'
import { useAudioStore } from '@/stores/audioStore'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import FirstRunIntro from '@/components/FirstRunIntro'
import SiteBottom from '@/components/SiteBottom'
import ChurchYearOverline from '@/components/devotional/ChurchYearOverline'
import SeriesRailSection from '@/components/SeriesRailSection'
import CrisisInterstitial from '@/components/soul-audit/CrisisInterstitial'
import ComposingPaths from '@/components/soul-audit/ComposingPaths'
import { useSoulAuditSubmit } from '@/hooks/useSoulAuditSubmit'
import { CRISIS_RESOURCES } from '@/lib/soul-audit/crisis-gate'
import { typographer } from '@/lib/typographer'
import { SERIES_COUNT } from '@/data/series'
import { HERO_ROTATION, heroDrawScript } from '@/lib/home/hero-rotation'
import { featuredForServer, rotateFeatured } from '@/lib/home/featured-rotation'
import { isScrollLocked } from '@/lib/use-scroll-lock'

/**
 * Homepage featured SERIES content. Founder direction 2026-05-13: the
 * featured slot now surfaces the SERIES as a whole, not an individual
 * devotional. Title is the series title; copy is the series question
 * + a beat of introduction; CTA opens the series page (where the
 * reader sees all days and starts). Day-level data lives in
 * `daySlug` / `dayTitle` only as fallback context.
 */
// SA-031 (founder, 2026-07-26): the main feature slot always belongs
// to the MOST RECENT series. SA-034 (2026-08-10): he-cannot-deny-himself
// replaces the-harvest, which rotates back into the six FEATURED_SERIES
// cards below it.
const HOMEPAGE_TODAY = {
  series: 'drawing-near',
  daySlug: 'drawing-near-day-1',
  dayTitle: 'Crowned, And Hiding',
  kicker: 'FEATURED SERIES · 7 DAYS · HEBREWS 10:19',
  title: 'Drawing Near',
  // Series-level scripture anchor (the framework verse).
  scripture: 'Hebrews 10:19-22 · Genesis 3:24 · Leviticus 17:11',
  // Surfaces the series QUESTION (what the reader actually carries),
  // then one beat of the introduction. Series-level copy, not Day 1's.
  // Founder 2026-08-16: "the text on the right should not have soo much —
  // 10-14 words max." A featured slot is a headline and a line, not a
  // paragraph; the full introduction is one tap away on the series page.
  teaser:
    'Far off, made nigh. Seven days on the way that was opened from the other side.',
  // Homepage hero banner (full-bleed at top of page). SA-113
  // (2026-08-20) supersedes R38: the banner now ROTATES per page load
  // across seven gospel plates (HERO_ROTATION below). heroSrc stays
  // pointed at the tomb — it is the JS-off/noscript fallback plate.
  heroSrc: '/images/site/homepage/hero/header-v2.webp',
  // Featured-card art: the all-these-things series master, which is already a
  // 3:2 landscape crop and so matches the container's landscape aspect (the
  // 1:1 series card would crop badly under object-fit: cover).
  featuredArt: '/images/site/series/drawing-near.webp',
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

// Homepage hero rotation (SA-113 / F-159): plates + parse-time draw script
// live in src/lib/home/hero-rotation.ts — the draw sets a CSS custom
// property on <html>, outside React's reconciliation, because this page is
// a hydrated client component and DOM built inside it gets reset on a
// client re-render (the first implementation blanked the banner that way).
/** Narrated hours, from the manifest — stated rather than rounded by hand, so
 *  the claim on the homepage cannot drift from what actually renders. */
const AUDIO_HOURS = Math.round(
  Object.values(AUDIO_MANIFEST as Record<string, { duration?: number }>).reduce(
    (total, track) => total + (track.duration ?? 0),
    0,
  ) / 3600,
)

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
  const setAudioPanelOpen = useAudioStore((s) => s.setPanelOpen)
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
    crisisText,
    dismissCrisisAndContinue,
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

  // Founder 2026-08-14: "New series in the features each refresh, except the
  // latest uploaded should always be the first shown on homepage." / "Each
  // page refresh."
  //
  // The first render MUST be the deterministic set: this page is edge-cached
  // for a year, so a rotation computed during render would be frozen into the
  // cached HTML, and any Math.random() in render is a hydration mismatch. The
  // effect below reshuffles the tail once, on the client, after hydration.
  // The lead — the newest eligible series — never moves.
  const [featuredSlugs, setFeaturedSlugs] = useState<string[]>(() =>
    featuredForServer(),
  )

  useEffect(() => {
    setFeaturedSlugs(rotateFeatured())
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
    // Defensive reset in case an earlier route left the page locked.
    //
    // Guarded on the shared lock depth (backlog #59): this used to clear
    // overflow unconditionally on mount, so navigating home while any overlay
    // legitimately held the lock silently unlocked the page underneath it. It
    // now only clears a lock that nothing owns — which is the stale state it
    // was written to catch, and nothing else.
    if (!isScrollLocked()) document.body.style.overflow = ''
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
      // F-071: the advertised search target is now real. The shell
      // header (rendered on every route) reads ?search= and opens the
      // global search overlay pre-filled — previously this pointed at
      // /series?q=, which no page ever handled.
      '@type': 'SearchAction',
      target: 'https://euangelion.app/?search={search_term_string}',
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
      {/* Crisis interstitial — shown before any network call when gate fires */}
      {crisisText !== null && (
        <CrisisInterstitial
          resources={CRISIS_RESOURCES}
          onContinue={() => void dismissCrisisAndContinue()}
        />
      )}
      {/* F-065 — anonymous first-run introduction. Homepage only, so a
          deep-linked devotional is never blocked; the component itself
          gates on anonymous + genuinely-first visit. */}
      <FirstRunIntro />
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

        {/* Founder direction 2026-08-14: the church-year line was removed from
            every devotional (it bogged down the reading) and belongs here
            instead — on the home page, unobtrusively. One quiet line under the
            masthead, above the banner: present for anyone who keeps the
            calendar, invisible to anyone who doesn't. SA-037 / F-088. */}
        <section
          className="homepage-church-year text-label"
          aria-label="Today in the church year"
        >
          <ChurchYearOverline />
        </section>

        {/* Founder direction 2026-05-13: split the prior single hero
            into three blocks — full-bleed banner image, a "What is
            this place?" intro section, then the featured devotional
            with image-left / text-right (2/3 + 1/3). */}
        <section
          className="homepage-hero-banner"
          aria-label="Euangelion home banner"
        >
          {/* Parse-time draw (SA-113): the script runs synchronously as
              the parser reaches it and puts the chosen plate on <html> as
              --hero-rot, plus a fetchpriority=high preload for the LCP
              contract. The banner div below is static markup that paints
              the variable as its background (globals.css), with the tomb
              as the CSS fallback for JS-off readers — nothing here for
              hydration to reconcile away, and no render-time randomness
              to freeze into the year-long edge cache (see the featured
              rotation note above). */}
          <script
            dangerouslySetInnerHTML={{
              __html: heroDrawScript(HERO_ROTATION),
            }}
          />
          <div className="homepage-hero-banner-art" />
        </section>

        {/* Active-plan resume banner — sits BELOW the hero image (founder
            direction 2026-06-20): a returning reader's "continue" prompt
            comes after the header image, not above it. */}
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

        <section
          data-reveal
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

        {/* Trust signal row — founder direction 2026-05-13: sits right
            after "What is this place?" so first-time visitors see the
            no-friction promise before being offered any plan. */}
        <section className="homepage-trust-row" aria-label="Quick reassurance">
          <p className="text-label">
            FREE · NO ACCOUNT · 5–7 MIN A DAY · START ANY DAY
          </p>
        </section>

        {/* Phase 1.4 — Homepage consolidation. A single clear action
            ladder replaces the prior three equal-weight "starter" cards.
            ONE dominant entry (Today's reading), then a quieter secondary
            (Soul Audit), then a tertiary (Browse the library). No two
            CTAs of equal visual weight compete here. */}
        <section className="homepage-action-ladder" aria-label="Where to begin">
          {/* PRIMARY — the one-tap entry.

              POINTS AT /daily-bread, NOT /today. `/today` is the signed-in
              plan reader and hard-redirects to /auth/sign-in, while the copy
              directly below promises "No setup, no account — just open it and
              read" and the trust row says NO ACCOUNT. The dominant conversion
              path on the site was bouncing first-time anonymous readers into a
              sign-in wall. /daily-bread is the public edition and is exactly
              what this copy describes. (The /today swap was applied to the
              programmatic router.push calls and missed on these Links.) */}
          <div className="homepage-primary-action">
            <p className="text-label mock-kicker">START HERE</p>
            <h2 className="mock-title-center">Read today&rsquo;s page.</h2>
            <p className="mock-subcopy-center">
              One passage, chosen for today. No setup, no account — just open it
              and read.
            </p>
            <Link
              href="/daily-bread"
              className="mock-btn homepage-primary-cta text-label"
            >
              READ TODAY&rsquo;S PAGE
            </Link>
          </div>

          {/* SECONDARY + TERTIARY — quieter alternatives, set as a pair
              below the primary so neither rivals it. Soul Audit is the
              personalized path; the library is the browse-everything door. */}
          <div className="homepage-secondary-actions">
            <Link
              href="/soul-audit"
              className="homepage-action-card homepage-action-card-secondary"
            >
              <p className="text-label vw-small">SOUL AUDIT</p>
              <p className="vw-body">What are you wrestling with today?</p>
              <p className="vw-small text-secondary">
                One honest sentence becomes a personalized seven-day plan.
              </p>
            </Link>
            <Link href="/series" className="homepage-action-card">
              <p className="text-label vw-small">BROWSE ALL SERIES</p>
              <p className="vw-body">
                {SERIES_COUNT} plans through what people carry.
              </p>
              <p className="vw-small text-secondary">
                Anxiety · doubt · grief · the daily grind · the question of
                Jesus.
              </p>
            </Link>
          </div>
        </section>

        {/* The front door for someone with no church background at all.
            Deliberately NOT a fourth card in the action ladder above — that
            section documents a no-competing-CTAs rule, and this is a different
            species: a standalone scroll experience, not a reading entry. Given
            its own full-bleed band so it reads as a doorway, not a rival. */}
        <section
          className="homepage-doorway"
          aria-labelledby="homepage-doorway-heading"
        >
          <div className="homepage-doorway-inner">
            <p className="text-label mock-kicker">NEW TO ALL OF THIS?</p>
            <h2
              id="homepage-doorway-heading"
              className="homepage-doorway-title"
            >
              You have heard the words <em>God</em> and <em>Jesus</em>.
            </h2>
            <p className="homepage-doorway-copy">
              An introduction that assumes nothing — the names of God in Hebrew,
              what the Bible actually is, why Jesus, and what salvation means.
              No church background, no jargon, nothing you have to agree to.
            </p>
            <Link
              href="/who-is-god"
              className="homepage-doorway-link text-label"
            >
              START AT THE BEGINNING &rarr;
            </Link>
          </div>
        </section>

        {/* SA-107 — the audio callout.
            Audio was tucked deliberately (the drawer is a handle, not a bar),
            and tucked with no announcement is just hidden. This is the one
            place the site says out loud that it can be listened to, and it
            leads with the occasion rather than the feature: what a listener
            wants to know is that this works while their hands are busy. */}
        <section className="homepage-audio-callout" aria-label="Listen">
          <p className="text-label mock-kicker">ALSO A LISTENING APP</p>
          <h2 className="homepage-audio-title">
            Hands full? It reads itself to you.
          </h2>
          <p className="homepage-audio-copy">
            Every reading is narrated — {AUDIO_HOURS} hours of it, from a
            two-minute prayer to the whole year in Scripture. Queue a series for
            the commute, save it for the flight, and pick up where you stopped
            on any device.
          </p>
          <div className="homepage-audio-actions">
            {/* Opens the audio sidebar rather than navigating. Discovery used
                to sit above the series shelves and the founder called that
                placement intrusive, so it moved into audio's own area — which
                means this is now the way in. */}
            <button
              type="button"
              className="mock-btn text-label"
              onClick={() => setAudioPanelOpen(true)}
            >
              FIND SOMETHING TO LISTEN TO
            </button>
            <Link href="/library" className="text-label homepage-audio-link">
              Your queue &rarr;
            </Link>
          </div>
        </section>

        <section
          className="homepage-featured-devotional"
          id="today-devotional"
          aria-label="Today's featured devotional"
        >
          <div
            className="homepage-featured-devotional-art"
            data-parallax="0.55"
          >
            <Image
              src={HOMEPAGE_TODAY.featuredArt}
              alt={`Illustration accompanying ${HOMEPAGE_TODAY.title}`}
              fill
              priority
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
              href={`/series/${HOMEPAGE_TODAY.series}`}
              className="mock-btn mock-btn-inline text-label"
            >
              BEGIN THIS SERIES
            </Link>
            {/* The Bible-365 secondary link was cut 2026-08-16 (founder:
                "The CTA to the Bible 365 should be removed."). The featured
                slot now makes one offer instead of two — Bible 365 is still
                one tap away in Series. */}
          </div>
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

        {/* Phase 1.4: demoted from a full mock-btn to a quiet "see all"
            link so the rail's browse affordance doesn't compete as a
            third primary CTA. The library is already the tertiary action
            in the top action ladder. */}
        <section className="mock-more-row mock-series-more-row">
          <Link href="/series" className="homepage-see-all-link text-label">
            Browse every plan →
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
            A 7-day plan, written for what you actually carry.
          </h2>
          <p className="mock-subcopy">
            {typographer(
              "Tell us — in one honest sentence — what you're wrestling with. The Soul Audit reads that, then assembles a personalized seven-day path: real scripture, ancient voices, no canned answers, no signup, no engagement bait. About three minutes to set up; five to seven minutes a day to walk.",
            )}
          </p>

          {/* While the options compose is in flight, swap the input cluster
              for the SAME Phase A "Building your paths..." gather-dots loader
              the standalone /soul-audit page shows — so submitting here is no
              longer an abrupt button-label change. The kicker/title/subcopy
              above stay put; only the interactive body swaps, which keeps the
              section height stable (no layout shift). After this completes the
              flow routes to /soul-audit/results, where Phase B ("SETTING YOUR
              EDITION") is already identical for both entry points. */}
          {isSubmitting ? (
            <ComposingPaths />
          ) : (
            <>
              <textarea
                value={auditText}
                onChange={(e) => {
                  setAuditText(e.target.value)
                  setError(null)
                }}
                placeholder="Lately, I've been..."
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                className="mock-textarea"
                aria-label="What are you wrestling with today?"
              />

              {/* Founder 2026-08-16: "remove the pills on the homepage version
                  as well." The four sample-prompt buttons that sat under the
                  field are gone — the placeholder already models what to
                  write, and the pills were answering the question for the
                  reader. */}

              {showLowContextHint && (
                <p className="mock-footnote">
                  Say a little more. Even one sentence helps.
                </p>
              )}

              <button
                type="button"
                className="mock-btn mock-btn-inline text-label"
                onClick={() => void submitAudit(auditText)}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                GET MATCHED
              </button>
              <p className="mock-footnote">
                Read to compose your edition, then kept with your anonymous
                session for 30 days and deleted — never sold, never shared,
                never used to train AI. No account required.
              </p>
              {/* No proactive "X of N" counter — it reads as a metered trial.
              The cap still applies; we only surface it once it's reached. */}
              {hydrated && limitReached && (
                <p className="mock-footnote">
                  You’ve explored a few directions already — start a fresh audit
                  whenever you’re ready.
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
            </>
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
              <article key={step.title} className="mock-step-card" data-reveal>
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

        {/* R40: Bottom CTA moved ABOVE the FAQ per founder direction.
            "Ready to begin" is the call-to-action; FAQ is supporting
            content that lives below it. */}
        <section className="mock-cta" data-reveal>
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
              {/* Phase 1.4: closing CTA reinforces the SAME primary
                  destination as the top-of-page action ladder — today's
                  page (/today). The Soul Audit stays a quiet secondary
                  link, not a competing button. */}
              <h2 className="mock-cta-headline">
                Start with today&rsquo;s page — or one honest sentence.
              </h2>
              <p className="mock-subcopy-center">
                You do not need certainty before you begin. You need a next
                step. You need grace.
              </p>
              {/* Same reason as the primary CTA above: public edition, not
                  the gated plan reader. */}
              <Link href="/daily-bread" className="mock-btn text-label">
                READ TODAY&rsquo;S PAGE
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

        {/* R41: FAQ now follows the CTA, so the framing shifts
            from "before you begin" (pre-decision) to "still
            wondering" (post-CTA reassurance for readers who
            haven't clicked through yet). */}
        <section className="mock-faq-row">
          <article className="mock-faq-lead">
            <h3>Still wondering?</h3>
            <p>The questions readers ask before they start.</p>
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

        {/* Outreach. Deliberately quiet — someone who needs it will read the
            whole page, and someone who does not should not have a crisis banner
            shouted at them. Founder direction 2026-08-24: "low on the homepage
            please. maybe under soul audit." Superseded 2026-08-30: "make
            Seeking Help GA the last thing in the home page." */}
        <section
          className="homepage-outreach"
          aria-labelledby="homepage-outreach-heading"
        >
          <p className="text-label mock-kicker">GEORGIA</p>
          <h2
            id="homepage-outreach-heading"
            className="homepage-outreach-title"
          >
            If what you need right now is a phone number, not a devotional.
          </h2>
          <p className="homepage-outreach-copy">
            We keep a checked list of Georgia help lines — crisis support, a bed
            tonight, food, rent and power, a doctor, a lawyer. Free, printable,
            no sign-up, and no requirement to believe anything.
          </p>
          <Link
            href="/seeking-help-georgia"
            className="homepage-outreach-link text-label"
          >
            Seeking help in Georgia →
          </Link>
        </section>

        <SiteBottom />
      </main>
    </div>
  )
}
