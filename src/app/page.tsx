'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import IllustrationFrame from '@/components/newspaper/IllustrationFrame'
import WordblockPanel from '@/components/newspaper/WordblockPanel'
import PrintRail from '@/components/newspaper/PrintRail'
import FaqHoverCard from '@/components/newspaper/FaqHoverCard'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import { GSAP as GSAP_CONFIG } from '@/lib/animation-config'
import { SERIES_DATA, FEATURED_SERIES, ALL_SERIES_ORDER } from '@/data/series'
import type { AuditMatch, SoulAuditResponse } from '@/types/soul-audit'

const emptySubscribe = () => () => {}
const NAV_MENU_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/soul-audit', label: 'Soul Audit' },
  { href: '/wake-up', label: 'Wake-Up' },
  { href: '/series', label: 'Series' },
  { href: '/settings', label: 'Setting' },
]
const AUDIT_PROMPTS = [
  "Lately, I've been...",
  'I feel stuck because...',
  "I believe, but I'm wrestling with...",
  'What I need from God right now is...',
]
const MASTHEAD_LETTERS = 'EUANGELION'.split('')

const NEWSPAPER_ILLUSTRATIONS = {
  hero: '/images/illustrations/euangelion-homepage-engraving-04.svg',
  flow: '/images/illustrations/euangelion-homepage-engraving-05.svg',
  featured: '/images/illustrations/euangelion-homepage-engraving-06.svg',
  faq: '/images/illustrations/euangelion-homepage-engraving-07.svg',
  cta: '/images/illustrations/euangelion-homepage-engraving-08.svg',
} as const

const FLOW_ILLUSTRATIONS = [
  '/images/illustrations/euangelion-homepage-engraving-09.svg',
  '/images/illustrations/euangelion-homepage-engraving-10.svg',
  '/images/illustrations/euangelion-homepage-engraving-11.svg',
]

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const TRUST_POINTS = [
  'No account required',
  '5-7 minutes per day',
  'Biblically grounded',
]

const FLOW_STEPS = [
  {
    id: '01',
    title: 'Name what you are carrying',
    body: 'Tell us what you are wrestling with and we will craft a focused 5-day plan for your exact season.',
  },
  {
    id: '02',
    title: 'Read one short devotional daily',
    body: 'Each day is designed to be doable and deep: scripture, reflection, prayer, and action.',
  },
  {
    id: '03',
    title: 'Build traction, not guilt',
    body: 'You get clear daily steps and optional series pathways for deeper follow-through.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'What if I am skeptical or spiritually numb?',
    answer:
      'This is built for honest questions, not polished church answers. You can start exactly where you are.',
  },
  {
    question: 'How much time do I need each day?',
    answer:
      'Most days are 5-7 minutes. Long enough to matter, short enough to sustain.',
  },
  {
    question: 'Do I need to sign up first?',
    answer:
      'No. You can run a soul audit and start reading immediately. Account features are optional.',
  },
]

function normalizeSoulAuditResponse(
  data: Partial<SoulAuditResponse>,
): SoulAuditResponse {
  const customPlan =
    data.customPlan &&
    Array.isArray(data.customPlan.days) &&
    data.customPlan.days.length > 0
      ? data.customPlan
      : data.customDevotional
        ? {
            title: 'Your Custom Plan',
            summary: 'A temporary plan crafted from what you shared.',
            generatedAt:
              data.customDevotional.generatedAt || new Date().toISOString(),
            days: [
              {
                day: 1,
                chiasticPosition: 'A' as const,
                title: data.customDevotional.title,
                scriptureReference: data.customDevotional.scriptureReference,
                scriptureText: data.customDevotional.scriptureText,
                reflection: data.customDevotional.reflection,
                prayer: data.customDevotional.prayer,
                nextStep: data.customDevotional.nextStep,
                journalPrompt: data.customDevotional.journalPrompt,
              },
            ],
          }
        : undefined

  return {
    crisis: Boolean(data.crisis),
    message: data.message,
    resources: data.resources,
    customPlan,
    customDevotional: data.customDevotional,
    matches: Array.isArray(data.matches)
      ? data.matches
      : data.match
        ? [
            data.match,
            ...((data.alternatives || []).map(
              (alt) =>
                ({
                  ...alt,
                  confidence: 0.7,
                  reasoning: '',
                }) as AuditMatch,
            ) || []),
          ].slice(0, 3)
        : [],
  }
}

