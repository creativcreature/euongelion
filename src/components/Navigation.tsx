'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const NAV_LINKS = [
  { href: '/soul-audit', label: 'Soul Audit' },
  { href: '/wake-up', label: 'Wake-Up' },
  { href: '/series', label: 'Series' },
  { href: '/settings', label: 'Settings' },
]

type NavigationVariant = 'default' | 'newspaper'

export default function Navigation({
  variant = 'default',
  showSkipLink = true,
}: {
  variant?: NavigationVariant
  showSkipLink?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const pathname = usePathname()
  const isNewspaper = variant === 'newspaper'
  const desktopLinks = isNewspaper
    ? [{ href: '/', label: 'Home' }, ...NAV_LINKS]
    : NAV_LINKS

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : 'unset'
  }, [mobileOpen])

  // Close mobile menu on route change — intentional sync with navigation
  useEffect(() => {
    setMobileOpen(false) // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname])

  const themeIcon =
    theme === 'dark' ? (
      <svg
        className="h-[18px] w-[18px] text-gold"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ) : (
      <svg
        className="h-[18px] w-[18px] text-gold"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    )

  return (
    <>
      {showSkipLink && (
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
      )}

      <nav
        className={`${
          isNewspaper
            ? 'relative flex items-center justify-center px-4 py-3 md:px-[60px] lg:px-20'
            : 'sticky top-0 flex items-center justify-between px-6 py-4 md:px-[60px] lg:px-20'
        }`}
        style={{
          backgroundColor: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          ...(isNewspaper
            ? { borderTop: '1px solid var(--color-border)' }
            : {}),
          zIndex: 'var(--z-sticky)',
        }}
      >
        {!isNewspaper && (
          <Link
            href="/"
            className="text-masthead vw-small text-[var(--color-text-primary)] transition-colors duration-200 hover:text-gold"
          >
            EUANGELION
          </Link>
        )}

        {isNewspaper ? (
          <>
            <div className="hidden items-center gap-8 md:flex">
              {desktopLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`animated-underline text-label vw-small transition-colors duration-200 hover:text-[var(--color-text-primary)] ${
                    pathname === link.href ||
                    (link.href !== '/' && pathname?.startsWith(link.href))
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-muted'
                  }`}
                >
                  {link.label.toUpperCase()}
                </Link>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="absolute right-4 hidden h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface md:flex"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {themeIcon}
            </button>
          </>
        ) : (
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`animated-underline text-label vw-small transition-colors duration-200 hover:text-[var(--color-text-primary)] ${
                  pathname === link.href ||
                  (link.href !== '/' && pathname?.startsWith(link.href))
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-muted'
                }`}
              >
                {link.label.toUpperCase()}
              </Link>
            ))}

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {themeIcon}
            </button>
          </div>
        )}

        {/* Right: Mobile hamburger + theme toggle */}
        <div
          className={`flex items-center gap-3 md:hidden ${isNewspaper ? 'ml-auto' : ''}`}
        >
          <button
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg
                className="h-5 w-5 text-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface"
            aria-label={
              mobileOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={mobileOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{
            backgroundColor: 'var(--color-overlay)',
            backdropFilter: 'blur(4px)',
            zIndex: 'var(--z-overlay)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed bottom-0 right-0 top-0 w-[280px] bg-tehom p-8 shadow-xl"
            style={{
              zIndex: 'var(--z-modal)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center text-muted transition-colors duration-200 hover:text-scroll"
              aria-label="Close navigation menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Links */}
            <nav className="mt-20 space-y-6">
              <Link
                href="/"
                className="block text-label vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                HOME
              </Link>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block text-label vw-small transition-colors duration-200 hover:text-[var(--color-text-primary)] ${
                    pathname === link.href ||
                    (link.href !== '/' && pathname?.startsWith(link.href))
                      ? 'text-gold'
                      : 'text-muted'
                  }`}
                >
                  {link.label.toUpperCase()}
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-label vw-small leading-relaxed text-muted">
                SOMETHING TO HOLD ONTO.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
