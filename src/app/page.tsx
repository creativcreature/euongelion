'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import type { SoulAuditResponse, AuditMatch } from '@/types/soul-audit'

const emptySubscribe = () => () => {}

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/soul-audit', label: 'SOUL AUDIT' },
  { href: '/wake-up', label: 'WAKE-UP' },
  { href: '/series', label: 'SERIES' },
  { href: '/settings', label: 'SETTING' },
]

const HOW_STEPS = [
  {
    title: '1. Name it.',
    body: 'Write one honest paragraph, and we will customize a 5 day devotional plan for you.',
    image: '/images/illustrations/euangelion-homepage-engraving-09.svg',
  },
  {
    title: '2. Read it.',
    body: 'Write one honest paragraph, and we will customize a 5 day devotional plan for you.',
    image: '/images/illustrations/euangelion-homepage-engraving-10.svg',
  },
  {
    title: '3. Now Walk It Out.',
    body: 'Write one honest paragraph, and we will customize a 5 day devotional plan for you.',
    image: '/images/illustrations/euangelion-homepage-engraving-11.svg',
  },
]

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
    answer: 'No account required. Start immediately with a custom 5-day plan.',
  },
  {
    question: 'What if I miss a day?',
    answer:
      'No guilt loop. Return the next day and continue your path with the same clarity.',
  },
]

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function formatMastheadDate(now: Date): string {
  const month = now
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase()
    .replace('.', '')
  const day = now.toLocaleString('en-US', { day: '2-digit' })
  const year = now.toLocaleString('en-US', { year: 'numeric' })
  const time = now.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${month}. ${day}, ${year} ${time.replace(' AM', '').replace(' PM', '')}`
}

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
  const router = useRouter()
  const pathname = usePathname()

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [auditText, setAuditText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [faqIndex, setFaqIndex] = useState(0)
  const [pauseFaq, setPauseFaq] = useState(false)

  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit } = useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()

  const featuredSlugs = useMemo(() => ALL_SERIES_ORDER.slice(0, 6), [])
  const faqWindow = useMemo(
    () =>
      [0, 1, 2].map(
        (offset) => FAQ_ITEMS[(faqIndex + offset) % FAQ_ITEMS.length],
      ),
    [faqIndex],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (pauseFaq) return
    const timer = window.setInterval(() => {
      setFaqIndex((prev) => (prev + 1) % FAQ_ITEMS.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [pauseFaq])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  async function submitAudit(raw: string) {
    if (limitReached) {
      setError('You\u2019ve explored enough. Time to dive in.')
      return
    }

    const trimmed = raw.trim()
    if (trimmed.length < 10) {
      setError('Write one honest paragraph so we can craft your devotional.')
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
        throw new Error(data.error || 'Unable to process soul audit right now.')
      }

      const data = (await res.json()) as Partial<SoulAuditResponse>
      const normalized = normalizeSoulAuditResponse(data)
      sessionStorage.setItem('soul-audit-result', JSON.stringify(normalized))
      recordAudit(trimmed, normalized)
      router.push('/soul-audit/results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`mock-home ${theme === 'dark' ? 'is-dark' : ''}`}>
      <main className="mock-paper">
        <header className="mock-topbar text-label">
          <span>{formatMastheadDate(now)}</span>
          <span>Daily Devotionals for the Hungry Soul</span>
          <button
            type="button"
            className="mock-mode-toggle text-label"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </button>
        </header>

        <section className="mock-masthead-block">
          <h1 className="text-masthead mock-masthead-word">EUANGELION</h1>
          <p className="mock-masthead-sub">GOOD NEWS COMING</p>
        </section>

        <nav className="mock-nav text-label" aria-label="Main navigation">
          {NAV_ITEMS.map((item, index) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <span key={item.href} className="mock-nav-item-wrap">
                <Link
                  href={item.href}
                  className={`mock-nav-item ${active ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
                {index < NAV_ITEMS.length - 1 && (
                  <span aria-hidden="true">|</span>
                )}
              </span>
            )
          })}
        </nav>

        <section className="mock-hero-grid">
          <div className="mock-hero-art" aria-hidden="true">
            <Image
              src="/images/illustrations/euangelion-homepage-engraving-04.svg"
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 190px"
            />
          </div>

          <article className="mock-panel mock-panel-copy">
            <p className="text-label mock-kicker">WHAT IS THIS PLACE?</p>
            <h2 className="mock-title">Find Your Next Faithful Step Today.</h2>
            <div className="mock-rule" />
            <p className="mock-body">
              {typographer(
                'Run a short soul audit and get matched to a focused devotional path for the season you are actually in.',
              )}
            </p>
          </article>

          <section className="mock-panel mock-panel-audit" id="start-audit">
            <div className="mock-audit-head">
              <p className="text-label mock-kicker">SOUL AUDIT</p>
              <h2 className="mock-title">What are you wrestling with today?</h2>
              <p className="mock-subcopy">
                Write one honest paragraph, and we will customize a 5 day
                devotional plan for you.
              </p>
            </div>

            <textarea
              value={auditText}
              onChange={(e) => {
                setAuditText(e.target.value)
                setError(null)
              }}
              placeholder="Write your paragraph here..."
              rows={3}
              disabled={isSubmitting}
              className="mock-textarea"
              aria-label="What are you wrestling with today?"
            />

            <button
              type="button"
              className="mock-btn text-label"
              onClick={() => void submitAudit(auditText)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'BUILDING YOUR PLAN...' : 'GET MY DEVOTION'}
            </button>

            <p className="mock-footnote">
              No account required. Start immediately.
            </p>
            {hydrated && auditCount > 0 && (
              <p className="mock-footnote">Audit {auditCount + 1} of 3</p>
            )}
            {error && <p className="mock-error">{error}</p>}
          </section>
        </section>

        <section className="mock-section-center">
          <p className="text-label mock-kicker">WHAT ARE YOU EVEN DOING?</p>
          <h2 className="mock-title-center">How this works.</h2>
          <p className="mock-subcopy-center">
            Write one honest paragraph, and we will customize a 5 day devotional
            plan for you.
          </p>
        </section>

        <section className="mock-steps-grid">
          {HOW_STEPS.map((step) => (
            <article key={step.title} className="mock-step-card">
              <div className="mock-step-image" aria-hidden="true">
                <Image
                  src={step.image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 320px"
                />
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mock-section-center">
          <p className="text-label mock-kicker">HAND CRAFTED</p>
          <h2 className="mock-title-center">Featured Series</h2>
          <p className="mock-subcopy-center">
            Write one honest paragraph, and we will customize a 5 day devotional
            plan for you.
          </p>
        </section>

        <section className="mock-featured-grid">
          {featuredSlugs.map((slug) => {
            const series = SERIES_DATA[slug]
            if (!series) return null
            return (
              <Link
                href={`/wake-up/series/${slug}`}
                key={slug}
                className="mock-featured-card"
              >
                <div className="mock-card-media" aria-hidden="true" />
                <h3>{series.title}.</h3>
                <p>
                  Write one honest paragraph,
                  <br />
                  and we will customize a 5 day
                  <br />
                  devotional plan for you.
                </p>
                <span className="text-label">5 DAYS</span>
              </Link>
            )
          })}
        </section>

        <section className="mock-more-row">
          <Link href="/series" className="mock-btn text-label">
            MORE DEVOTIONALS
          </Link>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
        </section>

        <section
          className="mock-faq-row"
          onMouseEnter={() => setPauseFaq(true)}
          onMouseLeave={() => setPauseFaq(false)}
        >
          <article className="mock-faq-lead">
            <h3>What are you wrestling with today?</h3>
            <p>
              Write one honest paragraph, and we will customize a 5 day
              devotional plan for you.
            </p>
          </article>

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

          {faqWindow.map((item, idx) => (
            <article
              key={`${item.question}-${idx}`}
              className={`mock-faq-card ${idx === 1 ? 'is-active' : ''}`}
              tabIndex={0}
            >
              <p className="mock-faq-question">{item.question}</p>
              <p className="mock-faq-answer">{item.answer}</p>
            </article>
          ))}

          <button
            type="button"
            className="mock-arrow"
            aria-label="Next question"
            onClick={() => setFaqIndex((prev) => (prev + 1) % FAQ_ITEMS.length)}
          >
            &gt;
          </button>
        </section>

        <section className="mock-cta">
          <p className="text-label mock-kicker">READY TO BEGIN?</p>
          <h2 className="mock-cta-headline">Start with one honest sentence.</h2>
          <p className="mock-subcopy-center">
            You do not need certainty before you begin. You need a next step.
            You need grace.
          </p>

          <textarea
            value={auditText}
            onChange={(e) => {
              setAuditText(e.target.value)
              setError(null)
            }}
            placeholder="Write your paragraph here..."
            rows={3}
            disabled={isSubmitting}
            className="mock-textarea"
            aria-label="Start with one honest sentence"
          />

          <button
            type="button"
            className="mock-btn text-label"
            onClick={() => void submitAudit(auditText)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'BUILDING YOUR PLAN...' : 'GET MY DEVOTION'}
          </button>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
        </section>

        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">EUANGELION</h2>
        </section>
      </main>
    </div>
  )
}
