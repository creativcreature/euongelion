import { describe, expect, it } from 'vitest'
import {
  normalizeSubscriptionTier,
  resolveEntitlementSnapshot,
} from '@/lib/billing/entitlements'

describe('billing entitlements resolver', () => {
  it('normalizes unknown subscription tiers to free', () => {
    expect(normalizeSubscriptionTier('premium')).toBe('premium')
    expect(normalizeSubscriptionTier('lifetime')).toBe('lifetime')
    expect(normalizeSubscriptionTier('enterprise')).toBe('free')
    expect(normalizeSubscriptionTier(undefined)).toBe('free')
  })

  it('grants premium feature set for premium subscription', () => {
    const snapshot = resolveEntitlementSnapshot({
      subscriptionTier: 'premium',
    })
    expect(snapshot.premiumActive).toBe(true)
    expect(snapshot.features['premium-series']).toBe(true)
    expect(snapshot.features['archive-tools']).toBe(true)
  })

  it('grants theme and sticker access from owned purchases without subscription', () => {
    const snapshot = resolveEntitlementSnapshot({
      subscriptionTier: 'free',
      ownedThemes: ['theme-sacred-dark', 'ignored-theme'],
      ownedStickerPacks: ['sticker-psalms', 'unknown-pack'],
    })

    expect(snapshot.premiumActive).toBe(false)
    expect(snapshot.features['premium-series']).toBe(false)
    expect(snapshot.features['theme-customization']).toBe(true)
    expect(snapshot.features['sticker-overlays']).toBe(true)
    expect(snapshot.ownedThemes).toEqual(['theme-sacred-dark'])
    expect(snapshot.ownedStickerPacks).toEqual(['sticker-psalms'])
  })
})
