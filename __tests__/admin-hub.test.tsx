/**
 * SA-114 / F-158 — the real admin hub + the Settings doorway.
 *
 * The old /admin dashboard was a mockup with invented numbers ("12 pending
 * submissions", "3 channels active", "$2,140 this cycle", "247 events in
 * 7 days") — exactly what Development Rule 6 forbids. The contract now:
 *
 *  1. The hub is link cards to real surfaces: the Edition Queue (with the
 *     REAL draft count read through getReviewQueue), the Daily Bread
 *     preview, the next-series thematic box, and the GitHub reading gate.
 *  2. A failed queue read looks broken (Rule 1) — a visible alert carrying
 *     the database's message, never a plausible "0 drafts".
 *  3. None of the fabricated strings survive — in the rendered DOM or in
 *     the admin page sources on disk.
 *  4. Settings shows an ADMIN doorway card only when the probe to
 *     GET /api/admin/edition answers 200; a 403 renders nothing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import AdminDashboardPage from '@/app/admin/page'
import SettingsPage from '@/app/settings/page'

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))
vi.mock('@/components/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
}))
vi.mock('@/components/SiteBottom', () => ({
  default: () => <div data-testid="site-bottom" />,
}))
vi.mock('@/components/Breadcrumbs', () => ({
  default: () => <nav data-testid="breadcrumbs" />,
}))
// Avoid pulling Capacitor/RevenueCat native bridges into jsdom.
vi.mock('@/lib/billing/purchases', () => ({
  detectBillingPlatform: vi.fn(async () => 'web' as const),
  purchasePlanOnIos: vi.fn(async () => {}),
  restoreIosPurchases: vi.fn(async () => {}),
}))

// The hub reads the queue server-side; the store is the seam (same seam the
// edition-admin-api test mocks).
const getReviewQueue = vi.fn(async () => [] as unknown[])
vi.mock('@/lib/edition/store', () => ({
  getReviewQueue: () => getReviewQueue(),
}))

const FABRICATED_STRINGS = [
  '12 pending submissions',
  '3 channels active',
  '$2,140',
  '247 events in 7 days',
  'PUB-2081',
  'LOG-9012',
]

describe('admin hub (SA-114 / F-158)', () => {
  beforeEach(() => {
    getReviewQueue.mockReset()
    getReviewQueue.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders link cards for the edition queue, preview, next-series box, and reading gate', async () => {
    getReviewQueue.mockResolvedValue([{}, {}, {}])
    render(await AdminDashboardPage())

    const queueCard = screen.getByTestId('hub-card-edition-queue')
    expect(queueCard).toHaveAttribute('href', '/admin/edition')
    // The count is the REAL queue length, not an invented figure.
    expect(queueCard.textContent).toContain('3 drafts awaiting review')
    expect(getReviewQueue).toHaveBeenCalledTimes(1)

    const previewCard = screen.getByTestId('hub-card-daily-bread-preview')
    expect(previewCard).toHaveAttribute('href', '/admin/preview/daily-bread')
    expect(previewCard.textContent).toMatch(
      /Tomorrow.s paper, rendered real, with approve\/reject in place\./,
    )

    const nextSeriesCard = screen.getByTestId('hub-card-next-series')
    expect(nextSeriesCard).toHaveAttribute('href', '/admin/edition#next-series')
    expect(nextSeriesCard.textContent).toContain('thematic')

    const gateCard = screen.getByTestId('hub-card-reading-gate')
    expect(gateCard).toHaveAttribute(
      'href',
      'https://github.com/creativcreature/euongelion/pulls?q=is%3Apr+is%3Aopen+label%3A%22reading+gate%22',
    )
    // Honest copy: approval happens on GitHub, not via a button here.
    expect(gateCard.textContent).toMatch(/merge-on-GitHub/i)
  })

  it('uses the singular form for exactly one waiting draft', async () => {
    getReviewQueue.mockResolvedValue([{}])
    render(await AdminDashboardPage())
    expect(screen.getByTestId('hub-card-edition-queue').textContent).toContain(
      '1 draft awaiting review',
    )
  })

  it('shows a visible failure when the queue read throws — never a plausible zero', async () => {
    getReviewQueue.mockRejectedValue(
      new Error('review queue read failed: connection refused'),
    )
    render(await AdminDashboardPage())

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(
      'review queue read failed: connection refused',
    )
    expect(screen.queryByText(/drafts? awaiting review/)).toBeNull()
  })

  it('carries no fabricated numbers — rendered DOM and page sources', async () => {
    render(await AdminDashboardPage())
    for (const fake of FABRICATED_STRINGS) {
      expect(
        screen.queryByText(new RegExp(fake.replace(/[$()]/g, '\\$&'))),
        `fabricated string "${fake}" still rendered`,
      ).toBeNull()
    }

    // Belt and braces: none of the admin page sources still contain the old
    // invented figures either.
    for (const file of [
      'src/app/admin/page.tsx',
      'src/app/admin/moderation/page.tsx',
      'src/app/admin/transparency/page.tsx',
      'src/app/admin/audit-logs/page.tsx',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(
        source.includes('12 pending submissions'),
        `${file} still contains "12 pending submissions"`,
      ).toBe(false)
      expect(source.includes('$2,140'), `${file} still contains "$2,140"`).toBe(
        false,
      )
      expect(
        source.includes('247 events'),
        `${file} still contains "247 events"`,
      ).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// The Settings doorway — ADMIN card gated on the /api/admin/edition probe.
// Fetch-mock style copied from account-surface.test.tsx (signed-in settings).
// ─────────────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Mutable per-test: what the admin probe answers.
const probeState = { status: 200 }

const settingsFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input)
  if (url.includes('/api/admin/edition')) {
    return probeState.status === 200
      ? jsonResponse({ ok: true, items: [] })
      : jsonResponse({ error: 'Forbidden.' }, probeState.status)
  }
  if (url.includes('/api/auth/session')) {
    return jsonResponse({
      authenticated: true,
      user: { email: 'reader@example.com' },
    })
  }
  if (url.includes('/api/user/profile')) {
    return jsonResponse({ ok: true, fullName: 'Milo Parker' })
  }
  if (url.includes('/api/billing/config')) {
    return jsonResponse({
      paymentsEnabled: { iosIap: false, webStripe: false },
      plans: [],
      supportsBillingPortal: false,
    })
  }
  if (url.includes('/api/billing/entitlements')) {
    return jsonResponse({
      ok: true,
      authenticated: true,
      entitlements: {
        premiumActive: false,
        subscriptionTier: 'free',
        subscriptionRenewsAt: null,
        premiumExpiresAt: null,
      },
    })
  }
  if (url.includes('/api/mock-account/session')) {
    return jsonResponse({
      ok: true,
      mode: 'anonymous',
      analyticsOptIn: false,
      capabilities: [],
      retention: {
        anonymousSessionDays: 30,
        bookmarksDays: 365,
        notesDays: 365,
        highlightsDays: 365,
        chatHistoryDays: 90,
        archivedArtifactsDays: 365,
        trashRestoreWindowDays: 30,
      },
      retentionSummary: {},
    })
  }
  if (url.includes('/api/brain/preferences')) {
    return jsonResponse({ ok: true })
  }
  if (url.includes('/api/push/preferences')) {
    return jsonResponse({
      ok: true,
      configured: false,
      subscribed: false,
      window: null,
      timezone: null,
    })
  }
  throw new Error(`Unexpected fetch in admin-hub settings test: ${url}`)
})

describe('settings ADMIN doorway (SA-114 / F-158)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    settingsFetch.mockClear()
    probeState.status = 200
    vi.stubGlobal('fetch', settingsFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  function probeWasCalled() {
    return settingsFetch.mock.calls.some((call) =>
      String(call[0]).includes('/api/admin/edition'),
    )
  }

  it('shows the ADMIN card when the probe answers 200', async () => {
    probeState.status = 200
    render(<SettingsPage />)

    const card = await screen.findByRole('region', { name: 'ADMIN' })
    const openLink = await screen.findByRole('link', { name: 'OPEN ADMIN' })
    expect(card.contains(openLink)).toBe(true)
    expect(openLink).toHaveAttribute('href', '/admin')
  })

  it('renders nothing admin-shaped when the probe answers 403', async () => {
    probeState.status = 403
    render(<SettingsPage />)

    // Wait until the probe has actually run and settled, so absence is a
    // verdict rather than a not-yet.
    await waitFor(() => expect(probeWasCalled()).toBe(true))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'ADMIN' })).toBeNull(),
    )
    expect(screen.queryByRole('link', { name: 'OPEN ADMIN' })).toBeNull()
    expect(document.getElementById('admin')).toBeNull()
  })
})
