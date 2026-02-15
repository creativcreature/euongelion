'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/soul-audit', label: 'SOUL AUDIT' },
  { href: '/daily-bread', label: 'DAILY BREAD' },
  { href: '/series', label: 'SERIES' },
]
const MOBILE_PRIMARY_NAV_PATHS = ['/', '/soul-audit', '/daily-bread']
const MOBILE_EXTRA_ITEMS = [
  { href: '/help', label: 'HELP' },
  { href: '/settings', label: 'SETTINGS' },
  { href: '/wake-up', label: 'WAKE-UP' },
]
const MOBILE_TICKER_INTERVAL_MS = 6200

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

export default function EuangelionShellHeader({
  brandWord = 'EUANGELION',
  tone = 'default',
}: {
  brandWord?: string
  tone?: 'default' | 'wake'
}) {
  const pathname = usePathname()
  const topbarRef = useRef<HTMLDivElement | null>(null)
  const previousPathnameRef = useRef(pathname)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [mobileTopbarIndex, setMobileTopbarIndex] = useState(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const mobileNavItems = useMemo(
    () => [...NAV_ITEMS, ...MOBILE_EXTRA_ITEMS],
    [],
  )
  const mobilePrimaryNavItems = useMemo(
    () =>
      mobileNavItems.filter((item) =>
        MOBILE_PRIMARY_NAV_PATHS.includes(item.href),
      ),
    [mobileNavItems],
  )
  const mobileSecondaryNavItems = useMemo(
    () =>
      mobileNavItems.filter(
        (item) => !MOBILE_PRIMARY_NAV_PATHS.includes(item.href),
      ),
    [mobileNavItems],
  )
  const mobileTickerItems = useMemo(
    () => ['Daily Devotionals for the Hungry Soul'],
    [],
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
    let cancelled = false
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const payload = (await response.json()) as {
          authenticated?: boolean
          user?: { email?: string | null } | null
        }
        if (!cancelled) {
          setAuthenticated(Boolean(payload.authenticated))
          setUserEmail(payload.user?.email ?? null)
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false)
          setUserEmail(null)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }
    void loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 900px)')
    const syncViewport = () => {
      const matches = media.matches
      setIsMobileViewport(matches)
      if (!matches) {
        setMobileMenuOpen(false)
      }
    }
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) return

    function closeIfOutside(event: MouseEvent) {
      if (!accountMenuRef.current) return
      if (accountMenuRef.current.contains(event.target as Node)) return
      setAccountMenuOpen(false)
    }

    document.addEventListener('mousedown', closeIfOutside)
    return () => document.removeEventListener('mousedown', closeIfOutside)
  }, [accountMenuOpen])

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

      const nextSize = currentSize * (available / natural) * 0.988
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
    const topbar = topbarRef.current
    if (!topbar) return
    const frame = topbar.closest('.mock-shell-frame') as HTMLElement | null
    const paper = topbar.closest('.mock-paper') as HTMLElement | null

    const applyTopbarHeight = () => {
      const height = Math.ceil(topbar.getBoundingClientRect().height || 0)
      if (height > 0) {
        frame?.style.setProperty('--shell-topbar-height', `${height}px`)
        paper?.style.setProperty('--shell-topbar-height', `${height}px`)
      }
    }

    applyTopbarHeight()
    const observer = new ResizeObserver(() =>
      window.requestAnimationFrame(applyTopbarHeight),
    )
    observer.observe(topbar)
    window.addEventListener('resize', applyTopbarHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', applyTopbarHeight)
      frame?.style.removeProperty('--shell-topbar-height')
      paper?.style.removeProperty('--shell-topbar-height')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (
      !isMobileViewport ||
      reducedMotion ||
      mobileMenuOpen ||
      mobileTickerItems.length <= 1
    )
      return

    const timer = window.setInterval(
      () =>
        setMobileTopbarIndex(
          (prev) => (prev + 1) % Math.max(1, mobileTickerItems.length),
        ),
      MOBILE_TICKER_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [isMobileViewport, mobileTickerItems.length, mobileMenuOpen])

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    if (!mobileMenuOpen) return
    const rafId = window.requestAnimationFrame(() => setMobileMenuOpen(false))
    return () => window.cancelAnimationFrame(rafId)
  }, [pathname, mobileMenuOpen])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const redirectPath = encodeURIComponent(pathname || '/')

  async function handleSignOut() {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
    } finally {
      setAuthenticated(false)
      setUserEmail(null)
      setAccountMenuOpen(false)
      if (typeof window !== 'undefined') {
        window.location.assign('/')
      }
    }
  }

  const userInitial = (userEmail || 'U').trim().charAt(0).toUpperCase() || 'U'

  const isNavItemActive = (href: string) => {
    if (href === '/daily-bread') {
      return (
        pathname === '/daily-bread' || pathname?.startsWith('/my-devotional')
      )
    }
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  const renderNavLinks = (items: typeof NAV_ITEMS) =>
    items.map((item, index) => {
      const active = isNavItemActive(item.href)
      return (
        <span key={item.href} className="mock-nav-item-wrap">
          <Link
            href={item.href}
            className={`mock-nav-item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
          {index < items.length - 1 && <span aria-hidden="true">|</span>}
        </span>
      )
    })

  const renderMobileNav = (panelClassName: string) => (
    <>
      <div className="mock-mobile-nav-main">
        {mobilePrimaryNavItems.map((item) => {
          const active = isNavItemActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mock-nav-item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          className={`mock-mobile-menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`}
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label={
            mobileMenuOpen ? 'Close secondary menu' : 'Open secondary menu'
          }
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>
      <div className={`${panelClassName} ${mobileMenuOpen ? 'is-open' : ''}`}>
        {mobileSecondaryNavItems.map((item) => {
          const active = isNavItemActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mock-nav-item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          className="mock-nav-item mock-mobile-theme-item"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
        </button>
        {!authLoading &&
          (authenticated ? (
            <>
              <Link
                href="/settings"
                className={`mock-nav-item ${isNavItemActive('/settings') ? 'is-active' : ''}`}
                aria-current={isNavItemActive('/settings') ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                ACCOUNT
              </Link>
              <button
                type="button"
                className="mock-nav-item"
                onClick={() => {
                  setMobileMenuOpen(false)
                  void handleSignOut()
                }}
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/auth/sign-in?redirect=${redirectPath}`}
                className="mock-nav-item"
                onClick={() => setMobileMenuOpen(false)}
              >
                SIGN IN
              </Link>
              <Link
                href={`/auth/sign-up?redirect=${redirectPath}`}
                className="mock-nav-item"
                onClick={() => setMobileMenuOpen(false)}
              >
                SIGN UP
              </Link>
            </>
          ))}
      </div>
    </>
  )

  return (
    <div className={`mock-shell-frame ${tone === 'wake' ? 'wake-shell' : ''}`}>
      <header>
        <div ref={topbarRef} className="mock-topbar text-label">
          <div className="mock-topbar-desktop-row">
            <span className="mock-topbar-date">{formatMastheadDate(now)}</span>
            <div className="mock-topbar-actions">
              <button
                type="button"
                className="mock-mode-toggle text-label"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
              </button>
              {authLoading ? (
                <span className="mock-auth-loading">...</span>
              ) : authenticated ? (
                <div className="mock-account-wrap" ref={accountMenuRef}>
                  <button
                    type="button"
                    className="mock-account-trigger text-label"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    onClick={() => setAccountMenuOpen((current) => !current)}
                  >
                    {userInitial}
                  </button>
                  {accountMenuOpen && (
                    <div className="mock-account-menu" role="menu">
                      <Link
                        href="/daily-bread"
                        role="menuitem"
                        className="mock-account-item"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        Daily Bread
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        className="mock-account-item"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/help"
                        role="menuitem"
                        className="mock-account-item"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        Help
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="mock-account-item"
                        onClick={() => void handleSignOut()}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mock-auth-links">
                  <Link
                    href={`/auth/sign-in?redirect=${redirectPath}`}
                    className="mock-auth-link"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href={`/auth/sign-up?redirect=${redirectPath}`}
                    className="mock-auth-link"
                  >
                    SIGN UP
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mock-topbar-mobile-row">
            {mobileTickerItems.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`mock-topbar-mobile-item ${mobileTopbarIndex === index ? 'is-active' : ''}`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <section className="mock-masthead-block">
          <h1 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              {brandWord}
            </span>
          </h1>
          {tone !== 'wake' && (
            <p className="mock-masthead-pronunciation text-label">
              EU•AN•GE•LION (YOO-AN-GEL-EE-ON) • GREEK: &quot;GOOD
            </p>
          )}
        </section>

        <nav className="mock-nav text-label" aria-label="Main navigation">
          {isMobileViewport
            ? renderMobileNav('mock-mobile-nav-panel')
            : renderNavLinks(NAV_ITEMS)}
        </nav>
      </header>
    </div>
  )
}
