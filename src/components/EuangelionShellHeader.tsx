'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/my-devotional', label: 'MY DEVOTIONAL' },
  { href: '/soul-audit', label: 'SOUL AUDIT' },
  { href: '/wake-up', label: 'WAKE-UP' },
  { href: '/series', label: 'SERIES' },
  { href: '/settings', label: 'SETTINGS' },
]
const MOBILE_TICKER_INTERVAL_MS = 4600

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

export default function EuangelionShellHeader() {
  const pathname = usePathname()
  const topbarRef = useRef<HTMLDivElement | null>(null)
  const navSentinelRef = useRef<HTMLDivElement | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [navDocked, setNavDocked] = useState(false)
  const [mobileTopbarIndex, setMobileTopbarIndex] = useState(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const mobileNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.href !== '/settings'),
    [],
  )
  const mobileTickerItems = useMemo(
    () => [
      formatMastheadDate(now),
      'Daily Devotionals for the Hungry Soul',
      theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE',
    ],
    [now, theme],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
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
    const spans = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.js-shell-masthead-fit, .js-masthead-fit',
      ),
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

      const nextSize = currentSize * (available / natural) * 0.996
      span.style.fontSize = `${Math.max(18, nextSize)}px`
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
    const topbar = topbarRef.current
    if (!sentinel || !topbar) return

    let rafId = 0

    const recomputeDockState = () => {
      rafId = 0
      const topbarHeight = Math.ceil(topbar.getBoundingClientRect().height || 0)
      const sentinelTop = sentinel.getBoundingClientRect().top
      setNavDocked((previous) => {
        const dockThreshold = topbarHeight + 2
        const undockThreshold = topbarHeight + 24
        if (previous) {
          return sentinelTop <= undockThreshold
        }
        return sentinelTop <= dockThreshold
      })
    }

    const queueDockState = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(recomputeDockState)
    }

    queueDockState()
    window.addEventListener('scroll', queueDockState, { passive: true })
    window.addEventListener('resize', queueDockState)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', queueDockState)
      window.removeEventListener('resize', queueDockState)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!isMobileViewport || reducedMotion || navDocked) return

    const timer = window.setInterval(
      () =>
        setMobileTopbarIndex(
          (prev) => (prev + 1) % Math.max(1, mobileTickerItems.length),
        ),
      MOBILE_TICKER_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [isMobileViewport, mobileTickerItems.length, navDocked])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
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

  return (
    <header data-nav-docked={navDocked ? 'true' : 'false'}>
      <div
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
            mobileTickerItems.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`mock-topbar-mobile-item ${mobileTopbarIndex === index ? 'is-active' : ''}`}
              >
                {item}
              </span>
            ))
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
      </div>

      <section className="mock-masthead-block">
        <h1 className="text-masthead mock-masthead-word">
          <span className="js-shell-masthead-fit mock-masthead-text">
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
        aria-hidden={navDocked}
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
    </header>
  )
}
