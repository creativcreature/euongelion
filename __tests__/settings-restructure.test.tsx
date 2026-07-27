/**
 * F-073 — settings restructure smoke test.
 *
 * The 1,790-line single scroll became grouped cards (READING · REMINDERS ·
 * ACCOUNT · AI & KEYS · DATA & PRIVACY · ABOUT) under a light profile
 * header. The contract here:
 *
 *  1. Every control that existed before the restructure still renders —
 *     enumerated one by one below, nothing lost.
 *  2. The group cards and profile header render with stable ids
 *     (deep links: /settings#tutorial must keep working for the Help hub).
 *  3. No "coming soon" / "when this ships" copy for unshipped features —
 *     the billing block simply does not render when checkout is closed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import SettingsPage from '@/app/settings/page'

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))
vi.mock('@/components/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input)
  if (url.includes('/api/billing/config')) {
    // Checkout is closed (the real production state) — the page must NOT
    // render subscribe UI or any "coming soon" placeholder for it.
    return jsonResponse({
      paymentsEnabled: { iosIap: false, webStripe: false },
      plans: [
        {
          id: 'premium-monthly',
          name: 'Premium Monthly',
          priceLabel: '$5/mo',
          description: 'Everything, monthly.',
        },
      ],
      supportsBillingPortal: true,
    })
  }
  if (url.includes('/api/mock-account/session')) {
    return jsonResponse({
      ok: true,
      mode: 'anonymous',
      analyticsOptIn: false,
      capabilities: ['bookmarks', 'resume'],
      retention: {
        anonymousSessionDays: 30,
        bookmarksDays: 365,
        notesDays: 365,
        highlightsDays: 365,
        chatHistoryDays: 90,
        archivedArtifactsDays: 365,
        trashRestoreWindowDays: 30,
      },
      retentionSummary: { anonymousSession: '30 days' },
    })
  }
  if (url.includes('/api/auth/session')) {
    return jsonResponse({ authenticated: false, user: null })
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
  throw new Error(`Unexpected fetch in settings smoke test: ${url}`)
})

describe('settings restructure (F-073)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  async function renderSettings() {
    render(<SettingsPage />)
    // Wait until the auth-session hydration resolves so the profile header
    // has settled out of its "Checking your session…" state.
    await waitFor(() =>
      expect(
        screen.getAllByText(/reading anonymously/i).length,
      ).toBeGreaterThan(0),
    )
  }

  it('renders the profile header and all six group cards with stable ids', async () => {
    await renderSettings()

    // Light profile header — anonymous state invites sign-in, quietly.
    expect(screen.getAllByText(/reading anonymously/i).length).toBeGreaterThan(
      0,
    )
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    )

    for (const [id, name] of [
      ['reading', 'READING'],
      ['reminders', 'REMINDERS'],
      ['account', 'ACCOUNT'],
      ['ai-keys', 'ADVANCED — AI & KEYS'],
      ['data-privacy', 'DATA & PRIVACY'],
      ['about', 'ABOUT'],
    ] as const) {
      const card = document.getElementById(id)
      expect(card, `card #${id} missing`).not.toBeNull()
      expect(
        screen.getByRole('region', { name }),
        `card region ${name} missing`,
      ).toBeTruthy()
    }

    // Deep-link anchor the Help hub relies on (/settings#tutorial).
    expect(document.getElementById('tutorial')).not.toBeNull()

    // F-066 (SA-025): the gentle presence row lives in the profile header —
    // presence-framed label, zero visible numbers, zero streak language.
    const presenceRow = await screen.findByTestId('presence-week-row')
    const profileRegion = screen.getByRole('region', { name: 'Profile' })
    expect(profileRegion.contains(presenceRow)).toBe(true)
    expect(presenceRow.textContent).toContain('THIS WEEK')
    expect(presenceRow.textContent).not.toMatch(/\d/)
    expect((presenceRow.textContent ?? '').toLowerCase()).not.toMatch(
      /streak|missed/,
    )
    expect(presenceRow.getAttribute('aria-label')).toMatch(
      /^Present \d of 7 days this week\.$/,
    )
  })

  it('preserves every pre-restructure control — enumerated', async () => {
    await renderSettings()

    // READING — appearance.
    for (const label of ['Dark', 'Light', 'System']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    // READING — text size + comfort toggles.
    for (const label of ['Default', 'Large', 'Extra Large']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    expect(screen.getByText(/reduce motion/i)).toBeTruthy()
    expect(screen.getByText(/high contrast mode/i)).toBeTruthy()
    expect(screen.getByText(/reading comfort mode/i)).toBeTruthy()
    // READING — translation + depth. (F-083 settings cleanup
    // 2026-07-27: SABBATH DAY and READING PACE were removed — both
    // promised unlock behavior that founder-disabled day-gating no
    // longer delivers anywhere a reader can see.)
    expect(
      screen.getByRole('combobox', { name: /default bible translation/i }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Saturday' })).toBeNull()
    expect(screen.queryByRole('button', { name: /daily rhythm/i })).toBeNull()
    for (const label of ['5-7 min', '20-30 min', '45-60 min', 'Variable']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    // READING — reading-themes pointer to the in-reader Aa sheet.
    expect(screen.getByText(/ink, parchment, vellum, night/i)).toBeTruthy()

    // REMINDERS — brand-voice picker with all four windows.
    expect(screen.getByText(/one quiet word each morning\./i)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /early morning 5–7/i }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /morning 7–9/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /midday 12–14/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /evening 19–21/i })).toBeTruthy()

    // ACCOUNT — anonymous invitation (no fake sign-out).
    expect(screen.getByRole('link', { name: 'SIGN IN' })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    )

    // AI & KEYS — brains, open web, BYO keys, storage mode, clear, usage.
    // (F-084/SA-033 repair: Google/MiniMax/NVIDIA options retired — the
    // Google model was shut down upstream and the others were exotic
    // BYO-only paths; the mislabeled combined key field is now two
    // honest Anthropic + OpenAI fields.)
    for (const label of ['Auto (Claude-first)', 'Claude/OpenAI']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Google' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'MiniMax' })).toBeNull()
    expect(screen.getByText(/open web mode default/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Session only' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Remember encrypted' }),
    ).toBeTruthy()
    for (const placeholder of ['Anthropic key', 'OpenAI key']) {
      expect(screen.getByPlaceholderText(placeholder)).toBeTruthy()
    }
    expect(screen.queryByPlaceholderText('Google key')).toBeNull()
    expect(
      screen.getByRole('button', { name: /clear all provider keys/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /view usage \+ quota details/i }),
    ).toBeTruthy()

    // DATA & PRIVACY — analytics, retention, account-data gate, chat
    // history. (F-083 settings cleanup 2026-07-27: the pre-real-auth
    // "Mock Account" mode toggle, CAPABILITIES list, and mock export
    // were retired from the UI by founder order.)
    expect(screen.getByText(/optional analytics opt-in/i)).toBeTruthy()
    expect(
      screen.getByText(/retention — what we store, and for how long/i),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /full retention & privacy policy/i }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mock Account' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /export mock account data/i }),
    ).toBeNull()
    expect(screen.getByText(/sign in to use these controls\./i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear History' })).toBeTruthy()

    // ABOUT — walkthrough replays + help + document links.
    expect(screen.getByRole('link', { name: 'REPLAY ONBOARDING' })).toBeTruthy()
    // F-083: REPLAY TUTORIAL removed — its ?tutorial=1 param had no
    // consumer anywhere; the button was a no-op.
    expect(screen.queryByRole('link', { name: 'REPLAY TUTORIAL' })).toBeNull()
    expect(screen.getByRole('link', { name: /open help faq/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /how we write/i })).toHaveAttribute(
      'href',
      '/how-we-write',
    )
    // "Credits & Translations" legitimately appears twice: under the
    // translation picker (READING) and in ABOUT. Both must point at /credits.
    const creditsLinks = screen.getAllByRole('link', {
      name: /credits & translations/i,
    })
    expect(creditsLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of creditsLinks) {
      expect(link).toHaveAttribute('href', '/credits')
    }
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute('href', '/privacy')
    expect(
      screen.getByRole('link', { name: 'Terms of Service' }),
    ).toHaveAttribute('href', '/terms')
  })

  it('exposes no unshipped-feature placeholders and no dead subscribe UI', async () => {
    await renderSettings()

    expect(screen.queryByText(/coming soon/i)).toBeNull()
    expect(screen.queryByText(/when th(is|at)( feature)? ships/i)).toBeNull()
    // Checkout is closed in the mocked billing config → no subscribe
    // buttons, enabled or disabled, may render.
    expect(screen.queryByText(/subscribe on web/i)).toBeNull()
    expect(screen.queryByText(/subscribe in app store/i)).toBeNull()
  })
})
