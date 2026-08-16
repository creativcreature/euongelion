'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ActivePlanBadge from './ActivePlanBadge'
import GlobalSearchOverlay from './GlobalSearchOverlay'
import { useSettingsStore } from '@/stores/settingsStore'

// SA-024 — platform-adaptive IA. Desktop masthead carries the full
// destination set (horizontal space allows it): Daily Bread + Library
// return to primary nav, undoing the Phase-1.4 demotion into the avatar
// menu. On mobile, destinations live in the persistent bottom tab bar
// (MobileTabBar: Today · Series · Soul Audit · Library · You); the mobile
// top bar carries identity + utilities ONLY, and the hamburger holds just
// the overflow that has no tab (How We Write, help, auth) — the two
// surfaces never duplicate a destination.
const DESKTOP_NAV_ITEMS = [
  // Founder 2026-08-16: "change the Home menu item to an icon of a biblical
  // style home." Drawn as a Near-Eastern house — flat roof, outer stair, an
  // arched door — not the pitched-roof pictogram every app ships. The label
  // stays in the accessible name so the link is still "Home" to a screen
  // reader and to anyone who hovers it.
  { href: '/', label: 'HOME', icon: 'home' as const },
  // Founder direction 2026-08-15: TODAY and DAILY BREAD were two labels on
  // ONE destination (/daily-bread), so both lit as active at the same time and
  // the nav read as duplicated. Collapsed to a single DAILY BREAD entry, and
  // placed directly after HOME — the daily reading is the point of the site,
  // so it sits first among the destinations. SA-033's ruling still holds:
  // "today" means YOUR devotional via the Daily Bread resolver, not the
  // /today editorial rotation, which stays reachable in the footer.
  // SA-059: the two swapped. DAILY BREAD is the shared daily edition (the
  // paper); TODAY is YOUR plan reading. Founder 2026-08-16: "Daily Bread
  // should be the Today page, and Today page should be the Daily Bread page.
  // The Daily Edition, is now The Daily Bread."
  { href: '/today', label: 'TODAY' },
  // Founder 2026-08-16: /today is no longer a second label for the daily
  // reading — it is the Daily Edition, a distinct page carrying the reading
  // plus dispatches, community and the prayer list. SA-033's ruling that
  // "today" means YOUR devotional still holds for DAILY BREAD; this is the
  // edition, and it earns its own entry.
  { href: '/daily-bread', label: 'DAILY BREAD' },
  { href: '/soul-audit', label: 'SOUL AUDIT' },
  { href: '/series', label: 'SERIES' },
  { href: '/library', label: 'LIBRARY' },
  // Founder 2026-08-16: "menu item should only be in footer" — HOW WE WRITE
  // is a colophon, not a destination. It lives in SiteBottom's RESOURCES
  // column and is gone from the primary nav.
]
const MOBILE_OVERFLOW_ITEMS = [
  // HOME lives here too (founder report 2026-07-10): the wordmark links
  // home, but an explicit entry keeps it discoverable. Not a tab-bar
  // duplicate — "/" is deliberately not a tab destination under SA-024.
  { href: '/', label: 'HOME', icon: 'home' as const },
  // HOW WE WRITE is footer-only (founder 2026-08-16) — out of the hamburger
  // as well as the desktop bar. It is a colophon, not a destination.
]

/**
 * A biblical-style house (F-098).
 *
 * Founder 2026-08-16: "change the Home menu item to an icon of a biblical
 * style home." A first-century Levantine house, not a gingerbread cottage:
 * flat roof with a parapet, an external stair to the roof where people slept
 * and prayed, an arched doorway, one small high window. Single stroke weight
 * so it sits at the same visual density as the caps beside it.
 */
function HomeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mock-nav-home"
      aria-hidden="true"
      focusable="false"
    >
      {/* Solid, not line (founder 2026-08-16). Filled silhouette of a
          first-century Levantine house — flat roof oversailing the walls as
          the parapet Deut. 22:8 requires, and a tall arched door cut out of
          the mass. The door is a hole in the fill rather than a stroke, so the
          whole mark reads at 14px the way a glyph does. */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 6.6h20v2.1h-1.4V21H3.4V8.7H2V6.6Zm7.6 12.3h4.8v-4.6a2.4 2.4 0 0 0-4.8 0v4.6Z"
      />
    </svg>
  )
}

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
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null)
  const mastheadRef = useRef<HTMLElement | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  // Use null initial state to avoid hydration mismatch from Date.now()
  // differing between server and client renders
  const [now, setNow] = useState<Date | null>(null)
  const [mobileTopbarIndex, setMobileTopbarIndex] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navDocked, setNavDocked] = useState(false)
  // F-071 — global search. The header owns the open state so both entry
  // points (desktop utilities row + mobile top bar) drive one overlay.
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSeed, setSearchSeed] = useState('')

  const mobileTickerItems = useMemo(
    () => [
      now ? formatMastheadDate(now) : '',
      'The Good News, for You. Every Day.',
    ],
    [now],
  )

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
    mobileToggleRef.current?.focus()
  }, [])

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchSeed('')
  }, [])

  // F-071: Cmd/Ctrl+K toggles the global search from anywhere.
  useEffect(() => {
    function handleSearchHotkey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setSearchOpen((current) => !current)
    }
    window.addEventListener('keydown', handleSearchHotkey)
    return () => window.removeEventListener('keydown', handleSearchHotkey)
  }, [])

  // F-071: honor the advertised SearchAction deep link. The homepage
  // schema targets /?search={query}; the header renders on every route,
  // so any landing URL carrying ?search= opens the overlay pre-filled.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const seed = params.get('search')?.trim()
    if (!seed) return
    setSearchSeed(seed)
    setSearchOpen(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // F-067: the reader's "Aa" sheet changes the site base theme when a named
  // reading theme is picked (Ink/Night sit on dark, Parchment/Vellum on
  // light). It announces the change so this toggle's sun/moon state never
  // goes stale while both are on screen.
  useEffect(() => {
    function syncFromReaderSheet(event: Event) {
      const detail = (event as CustomEvent<{ theme?: string }>).detail
      if (detail?.theme === 'dark' || detail?.theme === 'light') {
        setTheme(detail.theme)
      }
    }
    window.addEventListener('euangelion:site-theme', syncFromReaderSheet)
    return () =>
      window.removeEventListener('euangelion:site-theme', syncFromReaderSheet)
  }, [])

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // Clear scroll-lock artifacts on mount and route changes
  useEffect(() => {
    clearGlobalScrollLocks()
  }, [pathname])

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

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      closeMobileMenu()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen, closeMobileMenu])

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
    if (reducedMotion || mobileTickerItems.length <= 1) return

    const timer = window.setInterval(
      () =>
        setMobileTopbarIndex(
          (prev) => (prev + 1) % Math.max(1, mobileTickerItems.length),
        ),
      MOBILE_TICKER_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [mobileTickerItems.length])

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

  // Close menus and clear scroll locks on route change
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    setAccountMenuOpen(false)
    setMobileMenuOpen(false)
  }, [pathname])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    // F-067: an explicit site-theme change dissolves any reader-scoped
    // reading-theme override (Vellum/Night), so this toggle is never a
    // visual no-op inside the reader — the reader falls back to following
    // the site theme (Ink on dark, Parchment on light).
    useSettingsStore.getState().setReadingTheme(null)
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
    // /my-devotional is a legacy alias for YOUR reading, which is /today
    // since SA-059 — so it lights TODAY, not DAILY BREAD.
    if (href === '/today') {
      return pathname === '/today' || pathname?.startsWith('/my-devotional')
    }
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  const renderNavLinks = (items: typeof DESKTOP_NAV_ITEMS) =>
    items.map((item, index) => {
      const active = isNavItemActive(item.href)
      return (
        <span key={item.href} className="mock-nav-item-wrap">
          <Link
            href={item.href}
            className={`mock-nav-item ${active ? 'is-active' : ''} ${
              'icon' in item && item.icon ? 'mock-nav-item--icon' : ''
            }`}
            aria-current={active ? 'page' : undefined}
            aria-label={'icon' in item && item.icon ? 'Home' : undefined}
            title={'icon' in item && item.icon ? 'Home' : undefined}
          >
            {'icon' in item && item.icon === 'home' ? <HomeMark /> : item.label}
          </Link>
          {index < items.length - 1 && <span aria-hidden="true">|</span>}
        </span>
      )
    })

  return (
    <div className={`mock-shell-frame ${tone === 'wake' ? 'wake-shell' : ''}`}>
      <header className="mock-shell-header">
        <div
          className="mock-topbar text-label"
          data-nav-docked={navDocked || undefined}
        >
          <div className="mock-topbar-desktop-row">
            <time
              className="mock-topbar-date"
              dateTime={now?.toISOString() ?? ''}
              aria-live="polite"
              suppressHydrationWarning
            >
              {now ? formatMastheadDate(now) : '\u00A0'}
            </time>
            <div className="mock-topbar-center-slot">
              {navDocked ? (
                <nav
                  className="mock-topbar-center-nav"
                  aria-label="Main navigation"
                >
                  {renderNavLinks(DESKTOP_NAV_ITEMS)}
                </nav>
              ) : (
                <p className="mock-topbar-center-copy">
                  The Good News, for You. Every Day.
                </p>
              )}
            </div>
            <div className="mock-topbar-actions">
              <ActivePlanBadge variant="header" />
              {/* Utility controls (theme + account) are grouped and
                  visually separated from the resume pill so ambient
                  metadata, the primary returning-user action, and site
                  utilities read as three distinct tiers. The divider is
                  hidden when no resume pill precedes it. */}
              <span
                className="mock-topbar-divider"
                aria-hidden="true"
                data-divider="true"
              />
              <div className="mock-topbar-utilities">
                {/* F-071: global search entry — SA-024 puts search in the
                    masthead utilities tier, never the mobile tab bar. */}
                <button
                  type="button"
                  className="mock-icon-control mock-search-toggle"
                  onClick={openSearch}
                  aria-label="Search"
                  aria-haspopup="dialog"
                  aria-expanded={searchOpen}
                  title="Search (⌘K / Ctrl+K)"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="mock-icon-control mock-mode-toggle"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="4.2" />
                      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.6 6.6 0 0 0 10.8 10.8Z" />
                    </svg>
                  )}
                </button>
                {authLoading ? (
                  <span className="mock-auth-loading" aria-hidden="true" />
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
                          href="/library"
                          role="menuitem"
                          className="mock-account-item"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Library
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
                  /* Audit Manus §1 (HOMEPAGE-AUDIT-2026-05-11): the audit
                   flagged inline SIGN IN / SIGN UP links as competing
                   with the masthead. Demoted to a single user-icon
                   button matching the authenticated avatar-menu
                   pattern. Click opens a quiet popover with both
                   links. */
                  <div className="mock-account-wrap" ref={accountMenuRef}>
                    <button
                      type="button"
                      className="mock-account-trigger"
                      ref={accountTriggerRef}
                      aria-haspopup="menu"
                      aria-expanded={accountMenuOpen}
                      aria-label="Sign in or sign up"
                      onClick={() => setAccountMenuOpen((current) => !current)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </button>
                    {accountMenuOpen && (
                      <div
                        className="mock-account-menu"
                        role="menu"
                        aria-label="Account"
                      >
                        <Link
                          href={`/auth/sign-in?redirect=${redirectPath}`}
                          role="menuitem"
                          className="mock-account-item"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Sign in
                        </Link>
                        <Link
                          href={`/auth/sign-up?redirect=${redirectPath}`}
                          role="menuitem"
                          className="mock-account-item"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Sign up
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mock-topbar-mobile-row">
            {/* SA-024: the mobile top bar carries utilities. The theme toggle
                takes the left track (it also serves as the optical
                counterweight to the menu button on the right — the ticker
                stays centered between two equal-weight controls). Before
                this, mobile had NO theme toggle outside Settings.
                F-071: the global-search glyph joins it in the same left
                utility group — search is a TOP-bar utility per SA-024 and
                never enters the tab bar. Pairing the two compact controls
                on the left keeps the ticker's center track closest to
                optical center against the 44px menu button on the right. */}
            <div className="mock-topbar-mobile-utils">
              <button
                type="button"
                className="mock-icon-control mock-mode-toggle mock-topbar-mobile-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4.2" />
                    <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.6 6.6 0 0 0 10.8 10.8Z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="mock-icon-control mock-mode-toggle mock-topbar-mobile-toggle mock-search-toggle"
                onClick={openSearch}
                aria-label="Search"
                aria-haspopup="dialog"
                aria-expanded={searchOpen}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
            {/* Ambient masthead furniture: the rolling date + tagline. The
                cross-fade stage is its own positioning context (min-width:0,
                bounded grid cell) so the absolutely-stacked ticker items can
                never bleed under the menu button \u2014 they are clipped to this
                track, not the whole row. */}
            <div
              className="mock-topbar-mobile-ticker"
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
            <button
              type="button"
              ref={mobileToggleRef}
              className="mock-mobile-menu-toggle text-label"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-controls={
                mobileMenuOpen ? 'shell-mobile-secondary-nav' : undefined
              }
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? '\u2715' : '\u2630'}
            </button>
          </div>
        </div>

        {/* Mobile secondary nav panel — unmounted when closed */}
        {mobileMenuOpen && (
          <div
            id="shell-mobile-secondary-nav"
            className="mock-mobile-secondary-nav"
            role="group"
            aria-label="Navigation menu"
          >
            <ActivePlanBadge variant="header" className="mock-nav-item" />
            {renderNavLinks(MOBILE_OVERFLOW_ITEMS)}
            {/* SA-024: no ACCOUNT link here — Settings is the YOU tab in the
                bottom tab bar; the hamburger never duplicates a destination. */}
            {/* Mobile/desktop parity: Help lives in the desktop account menu but
                was unreachable from the mobile menu (a mobile-first audience). */}
            <Link
              href="/help"
              className="mock-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              HELP
            </Link>
            {!authLoading && !authenticated && (
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
            )}
          </div>
        )}

        <section
          className="mock-masthead-block"
          ref={mastheadRef}
          aria-label="Euangelion"
        >
          {/* Brand wordmark. Was an h1; demoted (a11y, R34) — and now a
              LINK home (founder report 2026-07-10: after SA-024 moved
              destinations to the tab bar, mobile had NO route to "/" —
              the wordmark is the newspaper-standard home affordance). */}
          <div className="text-masthead mock-masthead-word">
            <Link
              href="/"
              aria-label="Euangelion — home"
              className="mock-masthead-home-link"
            >
              <span className="js-shell-masthead-fit mock-masthead-text">
                {brandWord}
              </span>
            </Link>
          </div>
          {tone !== 'wake' && (
            <p className="mock-masthead-pronunciation text-label">
              EU•AN•GE•LION (YOO-AN-GEL-EE-ON) ·{' '}
              <span lang="grc" className="mock-masthead-greek">
                εὐαγγέλιον
              </span>{' '}
              — Good News
            </p>
          )}
        </section>

        <nav
          className={`mock-nav text-label${navDocked ? ' is-docked' : ''}`}
          aria-label={navDocked ? undefined : 'Main navigation'}
          aria-hidden={navDocked ? true : undefined}
        >
          <div className="mock-nav-desktop">
            {renderNavLinks(DESKTOP_NAV_ITEMS)}
          </div>
        </nav>
      </header>

      {/* F-071: one overlay instance serves both entry points + Cmd/Ctrl+K.
          Rendered inside the shell frame so it inherits the .mock-home
          theme tokens (light/dark paper) on every surface. */}
      <GlobalSearchOverlay
        open={searchOpen}
        initialQuery={searchSeed}
        onClose={closeSearch}
      />
    </div>
  )
}
