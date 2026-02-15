import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as entitlementsHandler } from '@/app/api/billing/entitlements/route'

const createClientMock = vi.fn()
const getUserMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
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

  it('returns premium entitlements from user metadata', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {
            subscription_tier: 'premium',
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
      }
    }

    expect(payload.authenticated).toBe(true)
    expect(payload.entitlements.subscriptionTier).toBe('premium')
    expect(payload.entitlements.premiumActive).toBe(true)
    expect(payload.entitlements.features['premium-series']).toBe(true)
    expect(payload.entitlements.ownedThemes).toEqual(['theme-sacred-dark'])
    expect(payload.entitlements.ownedStickerPacks).toEqual(['sticker-psalms'])
  })
})
