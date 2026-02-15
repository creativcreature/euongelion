import type { SubscriptionTier } from '@/types/database'

export type EntitlementFeature =
  | 'premium-subscription'
  | 'premium-series'
  | 'archive-tools'
  | 'theme-customization'
  | 'sticker-overlays'

const KNOWN_PREMIUM_THEME_IDS = new Set([
  'theme-sacred-dark',
  'theme-parchment',
  'theme-midnight',
  'theme-forest',
  'theme-ivory',
  'theme-rose',
])

const KNOWN_STICKER_PACK_IDS = new Set([
  'sticker-psalms',
  'sticker-parables',
  'sticker-epistles',
])

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  if (value === 'premium' || value === 'lifetime') {
    return value
  }
  return 'free'
}

export type BillingEntitlementSnapshot = {
  subscriptionTier: SubscriptionTier
  premiumActive: boolean
  ownedThemes: string[]
  ownedStickerPacks: string[]
  features: Record<EntitlementFeature, boolean>
}

export function resolveEntitlementSnapshot(params: {
  subscriptionTier?: unknown
  ownedThemes?: unknown
  ownedStickerPacks?: unknown
}): BillingEntitlementSnapshot {
  const subscriptionTier = normalizeSubscriptionTier(params.subscriptionTier)
  const premiumActive =
    subscriptionTier === 'premium' || subscriptionTier === 'lifetime'

  const ownedThemes = normalizeStringArray(params.ownedThemes).filter((id) =>
    KNOWN_PREMIUM_THEME_IDS.has(id),
  )
  const ownedStickerPacks = normalizeStringArray(
    params.ownedStickerPacks,
  ).filter((id) => KNOWN_STICKER_PACK_IDS.has(id))

  const features: Record<EntitlementFeature, boolean> = {
    'premium-subscription': premiumActive,
    'premium-series': premiumActive,
    'archive-tools': premiumActive,
    'theme-customization': premiumActive || ownedThemes.length > 0,
    'sticker-overlays': premiumActive || ownedStickerPacks.length > 0,
  }

  return {
    subscriptionTier,
    premiumActive,
    ownedThemes,
    ownedStickerPacks,
    features,
  }
}
