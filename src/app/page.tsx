'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

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

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const topbarRef = useRef<HTMLElement | null>(null)
  const navSentinelRef = useRef<HTMLDivElement | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [auditText, setAuditText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [faqIndex, setFaqIndex] = useState(0)
  const [navDocked, setNavDocked] = useState(false)
  const [mobileTopbarIndex, setMobileTopbarIndex] = useState(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit, resetAudit } =
    useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()

  const featuredSlugs = useMemo(() => ALL_SERIES_ORDER.slice(0, 6), [])
  const mobileNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.href !== '/settings'),
    [],
  )
  const faqWindow = useMemo(
    () =>
      [0, 1, 2].map(
        (offset) => FAQ_ITEMS[(faqIndex + offset) % FAQ_ITEMS.length],
      ),
    [faqIndex],
  )
  const faqItemsToRender = isMobileViewport ? FAQ_ITEMS : faqWindow

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const spans = Array.from(
      document.querySelectorAll<HTMLElement>('.js-masthead-fit'),
    )
    if (!spans.length) return

    const fitOne = (span: HTMLElement) => {
      const heading = span.closest('.mock-masthead-word') as HTMLElement | null
      if (!heading) return

      span.style.fontSize = ''
      const available = heading.clientWidth
      const natural = span.scrollWidth
      const currentSize = Number.parseFloat(getComputedStyle(span).fontSize)
      if (!available || !natural || !Number.isFinite(currentSize)) return

      // Keep a tiny safety margin so glyph edges never clip from sub-pixel rounding.
      const nextSize = currentSize * (available / natural) * 0.985
      const clamped = Math.max(36, Math.min(nextSize, 420))
      span.style.fontSize = `${clamped}px`
    }

    const fitAll = () => spans.forEach(fitOne)
    const rafFit = () => window.requestAnimationFrame(fitAll)

    rafFit()
    const resizeObserver = new ResizeObserver(rafFit)
    spans.forEach((span) => {
      const heading = span.closest('.mock-masthead-word') as HTMLElement | null
      if (heading) resizeObserver.observe(heading)
    })

    if (document.fonts?.ready) {
      document.fonts.ready.then(rafFit).catch(() => {})
    }
    window.addEventListener('resize', rafFit)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', rafFit)
    }
  }, [])

  useEffect(() => {
    const sentinel = navSentinelRef.current
    if (!sentinel) return

    let observer: IntersectionObserver | null = null

    const connectObserver = () => {
      const topbarHeight = Math.ceil(
        topbarRef.current?.getBoundingClientRect().height || 0,
      )
      observer?.disconnect()
      observer = new IntersectionObserver(
        ([entry]) => setNavDocked(!entry.isIntersecting),
        {
          root: null,
          threshold: 0,
          rootMargin: `-${topbarHeight}px 0px 0px 0px`,
        },
      )
      observer.observe(sentinel)
    }

    connectObserver()
    window.addEventListener('resize', connectObserver)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', connectObserver)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 900px)').matches
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!isMobile || reducedMotion || navDocked) return

    const timer = window.setInterval(
      () => setMobileTopbarIndex((prev) => (prev + 1) % 2),
      1500,
    )
    return () => window.clearInterval(timer)
  }, [navDocked])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const handleResetAudit = () => {
    resetAudit()
    setError(null)
    sessionStorage.removeItem('soul-audit-result')
    sessionStorage.removeItem('soul-audit-submit-v2')
    sessionStorage.removeItem('soul-audit-selection-v2')
  }

  const renderNavLinks = (items: typeof NAV_ITEMS) =>
    items.map((item, index) => {
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
          {index < items.length - 1 && <span aria-hidden="true">|</span>}
        </span>
      )
    })

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
      const res = await fetch('/api/soul-audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to process soul audit right now.')
      }

      const data = (await res.json()) as SoulAuditSubmitResponseV2
      sessionStorage.setItem('soul-audit-submit-v2', JSON.stringify(data))
      sessionStorage.removeItem('soul-audit-selection-v2')
      recordAudit(trimmed, data)
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
        <header
          ref={topbarRef}
          className={`mock-topbar text-label ${navDocked ? 'is-nav-docked' : ''}`}
        >
          <div className="mock-topbar-desktop-row">
            <span className="mock-topbar-date">{formatMastheadDate(now)}</span>
            <span className="mock-topbar-center-copy">
              Daily Devotionals for the Hungry Soul
            </span>
            <nav className="mock-topbar-nav mock-topbar-center-nav">
              {renderNavLinks(NAV_ITEMS)}
            </nav>
            <button
              type="button"
              className="mock-mode-toggle text-label"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
            </button>
          </div>

          <div
            className={`mock-topbar-mobile-row ${navDocked ? 'is-nav-docked' : ''}`}
          >
            {!navDocked ? (
              <>
                <span
                  className={`mock-topbar-mobile-item ${mobileTopbarIndex === 0 ? 'is-active' : ''}`}
                >
                  {formatMastheadDate(now)}
                </span>
                <span
                  className={`mock-topbar-mobile-item ${mobileTopbarIndex === 1 ? 'is-active' : ''}`}
                >
                  Daily Devotionals for the Hungry Soul
                </span>
              </>
            ) : (
              <nav
                className="mock-topbar-mobile-nav"
                aria-label="Sticky navigation"
              >
                {renderNavLinks(mobileNavItems)}
                <button
                  type="button"
                  className="mock-nav-mobile-theme-toggle"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? '☀' : '◐'}
                </button>
              </nav>
            )}
          </div>
        </header>

        <section className="mock-masthead-block">
          <h1 className="text-masthead mock-masthead-word">
            <span className="js-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h1>
          <p className="mock-masthead-sub">GOOD NEWS COMING</p>
        </section>

        <div
          ref={navSentinelRef}
          className="mock-nav-sentinel"
          aria-hidden="true"
        />

        <nav
          className={`mock-nav text-label ${navDocked ? 'is-docked' : ''}`}
          aria-label="Main navigation"
        >
          {isMobileViewport ? (
            <>
              {renderNavLinks(mobileNavItems)}
              <button
                type="button"
                className="mock-nav-mobile-theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀' : '◐'}
              </button>
            </>
          ) : (
            renderNavLinks(NAV_ITEMS)
          )}
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
              <>
                <p className="mock-footnote">Audit {auditCount + 1} of 3</p>
                <button
                  type="button"
                  className="mock-reset-btn text-label"
                  onClick={handleResetAudit}
                >
                  Reset Audit
                </button>
              </>
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
              <div className="mock-step-image-wrap" aria-hidden="true">
                <div className="mock-step-image">
                  <Image
                    src={step.image}
                    alt=""
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

        <section className="mock-faq-row">
          <article className="mock-faq-lead">
            <h3>Questions before you begin?</h3>
            <p>
              Write one honest paragraph, and we will customize a 5 day
              devotional plan for you.
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

          {faqItemsToRender.map((item, idx) => (
            <article
              key={`${item.question}-${idx}`}
              className="mock-faq-card"
              tabIndex={0}
            >
              <p className="mock-faq-question">{item.question}</p>
              <p className="mock-faq-answer">{item.answer}</p>
            </article>
          ))}

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
          {hydrated && auditCount > 0 && (
            <button
              type="button"
              className="mock-reset-btn text-label"
              onClick={handleResetAudit}
            >
              Reset Audit
            </button>
          )}
        </section>

        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
