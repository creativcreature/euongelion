import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as entitlementsHandler } from '@/app/api/billing/entitlements/route'

const createClientMock = vi.fn()
const getUserMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

/**
 * SA-028: subscription tier is read from public.users (webhook-written)
 * via the admin client — NEVER from auth user_metadata. `usersRows`
 * seeds the mocked public.users table.
 */
type UsersRow = {
  id: string
  subscription_tier?: string
  subscription_status?: string | null
  subscription_renews_at?: string | null
  premium_expires_at?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  founding_member_at?: string | null
  free_generation_used_at?: string | null
}
let usersRows: UsersRow[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      let filtered = usersRows
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn((col: keyof UsersRow, val: unknown) => {
        filtered = filtered.filter((row) => row[col] === val)
        return chain
      })
      chain.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: filtered[0] ?? null, error: null }),
      )
      return chain
    },
  }),
}))

function buildRequest(ip = '127.0.0.1') {
  return new Request('http://localhost/api/billing/entitlements', {
    method: 'GET',
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('billing entitlements API', () => {
  beforeEach(() => {
    getUserMock.mockReset()
    createClientMock.mockReset()
    createClientMock.mockResolvedValue({
      auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
    })
    usersRows = []
  })

  it('returns free entitlements for anonymous user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const response = await entitlementsHandler(buildRequest() as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Request-Id')).toBeTruthy()
    const payload = (await response.json()) as {
      authenticated: boolean
      entitlements: {
        premiumActive: boolean
        subscriptionTier: string
      }
    }
    expect(payload.authenticated).toBe(false)
    expect(payload.entitlements.subscriptionTier).toBe('free')
    expect(payload.entitlements.premiumActive).toBe(false)
  })

  it('returns premium entitlements from public.users (SA-028)', async () => {
    usersRows.push({
      id: 'user-1',
      subscription_tier: 'premium',
      subscription_status: 'active',
      subscription_renews_at: '2027-07-10T00:00:00.000Z',
      founding_member_at: '2026-07-10T00:00:00.000Z',
      free_generation_used_at: '2026-07-10T01:00:00.000Z',
    })
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {
            owned_themes: ['theme-sacred-dark'],
            owned_sticker_packs: ['sticker-psalms'],
          },
          app_metadata: {},
        },
      },
    })

    const response = await entitlementsHandler(
      buildRequest('127.0.0.2') as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      authenticated: boolean
      entitlements: {
        premiumActive: boolean
        subscriptionTier: string
        features: Record<string, boolean>
        ownedThemes: string[]
        ownedStickerPacks: string[]
        subscriptionStatus: string | null
        subscriptionRenewsAt: string | null
        foundingMember: boolean
        freeGenerationUsed: boolean
      }
    }

    expect(payload.authenticated).toBe(true)
    expect(payload.entitlements.subscriptionTier).toBe('premium')
    expect(payload.entitlements.premiumActive).toBe(true)
    expect(payload.entitlements.features['premium-series']).toBe(true)
    expect(payload.entitlements.ownedThemes).toEqual(['theme-sacred-dark'])
    expect(payload.entitlements.ownedStickerPacks).toEqual(['sticker-psalms'])
    expect(payload.entitlements.subscriptionStatus).toBe('active')
    expect(payload.entitlements.subscriptionRenewsAt).toBe(
      '2027-07-10T00:00:00.000Z',
    )
    expect(payload.entitlements.foundingMember).toBe(true)
    expect(payload.entitlements.freeGenerationUsed).toBe(true)
  })

  it('IGNORES subscription_tier planted in auth metadata (the pre-SA-028 split)', async () => {
    // No public.users row → free, no matter what metadata claims.
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
          user_metadata: { subscription_tier: 'premium' },
          app_metadata: { subscription_tier: 'premium' },
        },
      },
    })

    const response = await entitlementsHandler(
      buildRequest('127.0.0.3') as never,
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      entitlements: { premiumActive: boolean; subscriptionTier: string }
    }
    expect(payload.entitlements.subscriptionTier).toBe('free')
    expect(payload.entitlements.premiumActive).toBe(false)
  })

  it('treats an unexpired one-time term (premium_expires_at) as premium', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    usersRows.push({
      id: 'user-3',
      subscription_tier: 'free',
      premium_expires_at: future,
    })
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-3', user_metadata: {}, app_metadata: {} } },
    })

    const response = await entitlementsHandler(
      buildRequest('127.0.0.4') as never,
    )
    const payload = (await response.json()) as {
      entitlements: { premiumActive: boolean; subscriptionTier: string }
    }
    expect(payload.entitlements.subscriptionTier).toBe('premium')
    expect(payload.entitlements.premiumActive).toBe(true)
  })
})
