/**
 * Account surface completion — audit findings M2 / M3 / M4 / B7.
 *
 *  M2  /account resolved to a 404 even though the mobile tab bar's YOU tab
 *      already treats it as its own. It is now a real 308 to /settings.
 *  M3  public.users.full_name existed with nothing to write it. There is
 *      now a display name in the ACCOUNT card, behind /api/user/profile.
 *  M4  A reader could not change the email they sign in with, even though
 *      /auth/callback has always handled the email_change OTP landing.
 *  B7  Onboarding completion was recorded in auth user_metadata only, so
 *      public.users.onboarding_completed drifted permanently false. Both
 *      are now written on one request path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import React from 'react'

const permanentRedirectMock = vi.fn()

vi.mock('next/navigation', () => ({
  permanentRedirect: (...args: unknown[]) => permanentRedirectMock(...args),
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))

// ── Supabase server client double ────────────────────────────────────────
type UsersRow = {
  id: string
  email: string
  full_name: string | null
  onboarding_completed: boolean
}

let usersRows: UsersRow[] = []
let selectError: { message: string } | null = null
let writeError: { message: string } | null = null
let sessionUser: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
} | null = null
let updatePatches: Array<Record<string, unknown>> = []
const authUpdateUserMock = vi.fn()

function usersTableChain() {
  let filtered = usersRows
  let pendingUpdate: Record<string, unknown> | null = null
  const chain: Record<string, unknown> = {}

  chain.select = vi.fn(() => chain)
  chain.update = vi.fn((patch: Record<string, unknown>) => {
    pendingUpdate = patch
    updatePatches.push(patch)
    return chain
  })
  chain.eq = vi.fn((column: string, value: unknown) => {
    filtered = filtered.filter(
      (row) => (row as unknown as Record<string, unknown>)[column] === value,
    )
    return chain
  })
  chain.maybeSingle = vi.fn(async () => {
    const error = pendingUpdate ? writeError : selectError
    if (error) return { data: null, error }
    const row = filtered[0]
    if (!row) return { data: null, error: null }
    if (pendingUpdate) Object.assign(row, pendingUpdate)
    return { data: { ...row }, error: null }
  })

  return chain
}

const supabaseServerStub = {
  auth: {
    getUser: async () => ({
      data: { user: sessionUser },
      error: sessionUser ? null : { message: 'Auth session missing.' },
    }),
    updateUser: (...args: unknown[]) => authUpdateUserMock(...args),
  },
  from: (table: string) => {
    if (table !== 'users') {
      throw new Error(`Unexpected table in account-surface test: ${table}`)
    }
    return usersTableChain()
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => supabaseServerStub,
}))

// ── Supabase browser client double (M4 email change) ─────────────────────
const browserUpdateUserMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => browserUpdateUserMock(...args),
    },
  }),
}))

// Settings page chrome that has no bearing on the account card.
vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))
vi.mock('@/components/Breadcrumbs', () => ({
  default: () => <nav data-testid="breadcrumbs" />,
}))
vi.mock('@/lib/billing/purchases', () => ({
  detectBillingPlatform: vi.fn(async () => 'web' as const),
  purchasePlanOnIos: vi.fn(async () => {}),
  restoreIosPurchases: vi.fn(async () => {}),
}))

beforeEach(() => {
  usersRows = []
  selectError = null
  writeError = null
  sessionUser = null
  updatePatches = []
  permanentRedirectMock.mockReset()
  authUpdateUserMock.mockReset()
  browserUpdateUserMock.mockReset()
})

// ─────────────────────────────────────────────────────────────────────────
// M2 — /account
// ─────────────────────────────────────────────────────────────────────────
describe('M2 — /account redirects to /settings', () => {
  it('permanently redirects, dynamically, with /settings as canonical', async () => {
    const mod = await import('@/app/account/page')

    // force-dynamic is load-bearing: a statically rendered redirect() is
    // baked into a meta-refresh HTML page instead of answering with a 308.
    expect(mod.dynamic).toBe('force-dynamic')
    expect(mod.metadata.alternates?.canonical).toBe('/settings')

    mod.default()
    expect(permanentRedirectMock).toHaveBeenCalledWith('/settings')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// M3 — display name validation + /api/user/profile
// ─────────────────────────────────────────────────────────────────────────
describe('M3 — display name validation', () => {
  it('accepts a printable name and collapses whitespace', async () => {
    const { sanitizeDisplayName } = await import('@/lib/auth/display-name')
    expect(sanitizeDisplayName('  Milo   Parker ')).toBe('Milo Parker')
    expect(sanitizeDisplayName('A')).toBe('A')
    expect(sanitizeDisplayName('x'.repeat(80))).toBe('x'.repeat(80))
  })

  it('rejects empty, over-long, non-string, and non-printable names', async () => {
    const { sanitizeDisplayName } = await import('@/lib/auth/display-name')
    expect(sanitizeDisplayName('')).toBeNull()
    expect(sanitizeDisplayName('   ')).toBeNull()
    expect(sanitizeDisplayName('x'.repeat(81))).toBeNull()
    expect(sanitizeDisplayName(42)).toBeNull()
    expect(sanitizeDisplayName(null)).toBeNull()
    expect(sanitizeDisplayName('Milo\u0000Parker')).toBeNull()
    expect(sanitizeDisplayName('Milo\u007fParker')).toBeNull()
  })
})

function profileRequest(
  method: 'GET' | 'POST',
  body?: unknown,
  ip = '10.0.0.1',
) {
  return new Request('http://localhost/api/user/profile', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('M3 — /api/user/profile', () => {
  it('401s a signed-out reader on both verbs', async () => {
    const { GET, POST } = await import('@/app/api/user/profile/route')

    const read = await GET(profileRequest('GET') as never)
    expect(read.status).toBe(401)

    const write = await POST(
      profileRequest('POST', { fullName: 'Milo' }, '10.0.0.2') as never,
    )
    expect(write.status).toBe(401)
  })

  it('returns the stored full_name', async () => {
    sessionUser = { id: 'user-1', email: 'reader@example.com' }
    usersRows.push({
      id: 'user-1',
      email: 'reader@example.com',
      full_name: 'Milo Parker',
      onboarding_completed: false,
    })
    const { GET } = await import('@/app/api/user/profile/route')

    const response = await GET(profileRequest('GET') as never)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      fullName: 'Milo Parker',
    })
  })

  it('400s an invalid display name without touching the row', async () => {
    sessionUser = { id: 'user-1', email: 'reader@example.com' }
    usersRows.push({
      id: 'user-1',
      email: 'reader@example.com',
      full_name: null,
      onboarding_completed: false,
    })
    const { POST } = await import('@/app/api/user/profile/route')

    const response = await POST(
      profileRequest('POST', { fullName: 'x'.repeat(81) }, '10.0.0.3') as never,
    )
    expect(response.status).toBe(400)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('INVALID_DISPLAY_NAME')
    expect(updatePatches).toEqual([])
    expect(usersRows[0].full_name).toBeNull()
  })

  it('saves a validated display name to public.users', async () => {
    sessionUser = { id: 'user-1', email: 'reader@example.com' }
    usersRows.push({
      id: 'user-1',
      email: 'reader@example.com',
      full_name: null,
      onboarding_completed: false,
    })
    const { POST } = await import('@/app/api/user/profile/route')

    const response = await POST(
      profileRequest(
        'POST',
        { fullName: '  Milo   Parker ' },
        '10.0.0.4',
      ) as never,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      fullName: 'Milo Parker',
    })
    expect(updatePatches).toEqual([{ full_name: 'Milo Parker' }])
    expect(usersRows[0].full_name).toBe('Milo Parker')
  })

  it('surfaces a missing profile row instead of reporting success', async () => {
    sessionUser = { id: 'ghost', email: 'ghost@example.com' }
    const { POST } = await import('@/app/api/user/profile/route')

    const response = await POST(
      profileRequest('POST', { fullName: 'Milo' }, '10.0.0.5') as never,
    )
    expect(response.status).toBe(500)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('PROFILE_ROW_MISSING')
  })

  it('surfaces a missing profile row on GET instead of a null name', async () => {
    // The signup trigger creates a row for every account — a missing row
    // is an anomaly, and { ok, fullName: null } would paint a healthy
    // empty state over it.
    sessionUser = { id: 'ghost', email: 'ghost@example.com' }
    const { GET } = await import('@/app/api/user/profile/route')

    const response = await GET(profileRequest('GET') as never)
    expect(response.status).toBe(500)
    const payload = (await response.json()) as { ok?: boolean; code?: string }
    expect(payload.ok).toBe(false)
    expect(payload.code).toBe('PROFILE_ROW_MISSING')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// B7 — onboarding writes both sources of truth
// ─────────────────────────────────────────────────────────────────────────
function onboardingRequest(body: unknown, ip = '10.1.0.1') {
  return new Request('http://localhost/api/auth/onboarding', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('B7 — onboarding completion is written twice, on one path', () => {
  it('sets public.users.onboarding_completed alongside the metadata patch', async () => {
    sessionUser = {
      id: 'user-1',
      email: 'reader@example.com',
      user_metadata: {},
    }
    usersRows.push({
      id: 'user-1',
      email: 'reader@example.com',
      full_name: null,
      onboarding_completed: false,
    })
    authUpdateUserMock.mockImplementation(
      async (patch: { data: Record<string, unknown> }) => ({
        data: { user: { id: 'user-1', user_metadata: patch.data } },
        error: null,
      }),
    )

    const { POST } = await import('@/app/api/auth/onboarding/route')
    const response = await POST(
      onboardingRequest({ skipped: false, preferences: {} }) as never,
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      onboarding: { completed: boolean }
      warning?: string
    }
    expect(payload.onboarding.completed).toBe(true)
    expect(payload.warning).toBeUndefined()

    // Metadata patch happened…
    expect(authUpdateUserMock).toHaveBeenCalledTimes(1)
    expect(
      (authUpdateUserMock.mock.calls[0][0] as { data: Record<string, unknown> })
        .data.onboardingCompleted,
    ).toBe(true)
    // …and so did the public.users mirror.
    expect(updatePatches).toEqual([{ onboarding_completed: true }])
    expect(usersRows[0].onboarding_completed).toBe(true)
  })

  it('completes onboarding with a warning when the profile mirror cannot be written', async () => {
    // Auth metadata is the source of truth and it saved — a failed
    // secondary sync is logged and reported, never a 500 that undoes
    // the reader's welcome.
    sessionUser = {
      id: 'user-1',
      email: 'reader@example.com',
      user_metadata: {},
    }
    usersRows.push({
      id: 'user-1',
      email: 'reader@example.com',
      full_name: null,
      onboarding_completed: false,
    })
    writeError = { message: 'permission denied for table users' }
    authUpdateUserMock.mockImplementation(
      async (patch: { data: Record<string, unknown> }) => ({
        data: { user: { id: 'user-1', user_metadata: patch.data } },
        error: null,
      }),
    )

    const { POST } = await import('@/app/api/auth/onboarding/route')
    const response = await POST(
      onboardingRequest(
        { skipped: true, preferences: {} },
        '10.1.0.2',
      ) as never,
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      ok: boolean
      onboarding: { completed: boolean }
      warning?: string
    }
    expect(payload.ok).toBe(true)
    expect(payload.onboarding.completed).toBe(true)
    expect(payload.warning).toContain('permission denied for table users')
  })

  it('completes onboarding with a warning when the profile row is missing', async () => {
    sessionUser = {
      id: 'ghost',
      email: 'ghost@example.com',
      user_metadata: {},
    }
    authUpdateUserMock.mockImplementation(
      async (patch: { data: Record<string, unknown> }) => ({
        data: { user: { id: 'ghost', user_metadata: patch.data } },
        error: null,
      }),
    )

    const { POST } = await import('@/app/api/auth/onboarding/route')
    const response = await POST(
      onboardingRequest(
        { skipped: false, preferences: {} },
        '10.1.0.3',
      ) as never,
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      ok: boolean
      onboarding: { completed: boolean }
      warning?: string
    }
    expect(payload.ok).toBe(true)
    expect(payload.onboarding.completed).toBe(true)
    expect(payload.warning).toContain('profile record is missing')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// M3 + M4 in the settings ACCOUNT card
// ─────────────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const settingsFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input)
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
  if (url.includes('/api/admin/edition')) {
    // SA-114 / F-158: the settings admin-doorway probe. This reader is
    // signed in but not an admin — the card must not render.
    return jsonResponse({ error: 'Forbidden.' }, 403)
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
  throw new Error(`Unexpected fetch in account-surface test: ${url}`)
})

describe('settings ACCOUNT card (M3 + M4)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    settingsFetch.mockClear()
    vi.stubGlobal('fetch', settingsFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  async function renderSettings() {
    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)
    await waitFor(() =>
      expect(screen.getAllByText('reader@example.com').length).toBeGreaterThan(
        0,
      ),
    )
  }

  it('shows the saved display name, and uses its initial for the avatar', async () => {
    await renderSettings()

    const account = screen.getByRole('region', { name: 'ACCOUNT' })
    await waitFor(() =>
      expect(within(account).getByText('Milo Parker')).toBeTruthy(),
    )
    expect(
      within(account).getByRole('button', { name: /edit name/i }),
    ).toBeTruthy()

    // The avatar takes 'M' from the name, not 'R' from reader@example.com.
    expect(screen.getByTestId('profile-avatar-initial').textContent).toBe('M')
  })

  it('starts an email change and reports the confirmation honestly', async () => {
    browserUpdateUserMock.mockResolvedValue({ data: {}, error: null })
    await renderSettings()

    const account = screen.getByRole('region', { name: 'ACCOUNT' })
    fireEvent.click(
      within(account).getByRole('button', { name: /change email/i }),
    )

    const input = within(account).getByLabelText(/new email/i)
    fireEvent.change(input, { target: { value: 'New@Example.com' } })
    fireEvent.click(
      within(account).getByRole('button', { name: /send confirmation/i }),
    )

    await waitFor(() =>
      // The confirmation links must land on /auth/callback (which syncs
      // public.users.email at the email_change OTP landing) and return
      // the reader to /settings.
      expect(browserUpdateUserMock).toHaveBeenCalledWith(
        { email: 'new@example.com' },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/settings')}`,
        },
      ),
    )

    // Nothing has changed yet — the copy must say so, and must name both
    // inboxes because secure email change confirms on both addresses.
    const message = await within(account).findByText(/check both inboxes/i)
    expect(message.textContent).toContain('new@example.com')
    expect(message.textContent).toContain('reader@example.com')
  })

  it('refuses an email change that is not a valid address', async () => {
    await renderSettings()

    const account = screen.getByRole('region', { name: 'ACCOUNT' })
    fireEvent.click(
      within(account).getByRole('button', { name: /change email/i }),
    )
    fireEvent.change(within(account).getByLabelText(/new email/i), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(
      within(account).getByRole('button', { name: /send confirmation/i }),
    )

    expect(
      await within(account).findByText(/enter a valid email address/i),
    ).toBeTruthy()
    expect(browserUpdateUserMock).not.toHaveBeenCalled()
  })
})
