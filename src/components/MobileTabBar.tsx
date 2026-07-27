'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { hapticTick } from '@/lib/haptics'

/**
 * SA-024 — Platform-adaptive IA: the mobile bottom tab bar.
 *
 * Carries the five primary DESTINATIONS on mobile (the top bar carries
 * identity + utilities only — the two never duplicate). Desktop keeps the
 * editorial masthead and never renders this (display: none ≥ 768px).
 * Anchors: Open (dark minimal tab bar), Calm, Headspace.
 *
 * TODAY doubles as the reading tab: /daily-bread is the canonical reader
 * for the active plan, so it lights the same tab a returning reader expects.
 */
const TABS: Array<{
  href: string
  label: string
  isActive: (pathname: string) => boolean
  icon: React.ReactNode
}> = [
  {
    href: '/today',
    label: 'TODAY',
    isActive: (p) => p === '/today' || p.startsWith('/daily-bread'),
    icon: (
      // Morning sun over a horizon line — the daily reading.
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 17h16" />
        <path d="M7.5 17a4.5 4.5 0 1 1 9 0" />
        <path d="M12 6.5V4.5M6.2 9.2 4.8 7.8M17.8 9.2l1.4-1.4" />
      </svg>
    ),
  },
  {
    href: '/series',
    label: 'SERIES',
    isActive: (p) => p.startsWith('/series') || p.startsWith('/devotional'),
    icon: (
      // Browse grid.
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="7" height="7" rx="0.5" />
        <rect x="13" y="4" width="7" height="7" rx="0.5" />
        <rect x="4" y="13" width="7" height="7" rx="0.5" />
        <rect x="13" y="13" width="7" height="7" rx="0.5" />
      </svg>
    ),
  },
  {
    href: '/soul-audit',
    label: 'SOUL AUDIT',
    isActive: (p) => p.startsWith('/soul-audit'),
    icon: (
      // Pen nib — "write a few sentences." The flagship, center slot.
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m13.2 5.8 5 5L8 21H3v-5L13.2 5.8Z" />
        <path d="m15.8 3.2 1.6-1.6 5 5-1.6 1.6" />
      </svg>
    ),
  },
  {
    href: '/library',
    label: 'LIBRARY',
    isActive: (p) =>
      p.startsWith('/library') ||
      p.startsWith('/saved') ||
      p.startsWith('/clippings'),
    icon: (
      // Book spines.
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 4v16M10 4v16" />
        <path d="m14 5 4.6-1 3 15.6-4.6 1L14 5Z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'YOU',
    isActive: (p) => p.startsWith('/settings') || p.startsWith('/account'),
    icon: (
      // Person.
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
]

export default function MobileTabBar() {
  const pathname = usePathname() ?? '/'

  return (
    <nav className="mobile-tab-bar" aria-label="Primary">
      {TABS.map((tab) => {
        const active = tab.isActive(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tab-item text-label${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            // D-23 (F-074): subtle haptic tick on tab switch (Android;
            // silent no-op on iOS web / reduced motion).
            onClick={() => hapticTick()}
          >
            {tab.icon}
            <span className="mobile-tab-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
