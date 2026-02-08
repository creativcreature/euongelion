'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

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
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
  }, [isOpen])

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <nav className="flex items-center justify-between px-6 py-8 md:px-[60px] lg:px-20">
        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          style={{ transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
        >
          <svg
            className="h-6 w-6 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-hidden="true"
          >
            {isOpen ? (
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

        {/* Brand */}
        <Link href="/" className="text-masthead vw-small text-muted">
          EUANGELION
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          style={{ transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }}
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
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </nav>

      {/* Slide-out Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 transition-opacity duration-500"
          style={{
            backgroundColor: 'var(--color-overlay)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 top-0 w-full transform bg-tehom p-12 shadow-xl transition-transform duration-500 md:w-[480px] md:p-16"
            style={{
              transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-8 top-8 flex h-11 w-11 items-center justify-center text-muted transition-all duration-300 hover:rotate-90 hover:text-scroll focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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

            {/* Menu Items */}
            <nav className="mt-24 max-h-[60vh] space-y-8 overflow-y-auto md:mt-32 md:space-y-10">
              <div className="mb-6">
                <p className="text-label vw-small mb-4 text-muted">
                  DAILY DEVOTIONALS
                </p>
                <div className="space-y-6">
                  <MenuItem
                    number="01"
                    label="Identity Crisis"
                    href="/wake-up/series/identity"
                    onClick={() => setIsOpen(false)}
                    delay={0}
                  />
                  <MenuItem
                    number="02"
                    label="Peace"
                    href="/wake-up/series/peace"
                    onClick={() => setIsOpen(false)}
                    delay={1}
                  />
                  <MenuItem
                    number="03"
                    label="Community"
                    href="/wake-up/series/community"
                    onClick={() => setIsOpen(false)}
                    delay={2}
                  />
                  <MenuItem
                    number="04"
                    label="Kingdom"
                    href="/wake-up/series/kingdom"
                    onClick={() => setIsOpen(false)}
                    delay={3}
                    isGold
                  />
                  <MenuItem
                    number="05"
                    label="Provision"
                    href="/wake-up/series/provision"
                    onClick={() => setIsOpen(false)}
                    delay={4}
                  />
                  <MenuItem
                    number="06"
                    label="Truth"
                    href="/wake-up/series/truth"
                    onClick={() => setIsOpen(false)}
                    delay={5}
                  />
                  <MenuItem
                    number="07"
                    label="Hope"
                    href="/wake-up/series/hope"
                    onClick={() => setIsOpen(false)}
                    delay={6}
                  />
                </div>
              </div>

              <div
                className="pt-6"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <p className="text-label vw-small mb-4 text-muted">EXPLORE</p>
                <div className="space-y-6">
                  <MenuItem
                    number="—"
                    label="Home"
                    href="/"
                    onClick={() => setIsOpen(false)}
                    delay={7}
                  />
                  <MenuItem
                    number="—"
                    label="Soul Audit"
                    href="/soul-audit"
                    onClick={() => setIsOpen(false)}
                    delay={8}
                  />
                  <MenuItem
                    number="—"
                    label="All Series"
                    href="/series"
                    onClick={() => setIsOpen(false)}
                    delay={9}
                  />
                  <MenuItem
                    number="—"
                    label="Wake Up Magazine"
                    href="/wake-up"
                    onClick={() => setIsOpen(false)}
                    delay={10}
                  />
                  <MenuItem
                    number="—"
                    label="Settings"
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    delay={11}
                  />
                  <MenuItem
                    number="—"
                    label="About"
                    href="/about"
                    onClick={() => setIsOpen(false)}
                    delay={12}
                    disabled
                  />
                </div>
              </div>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12 md:bottom-16 md:left-16 md:right-16">
              <p
                className="text-label vw-small leading-relaxed text-muted opacity-0"
                style={{
                  animation:
                    'fadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  animationDelay: '0.5s',
                }}
              >
                SOMETHING TO HOLD ONTO.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MenuItem({
  number,
  label,
  href,
  disabled = false,
  onClick,
  delay = 0,
  isGold = false,
}: {
  number: string
  label: string
  href: string
  disabled?: boolean
  onClick?: () => void
  delay?: number
  isGold?: boolean
}) {
  const delayStyles = {
    animationDelay: `${100 + delay * 60}ms`,
    animationFillMode: 'forwards' as const,
    opacity: 0,
  }

  const content = (
    <div
      className="fade-in group flex items-start gap-6 md:gap-8"
      style={delayStyles}
    >
      <span
        className={`vw-small mt-1 font-sans ${disabled ? 'text-tertiary' : isGold ? 'text-gold' : 'text-muted'}`}
      >
        {number}
      </span>
      <span
        className={`text-nav vw-body-lg transition-all duration-300 ${disabled ? 'text-tertiary' : 'text-scroll'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }}
      >
        <span
          className={
            !disabled
              ? 'inline-block transition-all duration-300 group-hover:translate-x-2 group-hover:text-gold'
              : ''
          }
          style={
            !disabled
              ? { transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }
              : undefined
          }
        >
          {label}
        </span>
      </span>
    </div>
  )

  if (disabled) {
    return <div className="cursor-not-allowed opacity-40">{content}</div>
  }

  return (
    <Link href={href} onClick={onClick}>
      {content}
    </Link>
  )
}
