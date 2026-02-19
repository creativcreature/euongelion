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
const MOBILE_EXTRA_ITEMS = [
  { href: '/help', label: 'HELP' },
  { href: '/wake-up', label: 'WAKE-UP' },
]
const MOBILE_TICKER_INTERVAL_MS = 6200
const SCROLL_LOCK_CLASSES = [
  'lenis',
  'lenis-smooth',
  'lenis-scrolling',
  'lenis-stopped',
] as const
const SCROLL_LOCK_STYLE_PROPS = [
  'overflow',
  'overflow-x',
  'overflow-y',
  'position',
  'top',
  'left',
  'right',
  'width',
  'height',
  'touch-action',
  'overscroll-behavior',
  'overscroll-behavior-y',
  'padding-right',
] as const
const SCROLL_LOCK_DATA_ATTRIBUTES = ['data-scroll-locked']

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

function clearGlobalScrollLocks() {
  if (typeof document === 'undefined') return

  for (const prop of SCROLL_LOCK_STYLE_PROPS) {
    document.body.style.removeProperty(prop)
    document.documentElement.style.removeProperty(prop)
  }

  for (const klass of SCROLL_LOCK_CLASSES) {
    document.body.classList.remove(klass)
    document.documentElement.classList.remove(klass)
  }

  for (const attr of SCROLL_LOCK_DATA_ATTRIBUTES) {
    document.body.removeAttribute(attr)
    document.documentElement.removeAttribute(attr)
  }
}