export default function Home() {
  const pathname = usePathname()
  const [auditText, setAuditText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [navInMetaRail, setNavInMetaRail] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)
  const auditTextareaRef = useRef<HTMLTextAreaElement>(null)
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit } = useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const promptTimer = window.setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % AUDIT_PROMPTS.length)
    }, 4500)
    return () => window.clearInterval(promptTimer)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setNavInMetaRail(window.scrollY > 220)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName ?? ''
      const isFormTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.key === '/' && !isFormTarget) {
        event.preventDefault()
        auditTextareaRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const formattedNow = useMemo(
    () =>
      now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [now],
  )

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const activeAuditPrompt = AUDIT_PROMPTS[promptIndex]
  const auditWordCount = useMemo(
    () =>
      auditText.trim().length === 0
        ? 0
        : auditText.trim().split(/\s+/).filter(Boolean).length,
    [auditText],
  )
  const auditReadiness = Math.min(100, Math.round((auditWordCount / 32) * 100))

  const [auditResults, setAuditResults] = useState<SoulAuditResponse | null>(
    null,
  )

  async function handleAuditSubmit() {
    if (limitReached) {
      setError('You\u2019ve explored enough. Time to dive in.')
      return
    }

    const trimmed = auditText.trim()
    if (trimmed.length === 0) {
      setError('Take your time. When you\u2019re ready, just write what comes.')
      return
    }
    if (trimmed.length < 10) {
      setError('Say a little more. Even one sentence helps.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/soul-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            'Something broke. It\u2019s not you. We\u2019re working on it.',
        )
      }

      const data = (await res.json()) as Partial<SoulAuditResponse>
      const normalized = normalizeSoulAuditResponse(data)
      sessionStorage.setItem('soul-audit-result', JSON.stringify(normalized))

      setAuditResults(normalized)
      recordAudit(trimmed, normalized)

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="newspaper-home min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Euangelion',
            url: 'https://euangelion.app',
            description:
              'Daily bread for the cluttered, hungry soul. Christian devotional series for people who believe, used to believe, or want to believe.',
            publisher: {
              '@type': 'Organization',
              name: 'Euangelion',
              url: 'https://euangelion.app',
            },
          }),
        }}
      />

      <main id="main-content">
        <div className="home-meta-rail newspaper-subrule text-label vw-small text-muted">
          <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-3 px-4 py-2 md:px-[56px] lg:px-20">
            <span className="whitespace-nowrap">{formattedNow}</span>
            <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
              {navInMetaRail ? (
                <nav className="home-meta-nav flex max-w-full items-center gap-5 overflow-x-auto px-4">
                  {NAV_MENU_LINKS.map((link) => {
                    const active =
                      pathname === link.href ||
                      (link.href !== '/' && pathname.startsWith(link.href))
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`animated-underline whitespace-nowrap text-label vw-small transition-colors duration-200 ${
                          active
                            ? 'text-[var(--color-text-primary)]'
                            : 'text-muted'
                        }`}
                      >
                        {link.label.toUpperCase()}
                      </Link>
                    )
                  })}
                </nav>
              ) : (
                <span className="truncate text-center">
                  DAILY DEVOTIONAL AND HONEST REFLECTION
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="home-rail-theme text-label vw-small whitespace-nowrap border border-subtle px-3 py-1 transition-colors duration-200 hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
            </button>
          </div>
        </div>

        <header className="section-rule border-subtle border-b pb-8 pt-2 md:pb-10 md:pt-3">
          <div className="mx-auto max-w-[1720px] px-4 md:px-[56px] lg:px-20">
            <FadeIn delay={0.03}>
              <h1
                className="text-masthead relative left-1/2 mb-2 w-[calc(100vw-2rem)] -translate-x-1/2 cursor-default overflow-hidden text-left select-none md:w-[calc(100vw-7rem)] lg:w-[calc(100vw-10rem)]"
                style={{
                  fontSize: 'clamp(1.95rem, 9.2vw, 11rem)',
                  lineHeight: 0.82,
                  letterSpacing: '0.1em',
                }}
                aria-label="Euangelion"
              >
                <span className="masthead-fullwidth" aria-hidden="true">
                  {MASTHEAD_LETTERS.map((letter, index) => (
                    <span key={`${letter}-${index}`}>{letter}</span>
                  ))}
                </span>
              </h1>
              <div
                className={`home-nav-rail mt-1 transition-all duration-500 ${
                  navInMetaRail
                    ? 'md:pointer-events-none md:-translate-y-3 md:opacity-0'
                    : 'md:translate-y-0 md:opacity-100'
                }`}
              >
                <Navigation
                  variant="newspaper"
                  showSkipLink={false}
                  showThemeToggle={false}
                />
              </div>
            </FadeIn>

            <div className="newspaper-rule grid items-start gap-5 pt-4 md:grid-cols-12 md:gap-6">
              <div className="md:col-span-2">
                <FadeIn delay={0.04}>
                  <IllustrationFrame
                    src={NEWSPAPER_ILLUSTRATIONS.hero}
                    alt="Engraving-style devotional illustration"
                    effect="woodblock"
                    aspect="portrait"
                    priority
                    wordblock="WHAT IS THIS PLACE?"
                    caption="Daily devotional illustrations in a print-era visual language."
                  />
                </FadeIn>
              </div>

              <article className="md:col-span-5">
                <FadeIn delay={0.05}>
                  <p className="text-label vw-small mb-2 text-gold">
                    START HERE
                  </p>
                  <h2 className="vw-heading-lg mb-3 max-w-[18ch]">
                    {typographer('Find your next faithful step today.')}
                  </h2>
                  <p className="vw-body mb-5 max-w-[42ch] text-secondary type-prose">
                    {typographer(
                      'Run a short soul audit and receive a custom 5-day plan crafted for what you are carrying right now.',
                    )}
                  </p>
                </FadeIn>

                <FadeIn delay={0.08}>
                  <WordblockPanel
                    eyebrow="WORD AS ART"
                    title="Daily Devotional Desk."
                    body="Clear Scripture, honest reflection, and one faithful step that becomes momentum."
                    className="mb-5"
                  />
                </FadeIn>

                <FadeIn delay={0.12}>
                  <ul className="newspaper-subrule flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
                    {TRUST_POINTS.map((point) => (
                      <li
                        key={point}
                        className="vw-small flex items-center text-secondary"
                      >
                        <span className="mr-2 text-gold" aria-hidden="true">
                          •
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </article>

              <aside className="md:col-span-5">
                <FadeIn delay={0.18}>
                  <div id="start-audit" className="newspaper-card p-4 md:p-5">
                    <p className="text-label vw-small mb-2 text-gold">
                      SOUL AUDIT • FRONT PAGE
                    </p>
                    <h2 className="mb-2 text-[clamp(1.4rem,2.2vw,2.15rem)] leading-[1.15]">
                      {typographer('What are you wrestling with right now?')}
                    </h2>
                    <p className="vw-small mb-3 text-secondary type-prose">
                      {typographer(
                        'Write one honest paragraph and we will craft a focused 5-day devotional plan for this exact moment.',
                      )}
                    </p>

                    {limitReached ? (
                      <div className="text-center">
                        <p className="text-serif-italic vw-body mb-6 text-secondary">
                          {typographer(
                            'You\u2019ve explored enough. Time to dive in.',
                          )}
                        </p>
                        <Link
                          href="/series"
                          className="cta-major text-label vw-small inline-flex w-full px-8 py-3"
                        >
                          Browse All Series &rarr;
                        </Link>
                      </div>
                    ) : (
                      <>
                        {hydrated && auditCount > 0 && (
                          <p className="vw-small mb-4 text-center text-muted oldstyle-nums">
                            Audit {auditCount + 1} of 3
                          </p>
                        )}

                        <textarea
                          ref={auditTextareaRef}
                          value={auditText}
                          onChange={(e) => {
                            setAuditText(e.target.value)
                            setError(null)
                          }}
                          placeholder={activeAuditPrompt}
                          rows={3}
                          disabled={isSubmitting}
                          className="text-serif-italic vw-body mb-2 w-full resize-none border border-subtle p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-colors duration-200 focus:outline-none"
                          style={{
                            lineHeight: 1.7,
                            background:
                              'color-mix(in srgb, var(--color-bg) 78%, white)',
                          }}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              e.preventDefault()
                              void handleAuditSubmit()
                            }
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--color-gold)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--color-border)'
                          }}
                        />
                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="vw-small text-muted oldstyle-nums">
                              {auditWordCount} words
                            </p>
                            <p className="vw-small text-muted oldstyle-nums">
                              Readiness {auditReadiness}%
                            </p>
                          </div>
                          <div
                            className="h-1 w-full overflow-hidden"
                            style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${auditReadiness}%`,
                                background:
                                  'linear-gradient(90deg, var(--color-gold), color-mix(in srgb, var(--color-gold) 55%, var(--color-text-primary)))',
                              }}
                            />
                          </div>
                        </div>

                        {error && (
                          <p className="vw-small mb-4 text-center text-secondary">
                            {error}
                          </p>
                        )}

                        <button
                          onClick={handleAuditSubmit}
                          disabled={isSubmitting}
                          className="cta-major text-label vw-small w-full px-8 py-2.5 disabled:opacity-50"
                        >
                          {isSubmitting
                            ? 'Finding Your Match...'
                            : 'Get My Match'}
                        </button>

                        <p className="vw-small mt-3 text-center text-muted">
                          No account required. Press `/` to focus and `Cmd/Ctrl
                          + Enter` to submit.
                        </p>
                      </>
                    )}
                  </div>
                </FadeIn>
              </aside>
            </div>
          </div>
        </header>

        {auditResults && (
          <section
            ref={resultsRef}
            className="section-rule border-subtle border-b py-14 md:py-16 lg:py-20"
          >
            <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
              <FadeIn>
                <div className="newspaper-subrule mb-10 py-3 text-center">
                  <p className="text-label vw-small mb-2 text-gold">
                    YOUR CUSTOM 5-DAY PLAN
                  </p>
                  <h2 className="text-serif-italic vw-heading-md">
                    {typographer(
                      'For what you shared, here is your next week.',
                    )}
                  </h2>
                </div>
              </FadeIn>

              {auditResults.customPlan?.days?.[0] && (
                <FadeIn delay={0.04}>
                  <article className="newspaper-card mb-8 p-6 md:p-8">
                    <p className="text-label vw-small mb-3 text-gold">
                      DAY {auditResults.customPlan.days[0].day} OF{' '}
                      {auditResults.customPlan.days.length}
                    </p>
                    <h3 className="vw-heading-md mb-4 max-w-[24ch]">
                      {typographer(auditResults.customPlan.days[0].title)}
                    </h3>
                    <p className="text-label vw-small mb-2 text-muted">
                      {auditResults.customPlan.days[0].scriptureReference}
                    </p>
                    <p className="scripture-block vw-body mb-6 text-secondary type-prose">
                      {typographer(
                        auditResults.customPlan.days[0].scriptureText,
                      )}
                    </p>
                    <div className="vw-body mb-6 max-w-[72ch] text-secondary type-prose">
                      {auditResults.customPlan.days[0].reflection
                        .split('\n\n')
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <p
                            key={`custom-reflection-${index}`}
                            className="mb-4"
                          >
                            {typographer(paragraph)}
                          </p>
                        ))}
                    </div>
                    <div className="newspaper-rule mb-5" />
                    <p className="text-label vw-small mb-2 text-gold">PRAYER</p>
                    <p className="text-serif-italic vw-body mb-5 text-secondary type-prose">
                      {typographer(auditResults.customPlan.days[0].prayer)}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-label vw-small mb-2 text-gold">
                          NEXT STEP
                        </p>
                        <p className="vw-small text-secondary type-prose">
                          {typographer(
                            auditResults.customPlan.days[0].nextStep,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-label vw-small mb-2 text-gold">
                          JOURNAL PROMPT
                        </p>
                        <p className="vw-small text-secondary type-prose">
                          {typographer(
                            auditResults.customPlan.days[0].journalPrompt,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                </FadeIn>
              )}

              {auditResults.customPlan && (
                <FadeIn delay={0.05}>
                  <article className="newspaper-card mb-10 p-6 md:p-8">
                    <p className="text-label vw-small mb-2 text-gold">
                      FULL PLAN
                    </p>
                    <h3 className="vw-body mb-3 max-w-[34ch]">
                      {typographer(auditResults.customPlan.title)}
                    </h3>
                    <p className="vw-small mb-6 max-w-[72ch] text-secondary type-prose">
                      {typographer(auditResults.customPlan.summary)}
                    </p>
                    <ol className="space-y-4">
                      {auditResults.customPlan.days.map((dayPlan) => (
                        <li
                          key={`plan-preview-${dayPlan.day}`}
                          className="newspaper-subrule py-3"
                        >
                          <div className="mb-1 flex items-center justify-between gap-4">
                            <p className="text-label vw-small text-gold">
                              DAY {dayPlan.day}
                              {dayPlan.chiasticPosition
                                ? ` • ${dayPlan.chiasticPosition}`
                                : ''}
                            </p>
                            <p className="text-label vw-small text-muted">
                              {dayPlan.scriptureReference}
                            </p>
                          </div>
                          <p className="vw-body mb-2 text-[var(--color-text-primary)]">
                            {typographer(dayPlan.title)}
                          </p>
                          <p className="vw-small text-secondary type-prose">
                            {typographer(dayPlan.nextStep)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </article>
                </FadeIn>
              )}

              <FadeIn delay={0.06}>
                <div className="newspaper-subrule mb-8 py-2 text-center">
                  <p className="text-label vw-small text-muted">
                    OPTIONAL SERIES PATHWAYS
                  </p>
                </div>
              </FadeIn>

              <StaggerGrid className="grid gap-6 md:grid-cols-3">
                {(auditResults.matches || [])
                  .slice(0, 3)
                  .map((match, index) => (
                    <Link
                      key={match.slug}
                      href={`/wake-up/series/${match.slug}`}
                      className="group block"
                    >
                      <div
                        className="newspaper-card flex h-full flex-col overflow-hidden transition-colors duration-200"
                        style={{
                          borderColor:
                            index === 0
                              ? 'var(--color-border-strong)'
                              : 'var(--color-border)',
                        }}
                      >
                        <SeriesHero
                          seriesSlug={match.slug}
                          size="thumbnail"
                          overlay
                        />
                        <div className="flex flex-1 flex-col p-6">
                          <p className="text-label vw-small mb-3 text-gold">
                            {SERIES_DATA[match.slug]?.title || match.title}
                          </p>
                          <p className="text-serif-italic vw-body mb-3 flex-1 transition-colors duration-200 group-hover:text-gold">
                            {typographer(match.question)}
                          </p>
                          {match.reasoning && (
                            <p className="vw-small mb-4 text-tertiary type-prose">
                              {typographer(match.reasoning)}
                            </p>
                          )}
                          <div className="newspaper-rule mb-3" />
                          <div className="flex items-center justify-between">
                            <span className="text-label vw-small text-muted oldstyle-nums">
                              {SERIES_DATA[match.slug]?.days.length || '?'} DAYS
                            </span>
                            <span className="text-label vw-small text-muted transition-colors duration-200 group-hover:text-[var(--color-text-primary)]">
                              START &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </StaggerGrid>
            </div>
          </section>
        )}

        <section className="section-rule border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">THE FLOW</p>
                <h2 className="vw-heading-md mb-3">
                  {typographer('How this works')}
                </h2>
                <p className="vw-body mx-auto max-w-[36ch] text-secondary type-prose">
                  {typographer(
                    'Clear, daily progress designed for consistency and traction.',
                  )}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.04}>
              <div className="mx-auto mb-7 max-w-[280px]">
                <IllustrationFrame
                  src={NEWSPAPER_ILLUSTRATIONS.flow}
                  alt="How this works engraving"
                  effect="woodblock"
                  aspect="banner"
                  decorative
                />
              </div>
            </FadeIn>

            <ol className="newspaper-flow-list mx-auto max-w-5xl">
              {FLOW_STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className="newspaper-flow-item grid gap-4 py-6 md:grid-cols-[auto_1fr_180px] md:items-start md:gap-8 md:py-8"
                >
                  <p className="text-gold oldstyle-nums vw-heading-md leading-none">
                    {step.id}
                  </p>
                  <div>
                    <h3 className="vw-body mb-2 text-[var(--color-text-primary)]">
                      {typographer(step.title)}
                    </h3>
                    <p className="vw-small max-w-[60ch] text-secondary type-prose">
                      {typographer(step.body)}
                    </p>
                  </div>
                  <IllustrationFrame
                    src={FLOW_ILLUSTRATIONS[index % FLOW_ILLUSTRATIONS.length]}
                    alt={`${step.title} illustration`}
                    effect="halftone"
                    aspect="square"
                    decorative
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section-rule border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">
                  FEATURED STORIES
                </p>
                <h2 className="vw-heading-md mb-3">
                  {typographer('Featured series')}
                </h2>
                <p className="vw-body mx-auto max-w-[42ch] text-secondary type-prose">
                  {typographer(
                    'Choose a guided path for the exact struggle you are carrying.',
                  )}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.04}>
              <div className="mx-auto mb-8 max-w-[320px]">
                <IllustrationFrame
                  src={NEWSPAPER_ILLUSTRATIONS.featured}
                  alt="Featured section illustration"
                  effect="dither"
                  aspect="banner"
                  decorative
                />
              </div>
            </FadeIn>

            <PrintRail
              ariaLabel="Featured series"
              intervalMs={GSAP_CONFIG.rails.intervalMs}
              viewportClassName="pb-2"
              items={FEATURED_SERIES.map((slug) => {
                const series = SERIES_DATA[slug]

                return {
                  id: slug,
                  content: series ? (
                    <Link
                      href={`/wake-up/series/${slug}`}
                      className="group block"
                    >
                      <div className="newspaper-card overflow-hidden transition-colors duration-200">
                        <SeriesHero seriesSlug={slug} size="card" overlay />
                        <div className="p-6">
                          <p className="text-label vw-small mb-2 text-gold">
                            {series.title.toUpperCase()}
                          </p>
                          <div className="newspaper-rule mb-3" />
                          <p className="text-serif-italic vw-body transition-colors duration-200 group-hover:text-gold">
                            {typographer(series.question)}
                          </p>
                          <p className="vw-small mt-4 text-muted oldstyle-nums">
                            {series.days.length} DAYS
                          </p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="newspaper-card p-6">
                      <p className="vw-body">Series unavailable</p>
                    </div>
                  ),
                }
              })}
            />

            <FadeIn>
              <div className="mt-10 text-center">
                <Link
                  href="/series"
                  className="link-highlight text-label vw-small inline-block px-4 pb-1 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                >
                  View All {ALL_SERIES_ORDER.length} Series
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="section-rule border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">HELP DESK</p>
                <h2 className="vw-heading-md">
                  {typographer('Common questions')}
                </h2>
              </div>
            </FadeIn>

            <div className="newspaper-faq-list mx-auto max-w-6xl pt-6">
              <PrintRail
                ariaLabel="FAQ"
                intervalMs={GSAP_CONFIG.rails.intervalMs + 500}
                items={[
                  ...FAQ_ITEMS.map((item) => ({
                    id: item.question,
                    content: (
                      <FaqHoverCard
                        question={item.question}
                        answer={item.answer}
                      />
                    ),
                  })),
                  {
                    id: 'faq-illustration',
                    content: (
                      <IllustrationFrame
                        src={NEWSPAPER_ILLUSTRATIONS.faq}
                        alt="Engraving ornament"
                        effect="dither"
                        aspect="portrait"
                        decorative
                        caption="Hover or tap to reveal answers."
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="mx-auto max-w-5xl border-y-2 border-subtle px-4 py-8 text-center md:grid md:grid-cols-[1fr_280px] md:items-center md:gap-6 md:px-6 md:py-10">
                <div>
                  <p className="text-label vw-small mb-4 text-gold">
                    READY TO BEGIN?
                  </p>
                  <h2 className="text-serif-italic vw-heading-md mb-5">
                    {typographer('Start with one honest sentence.')}
                  </h2>
                  <p className="vw-body mx-auto mb-8 max-w-[36ch] text-secondary type-prose">
                    {typographer(
                      'You do not need certainty before you begin. You need a next step.',
                    )}
                  </p>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <a
                      href="#start-audit"
                      className="cta-major text-label vw-small px-8 py-3"
                    >
                      Take Soul Audit
                    </a>
                    <Link
                      href="/series"
                      className="animated-underline text-label vw-small px-8 py-3 text-[var(--color-text-primary)]"
                    >
                      Browse Series
                    </Link>
                  </div>
                </div>
                <IllustrationFrame
                  src={NEWSPAPER_ILLUSTRATIONS.cta}
                  alt="Closing devotional illustration"
                  effect="ink"
                  aspect="portrait"
                  decorative
                  className="mx-auto mt-8 w-full max-w-[240px] md:mt-0"
                />
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="section-rule border-subtle border-b pb-8 pt-4 md:pb-10">
          <div className="mx-auto max-w-[1720px] px-4 md:px-[56px] lg:px-20">
            <h2
              className="text-masthead relative left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden text-left select-none md:w-[calc(100vw-7rem)] lg:w-[calc(100vw-10rem)]"
              style={{
                fontSize: 'clamp(1.95rem, 9.2vw, 11rem)',
                lineHeight: 0.82,
                letterSpacing: '0.1em',
              }}
              aria-label="Euangelion"
            >
              <span className="masthead-fullwidth" aria-hidden="true">
                {MASTHEAD_LETTERS.map((letter, index) => (
                  <span key={`footer-${letter}-${index}`}>{letter}</span>
                ))}
              </span>
            </h2>
          </div>
        </section>
      </main>

      <footer className="border-subtle border-t py-14 md:py-16">
        <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
          <div className="text-center">
            <p
              className="text-label vw-small leading-relaxed text-muted type-caption"
              style={{ letterSpacing: '0.2em' }}
            >
              SOMETHING TO HOLD ONTO.
            </p>
            <div className="mt-6 flex items-center justify-center gap-6">
              <Link
                href="/privacy"
                className="animated-underline vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="animated-underline vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Terms
              </Link>
            </div>
            <p className="vw-small mt-5 text-muted oldstyle-nums">
              &copy; 2026 EUANGELION
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
