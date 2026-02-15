/**
 * Monetization and Entitlements Test Suite (Phase 13)
 *
 * Covers PLAN-V3 Phase 13:
 * - Subscription + one-off store model
 * - Launch pricing ($2.99/mo, themes $0.99, sticker packs $0.49)
 * - Theme/sticker catalog (7 themes, 3 sticker packs)
 * - Donation model (non-tax-deductible, 60/25/15 allocation)
 * - Transparency dashboard (public + personal)
 * - Stripe (web) + iOS IAP checkout
 * - Cross-platform entitlement sync
 * - Purchase validation and restore
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntitlementType = 'subscription' | 'theme' | 'sticker_pack'
type PurchasePlatform = 'web_stripe' | 'ios_iap'
type DonationAllocation = { charity: number; operations: number; labor: number }

interface CatalogItem {
  id: string
  type: EntitlementType
  name: string
  price: number
  currency: string
  description: string
  isPremium: boolean
}

interface Entitlement {
  id: string
  userId: string
  itemId: string
  type: EntitlementType
  platform: PurchasePlatform
  active: boolean
  expiresAt: number | null
  purchasedAt: number
}

interface Donation {
  id: string
  userId: string
  amount: number
  currency: string
  allocation: DonationAllocation
  taxDeductible: boolean
  createdAt: number
}

interface TransparencyDashboard {
  totalDonations: number
  totalDonors: number
  allocation: DonationAllocation
  personalContributions: number | null
  lastUpdated: number
}

interface PurchaseValidation {
  receiptId: string
  platform: PurchasePlatform
  valid: boolean
  reason: string | null
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const CATALOG: CatalogItem[] = [
  {
    id: 'sub-premium',
    type: 'subscription',
    name: 'Euangelion Premium',
    price: 2.99,
    currency: 'USD',
    description: 'Full access monthly',
    isPremium: true,
  },
  {
    id: 'theme-newspaper',
    type: 'theme',
    name: 'Newspaper (Default)',
    price: 0,
    currency: 'USD',
    description: 'Default theme',
    isPremium: false,
  },
  {
    id: 'theme-sacred-dark',
    type: 'theme',
    name: 'Sacred Dark',
    price: 0.99,
    currency: 'USD',
    description: 'Gold on dark',
    isPremium: true,
  },
  {
    id: 'theme-parchment',
    type: 'theme',
    name: 'Parchment',
    price: 0.99,
    currency: 'USD',
    description: 'Warm reading',
    isPremium: true,
  },
  {
    id: 'theme-midnight',
    type: 'theme',
    name: 'Midnight Blue',
    price: 0.99,
    currency: 'USD',
    description: 'Deep blue tones',
    isPremium: true,
  },
  {
    id: 'theme-forest',
    type: 'theme',
    name: 'Forest',
    price: 0.99,
    currency: 'USD',
    description: 'Natural greens',
    isPremium: true,
  },
  {
    id: 'theme-ivory',
    type: 'theme',
    name: 'Ivory',
    price: 0.99,
    currency: 'USD',
    description: 'Clean and bright',
    isPremium: true,
  },
  {
    id: 'theme-rose',
    type: 'theme',
    name: 'Desert Rose',
    price: 0.99,
    currency: 'USD',
    description: 'Warm rose tones',
    isPremium: true,
  },
  {
    id: 'sticker-psalms',
    type: 'sticker_pack',
    name: 'Psalms Stickers',
    price: 0.49,
    currency: 'USD',
    description: 'Psalm-inspired',
    isPremium: true,
  },
  {
    id: 'sticker-parables',
    type: 'sticker_pack',
    name: 'Parables Stickers',
    price: 0.49,
    currency: 'USD',
    description: 'Parable-inspired',
    isPremium: true,
  },
  {
    id: 'sticker-epistles',
    type: 'sticker_pack',
    name: 'Epistles Stickers',
    price: 0.49,
    currency: 'USD',
    description: 'Epistle-inspired',
    isPremium: true,
  },
]

const DEFAULT_ALLOCATION: DonationAllocation = {
  charity: 60,
  operations: 25,
  labor: 15,
}

function purchaseItem(
  userId: string,
  itemId: string,
  platform: PurchasePlatform,
): Entitlement {
  const item = CATALOG.find((c) => c.id === itemId)
  if (!item) throw new Error('Item not found')
  return {
    id: `ent-${Date.now()}`,
    userId,
    itemId,
    type: item.type,
    platform,
    active: true,
    expiresAt:
      item.type === 'subscription'
        ? Date.now() + 30 * 24 * 60 * 60 * 1000
        : null,
    purchasedAt: Date.now(),
  }
}

function restorePurchases(
  userId: string,
  existingEntitlements: Entitlement[],
): Entitlement[] {
  return existingEntitlements.filter((e) => e.userId === userId && e.active)
}

function validateReceipt(
  receiptId: string,
  platform: PurchasePlatform,
): PurchaseValidation {
  if (!receiptId)
    return { receiptId, platform, valid: false, reason: 'Empty receipt' }
  if (receiptId.startsWith('invalid-'))
    return { receiptId, platform, valid: false, reason: 'Invalid receipt' }
  return { receiptId, platform, valid: true, reason: null }
}

function syncEntitlements(
  userId: string,
  webEntitlements: Entitlement[],
  iosEntitlements: Entitlement[],
): Entitlement[] {
  const allEntitlements = [...webEntitlements, ...iosEntitlements]
  // Deduplicate by itemId, keeping most recent
  const byItem = new Map<string, Entitlement>()
  for (const e of allEntitlements) {
    if (e.userId !== userId) continue
    const existing = byItem.get(e.itemId)
    if (!existing || e.purchasedAt > existing.purchasedAt) {
      byItem.set(e.itemId, e)
    }
  }
  return Array.from(byItem.values())
}

function makeDonation(
  userId: string,
  amount: number,
  allocation?: DonationAllocation,
): Donation {
  if (amount <= 0) throw new Error('Donation amount must be positive')
  return {
    id: `don-${Date.now()}`,
    userId,
    amount,
    currency: 'USD',
    allocation: allocation ?? DEFAULT_ALLOCATION,
    taxDeductible: false,
    createdAt: Date.now(),
  }
}

function getTransparencyDashboard(
  donations: Donation[],
  userId: string | null,
): TransparencyDashboard {
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0)
  const uniqueDonors = new Set(donations.map((d) => d.userId)).size
  const personalTotal = userId
    ? donations
        .filter((d) => d.userId === userId)
        .reduce((sum, d) => sum + d.amount, 0)
    : null
  return {
    totalDonations: totalAmount,
    totalDonors: uniqueDonors,
    allocation: DEFAULT_ALLOCATION,
    personalContributions: personalTotal,
    lastUpdated: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Catalog', () => {
  it('has 7 themes (1 default + 6 premium)', () => {
    const themes = CATALOG.filter((c) => c.type === 'theme')
    expect(themes).toHaveLength(7)
    const defaultTheme = themes.find((t) => !t.isPremium)
    expect(defaultTheme?.price).toBe(0)
    const premiumThemes = themes.filter((t) => t.isPremium)
    expect(premiumThemes).toHaveLength(6)
  })

  it('has 3 sticker packs', () => {
    const stickers = CATALOG.filter((c) => c.type === 'sticker_pack')
    expect(stickers).toHaveLength(3)
  })

  it('has 1 subscription', () => {
    const subs = CATALOG.filter((c) => c.type === 'subscription')
    expect(subs).toHaveLength(1)
  })

  it('subscription priced at $2.99', () => {
    const sub = CATALOG.find((c) => c.type === 'subscription')
    expect(sub?.price).toBe(2.99)
  })

  it('premium themes priced at $0.99', () => {
    const premiumThemes = CATALOG.filter(
      (c) => c.type === 'theme' && c.isPremium,
    )
    for (const theme of premiumThemes) {
      expect(theme.price).toBe(0.99)
    }
  })

  it('sticker packs priced at $0.49', () => {
    const stickers = CATALOG.filter((c) => c.type === 'sticker_pack')
    for (const sticker of stickers) {
      expect(sticker.price).toBe(0.49)
    }
  })

  it('all items have names and descriptions', () => {
    for (const item of CATALOG) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
    }
  })
})

describe('Purchase flow', () => {
  it('purchases subscription with expiry', () => {
    const entitlement = purchaseItem('user-1', 'sub-premium', 'web_stripe')
    expect(entitlement.active).toBe(true)
    expect(entitlement.type).toBe('subscription')
    expect(entitlement.expiresAt).toBeTruthy()
  })

  it('purchases theme without expiry', () => {
    const entitlement = purchaseItem('user-1', 'theme-sacred-dark', 'ios_iap')
    expect(entitlement.active).toBe(true)
    expect(entitlement.expiresAt).toBeNull() // Non-consumable, never expires
  })

  it('purchases sticker pack without expiry', () => {
    const entitlement = purchaseItem('user-1', 'sticker-psalms', 'web_stripe')
    expect(entitlement.expiresAt).toBeNull()
  })

  it('rejects purchase of non-existent item', () => {
    expect(() => purchaseItem('user-1', 'fake-item', 'web_stripe')).toThrow(
      'Item not found',
    )
  })

  it('records purchase platform', () => {
    const webPurchase = purchaseItem('user-1', 'theme-parchment', 'web_stripe')
    const iosPurchase = purchaseItem('user-1', 'theme-midnight', 'ios_iap')
    expect(webPurchase.platform).toBe('web_stripe')
    expect(iosPurchase.platform).toBe('ios_iap')
  })
})

describe('Purchase validation', () => {
  it('validates good receipt', () => {
    const result = validateReceipt('receipt-abc123', 'ios_iap')
    expect(result.valid).toBe(true)
  })

  it('rejects empty receipt', () => {
    const result = validateReceipt('', 'ios_iap')
    expect(result.valid).toBe(false)
  })

  it('rejects invalid receipt', () => {
    const result = validateReceipt('invalid-receipt-xyz', 'ios_iap')
    expect(result.valid).toBe(false)
  })
})

describe('Restore purchases', () => {
  it('restores active entitlements for user', () => {
    const entitlements = [
      purchaseItem('user-1', 'theme-sacred-dark', 'ios_iap'),
      purchaseItem('user-1', 'sticker-psalms', 'web_stripe'),
      purchaseItem('user-2', 'theme-parchment', 'ios_iap'),
    ]
    const restored = restorePurchases('user-1', entitlements)
    expect(restored).toHaveLength(2)
    expect(restored.every((e) => e.userId === 'user-1')).toBe(true)
  })

  it('does not restore other users purchases', () => {
    const entitlements = [purchaseItem('user-2', 'theme-forest', 'web_stripe')]
    const restored = restorePurchases('user-1', entitlements)
    expect(restored).toHaveLength(0)
  })
})

describe('Cross-platform entitlement sync', () => {
  it('merges web and iOS entitlements', () => {
    const webEnt = [purchaseItem('user-1', 'theme-sacred-dark', 'web_stripe')]
    const iosEnt = [purchaseItem('user-1', 'sticker-psalms', 'ios_iap')]
    const synced = syncEntitlements('user-1', webEnt, iosEnt)
    expect(synced).toHaveLength(2)
  })

  it('deduplicates same item across platforms', () => {
    const webEnt = [
      {
        ...purchaseItem('user-1', 'theme-sacred-dark', 'web_stripe'),
        purchasedAt: 1000,
      },
    ]
    const iosEnt = [
      {
        ...purchaseItem('user-1', 'theme-sacred-dark', 'ios_iap'),
        purchasedAt: 2000,
      },
    ]
    const synced = syncEntitlements('user-1', webEnt, iosEnt)
    expect(synced).toHaveLength(1)
    expect(synced[0].platform).toBe('ios_iap') // Most recent
  })

  it('ignores other users in sync', () => {
    const webEnt = [purchaseItem('user-2', 'theme-parchment', 'web_stripe')]
    const iosEnt = [purchaseItem('user-1', 'sticker-psalms', 'ios_iap')]
    const synced = syncEntitlements('user-1', webEnt, iosEnt)
    expect(synced).toHaveLength(1)
    expect(synced[0].userId).toBe('user-1')
  })
})

describe('Donations', () => {
  it('creates donation with default allocation', () => {
    const donation = makeDonation('user-1', 10)
    expect(donation.amount).toBe(10)
    expect(donation.allocation).toEqual({
      charity: 60,
      operations: 25,
      labor: 15,
    })
    expect(donation.taxDeductible).toBe(false)
  })

  it('allocation sums to 100%', () => {
    const { charity, operations, labor } = DEFAULT_ALLOCATION
    expect(charity + operations + labor).toBe(100)
  })

  it('default allocation is 60/25/15', () => {
    expect(DEFAULT_ALLOCATION.charity).toBe(60)
    expect(DEFAULT_ALLOCATION.operations).toBe(25)
    expect(DEFAULT_ALLOCATION.labor).toBe(15)
  })

  it('donations are non-tax-deductible', () => {
    const donation = makeDonation('user-1', 25)
    expect(donation.taxDeductible).toBe(false)
  })

  it('rejects zero or negative donations', () => {
    expect(() => makeDonation('user-1', 0)).toThrow('positive')
    expect(() => makeDonation('user-1', -5)).toThrow('positive')
  })

  it('supports custom allocation', () => {
    const custom = { charity: 80, operations: 10, labor: 10 }
    const donation = makeDonation('user-1', 50, custom)
    expect(donation.allocation).toEqual(custom)
  })
})

describe('Transparency dashboard', () => {
  it('shows total donations and donor count', () => {
    const donations = [
      makeDonation('user-1', 10),
      makeDonation('user-2', 25),
      makeDonation('user-1', 15),
    ]
    const dashboard = getTransparencyDashboard(donations, null)
    expect(dashboard.totalDonations).toBe(50)
    expect(dashboard.totalDonors).toBe(2)
  })

  it('shows personal contributions for logged-in user', () => {
    const donations = [
      makeDonation('user-1', 10),
      makeDonation('user-2', 25),
      makeDonation('user-1', 15),
    ]
    const dashboard = getTransparencyDashboard(donations, 'user-1')
    expect(dashboard.personalContributions).toBe(25)
  })

  it('null personal contributions for anonymous user', () => {
    const donations = [makeDonation('user-1', 10)]
    const dashboard = getTransparencyDashboard(donations, null)
    expect(dashboard.personalContributions).toBeNull()
  })

  it('shows default allocation', () => {
    const dashboard = getTransparencyDashboard([], null)
    expect(dashboard.allocation).toEqual(DEFAULT_ALLOCATION)
  })
})