export default function EuangelionShellHeader({
  brandWord = 'EUANGELION',
  tone = 'default',
}: {
  brandWord?: string
  tone?: 'default' | 'wake'
}) {
  const pathname = usePathname()
  const previousPathnameRef = useRef(pathname)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuToggleRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null)

  const mastheadRef = useRef<HTMLElement | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [now, setNow] = useState(() => new Date())
  const [mobileTopbarIndex, setMobileTopbarIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [navDocked, setNavDocked] = useState(false)

  const mobileMenuItems = useMemo(
    () => [...NAV_ITEMS, ...MOBILE_EXTRA_ITEMS],
    [],
  )
  const mobileTickerItems = useMemo(
    () => [
      formatMastheadDate(now),
      'Daily Devotionals for the Hungry Soul',
      'Scripture-led. Honest reflection. Faithful next step.',
    ],
    [now],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    clearGlobalScrollLocks()
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) {
      clearGlobalScrollLocks()
    }
  }, [mobileMenuOpen, pathname])

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
    if (!accountMenuOpen) return

    function closeIfOutside(event: MouseEvent) {
      if (!accountMenuRef.current) return
      if (accountMenuRef.current.contains(event.target as Node)) return
      setAccountMenuOpen(false)
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const firstItem =
        accountMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
      firstItem?.focus()
    })

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAccountMenuOpen(false)
      accountTriggerRef.current?.focus()
    }

    document.addEventListener('mousedown', closeIfOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('mousedown', closeIfOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const panel = mobileMenuPanelRef.current
    if (!panel) return

    const focusFrame = window.requestAnimationFrame(() => {
      const firstInteractive = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      firstInteractive?.focus()
    })

    function onPanelKeydown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMobileMenuOpen(false)
      mobileMenuToggleRef.current?.focus()
    }

    panel.addEventListener('keydown', onPanelKeydown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      panel.removeEventListener('keydown', onPanelKeydown)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      const panel = mobileMenuPanelRef.current
      const toggle = mobileMenuToggleRef.current
      if (!panel || !toggle) return
      if (panel.contains(target) || toggle.contains(target)) return
      setMobileMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const spans = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.js-shell-masthead-fit, .js-masthead-fit',
      ),
    )
    if (!spans.length) return
    let disposed = false

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
    const rafFit = () => {
      if (disposed || typeof window === 'undefined') return
      window.requestAnimationFrame(fitAll)
    }

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
      disposed = true
      resizeObserver.disconnect()
      window.removeEventListener('resize', rafFit)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion || mobileMenuOpen || mobileTickerItems.length <= 1) return

    const timer = window.setInterval(
      () =>
        setMobileTopbarIndex(
          (prev) => (prev + 1) % Math.max(1, mobileTickerItems.length),
        ),
      MOBILE_TICKER_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [mobileTickerItems.length, mobileMenuOpen])

  // Dock nav into topbar when masthead scrolls out of view (desktop only)
  useEffect(() => {
    const masthead = mastheadRef.current
    if (!masthead) return

    const mql = window.matchMedia('(max-width: 900px)')
    // On mobile, never dock — nav sticks independently
    if (mql.matches) {
      setNavDocked(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When masthead is no longer visible, dock the nav into topbar
        setNavDocked(!entry.isIntersecting)
      },
      {
        // Offset by the topbar height so docking triggers right when
        // the masthead's bottom edge meets the topbar's bottom edge
        rootMargin: '-42px 0px 0px 0px',
        threshold: 0,
      },
    )
    observer.observe(masthead)

    const handleResize = () => {
      if (mql.matches) {
        setNavDocked(false)
      }
    }
    mql.addEventListener('change', handleResize)

    return () => {
      observer.disconnect()
      mql.removeEventListener('change', handleResize)
    }
  }, [])

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }, [pathname])

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

  const activeMobileItem =
    NAV_ITEMS.find((item) => isNavItemActive(item.href)) || NAV_ITEMS[0]

  const renderMobileNav = (panelClassName: string) => (
    <>
      <div className="mock-mobile-nav-main">
        <Link
          href={activeMobileItem.href}
          className="mock-nav-item mock-mobile-nav-current is-active"
          aria-current="page"
          onClick={() => setMobileMenuOpen(false)}
        >
          {activeMobileItem.label}
        </Link>
        <button
          type="button"
          className={`mock-mobile-menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`}
          onClick={() => setMobileMenuOpen((current) => !current)}
          ref={mobileMenuToggleRef}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls={
            mobileMenuOpen ? 'shell-mobile-secondary-nav' : undefined
          }
        >
          {mobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>
      {mobileMenuOpen && (
        <div
          id="shell-mobile-secondary-nav"
          ref={mobileMenuPanelRef}
          role="group"
          aria-label="Navigation menu"
          className={`${panelClassName} is-open`}
        >
          {mobileMenuItems.map((item) => {
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
                  aria-current={
                    isNavItemActive('/settings') ? 'page' : undefined
                  }
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
      )}
    </>
  )

  return (
    <div className={`mock-shell-frame ${tone === 'wake' ? 'wake-shell' : ''}`}>
      <header className="mock-shell-header">
        <div className="mock-topbar text-label">
          <div className="mock-topbar-desktop-row">
            <time
              className="mock-topbar-date"
              dateTime={now.toISOString()}
              aria-live="polite"
            >
              {formatMastheadDate(now)}
            </time>
            <div className="mock-topbar-center-slot">
              {navDocked ? (
                <nav
                  className="mock-topbar-center-nav"
                  aria-label="Main navigation"
                >
                  {renderNavLinks(NAV_ITEMS)}
                </nav>
              ) : (
                <p className="mock-topbar-center-copy">
                  Daily Devotionals for the Hungry Soul
                </p>
              )}
            </div>
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
                    ref={accountTriggerRef}
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    onClick={() => setAccountMenuOpen((current) => !current)}
                  >
                    {userInitial}
                  </button>
                  {accountMenuOpen && (
                    <div
                      className="mock-account-menu"
                      role="menu"
                      aria-label="Account menu"
                    >
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

          <div
            className="mock-topbar-mobile-row"
            role="status"
            aria-live="polite"
          >
            {mobileTickerItems.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`mock-topbar-mobile-item ${mobileTopbarIndex === index ? 'is-active' : ''}`}
                aria-hidden={mobileTopbarIndex !== index}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <section className="mock-masthead-block" ref={mastheadRef}>
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

        <nav
          className={`mock-nav text-label${navDocked ? ' is-docked' : ''}`}
          aria-label={navDocked ? undefined : 'Main navigation'}
          aria-hidden={navDocked ? true : undefined}
        >
          <div className="mock-nav-desktop">{renderNavLinks(NAV_ITEMS)}</div>
          <div className="mock-nav-mobile">
            {renderMobileNav('mock-mobile-nav-panel')}
          </div>
        </nav>
      </header>
    </div>
  )
}
