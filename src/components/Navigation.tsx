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

      <nav className="flex items-center justify-between px-6 py-8 md:px-12 lg:px-20">
        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
        >
          <svg
            className="h-6 w-6 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
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
        <Link href="/" className="text-label vw-small text-gray-500">
          EUANGELION
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
          className="fixed inset-0 z-40 transition-opacity duration-500"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 top-0 z-50 w-full transform bg-cream p-12 shadow-2xl transition-transform duration-500 dark:bg-[hsl(0,0%,12%)] md:w-[480px] md:p-16"
            style={{
              transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-8 top-8 flex h-10 w-10 items-center justify-center text-gray-400 transition-all duration-300 hover:rotate-90 hover:text-black dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
                <p className="text-label vw-small mb-4 text-gray-400">
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

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <p className="text-label vw-small mb-4 text-gray-400">
                  EXPLORE
                </p>
                <div className="space-y-6">
                  <MenuItem
                    number="—"
                    label="Wake Up Magazine"
                    href="/wake-up"
                    onClick={() => setIsOpen(false)}
                    delay={7}
                  />
                  <MenuItem
                    number="—"
                    label="About"
                    href="/about"
                    onClick={() => setIsOpen(false)}
                    delay={8}
                    disabled
                  />
                </div>
              </div>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12 md:bottom-16 md:left-16 md:right-16">
              <p
                className="text-label vw-small leading-relaxed text-gray-400 opacity-0"
                style={{
                  animation: 'fadeIn 0.6s ease forwards',
                  animationDelay: '0.6s',
                }}
              >
                VENERATE THE MIRACLE.
                <br />
                DISMANTLE THE HAVEL.
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
    animationDelay: `${0.1 + delay * 0.05}s`,
    animationFillMode: 'forwards' as const,
    opacity: 0,
  }

  const content = (
    <div
      className="fade-in group flex items-start gap-6 md:gap-8"
      style={delayStyles}
    >
      <span
        className={`vw-small mt-1 font-sans ${disabled ? 'text-gray-300 dark:text-gray-600' : isGold ? 'text-gold' : 'text-gray-400'}`}
      >
        {number}
      </span>
      <span
        className={`text-nav vw-body-lg transition-all duration-300 ${disabled ? 'text-gray-300 dark:text-gray-600' : 'text-black dark:text-cream'}`}
      >
        <span
          className={
            !disabled
              ? 'inline-block transition-all duration-300 group-hover:translate-x-2 group-hover:text-gold'
              : ''
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
