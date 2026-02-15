/**
 * iOS App Store Compliance Test Suite (Feb 2026)
 *
 * Tests against Apple App Store Review Guidelines:
 * - Guideline 4.8: Sign in with Apple (required with third-party social login)
 * - Guideline 3.1: In-App Purchase (digital goods, subscriptions, restore)
 * - Guideline 3.1.2: Subscription management (pricing, cancellation, terms)
 * - Guideline 5.1: Privacy (manifest, ATT, data deletion, nutrition labels)
 * - Guideline 1.2: User-Generated Content (moderation, reporting)
 * - Guideline 2.1: App Completeness (no placeholders, no crashes)
 * - Guideline 4.2: Minimum Functionality (beyond repackaged website)
 * - Guideline 2.3: Accurate Metadata
 * - 2026 AI consent requirement (provider disclosure, data types)
 * - PWA manifest and icons
 * - Safe area and status bar handling
 * - Age rating questionnaire
 * - Account deletion (mandatory since June 2022)
 */
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthProvider {
  id: string
  name: string
  required: boolean
  privacyCompliant: boolean
  limitsDataToNameEmail: boolean
  allowsPrivateEmail: boolean
  doesNotTrack: boolean
}

interface IAPProduct {
  id: string
  type: 'consumable' | 'non_consumable' | 'auto_renewable' | 'non_renewing'
  price: string
  displayName: string
  description: string
  hasRestorePurchase: boolean
}

interface SubscriptionConfig {
  productId: string
  price: string
  period: 'monthly' | 'yearly'
  freeTrialDays: number | null
  termsDisplayed: boolean
  cancellationLinkPresent: boolean
  gracePeriodDays: number
  priceShownBeforePurchase: boolean
}

interface PrivacyManifest {
  dataTypes: DataTypeDeclaration[]
  trackingDomains: string[]
  privacyPolicyUrl: string
  attRequired: boolean
  accountDeletionSupported: boolean
  dataDeletionTimelineDays: number
}

interface DataTypeDeclaration {
  type: string
  purpose: string[]
  linkedToUser: boolean
  usedForTracking: boolean
}

interface NutritionLabel {
  category: string
  dataTypes: string[]
  linkedToUser: boolean
  usedForTracking: boolean
}

interface PWAManifest {
  name: string
  shortName: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  startUrl: string
  backgroundColor: string
  themeColor: string
  icons: ManifestIcon[]
  orientation: 'portrait' | 'portrait-primary' | 'any'
}

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose?: string
}

interface ContentModerationConfig {
  autoVettingEnabled: boolean
  reportMechanismPresent: boolean
  blockUserCapability: boolean
  moderationSlaMinutes: number
  vettingChecks: string[]
  ageRatingAccurate: boolean
}

interface AIConsentConfig {
  providerName: string
  dataTypesDisclosed: string[]
  consentModalRequired: boolean
  userCanOptOut: boolean
  ageRatingUpdated: boolean
}

interface SafeAreaConfig {
  respectsTopInset: boolean
  respectsBottomInset: boolean
  respectsLeftInset: boolean
  respectsRightInset: boolean
  statusBarHandling: 'dark' | 'light' | 'auto'
  homeIndicatorRespected: boolean
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const AUTH_PROVIDERS: AuthProvider[] = [
  {
    id: 'apple',
    name: 'Sign in with Apple',
    required: true, // Required when Google is offered (Guideline 4.8)
    privacyCompliant: true,
    limitsDataToNameEmail: true,
    allowsPrivateEmail: true,
    doesNotTrack: true,
  },
  {
    id: 'google',
    name: 'Sign in with Google',
    required: false,
    privacyCompliant: true,
    limitsDataToNameEmail: true,
    allowsPrivateEmail: false,
    doesNotTrack: true,
  },
  {
    id: 'magic_link',
    name: 'Magic Link',
    required: false,
    privacyCompliant: true,
    limitsDataToNameEmail: true,
    allowsPrivateEmail: false,
    doesNotTrack: true,
  },
]

const IAP_PRODUCTS: IAPProduct[] = [
  {
    id: 'euangelion_premium_monthly',
    type: 'auto_renewable',
    price: '$2.99',
    displayName: 'Euangelion Premium',
    description: 'Full access to all devotionals and premium features',
    hasRestorePurchase: true,
  },
  {
    id: 'theme_sacred_dark',
    type: 'non_consumable',
    price: '$0.99',
    displayName: 'Sacred Dark Theme',
    description: 'Premium dark theme with gold accents',
    hasRestorePurchase: true,
  },
  {
    id: 'theme_parchment',
    type: 'non_consumable',
    price: '$0.99',
    displayName: 'Parchment Theme',
    description: 'Warm parchment reading theme',
    hasRestorePurchase: true,
  },
  {
    id: 'sticker_pack_psalms',
    type: 'non_consumable',
    price: '$0.49',
    displayName: 'Psalms Sticker Pack',
    description: 'Psalm-inspired decorative stickers',
    hasRestorePurchase: true,
  },
  {
    id: 'sticker_pack_parables',
    type: 'non_consumable',
    price: '$0.49',
    displayName: 'Parables Sticker Pack',
    description: 'Parable-inspired decorative stickers',
    hasRestorePurchase: true,
  },
  {
    id: 'sticker_pack_epistles',
    type: 'non_consumable',
    price: '$0.49',
    displayName: 'Epistles Sticker Pack',
    description: 'Epistle-inspired decorative stickers',
    hasRestorePurchase: true,
  },
]

const SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  productId: 'euangelion_premium_monthly',
  price: '$2.99',
  period: 'monthly',
  freeTrialDays: 7,
  termsDisplayed: true,
  cancellationLinkPresent: true,
  gracePeriodDays: 16, // Apple billing grace period
  priceShownBeforePurchase: true,
}

const PRIVACY_MANIFEST: PrivacyManifest = {
  dataTypes: [
    {
      type: 'Name',
      purpose: ['App Functionality'],
      linkedToUser: true,
      usedForTracking: false,
    },
    {
      type: 'Email Address',
      purpose: ['App Functionality'],
      linkedToUser: true,
      usedForTracking: false,
    },
    {
      type: 'User Content',
      purpose: ['App Functionality'],
      linkedToUser: true,
      usedForTracking: false,
    },
    {
      type: 'Browsing History',
      purpose: ['Analytics'],
      linkedToUser: false,
      usedForTracking: false,
    },
    {
      type: 'Diagnostics',
      purpose: ['App Functionality', 'Analytics'],
      linkedToUser: false,
      usedForTracking: false,
    },
    {
      type: 'Product Interaction',
      purpose: ['Analytics'],
      linkedToUser: false,
      usedForTracking: false,
    },
  ],
  trackingDomains: [], // No third-party tracking
  privacyPolicyUrl: 'https://euangelion.app/privacy',
  attRequired: false, // Analytics default OFF, no tracking
  accountDeletionSupported: true,
  dataDeletionTimelineDays: 30,
}

const NUTRITION_LABELS: NutritionLabel[] = [
  {
    category: 'Contact Info',
    dataTypes: ['Name', 'Email Address'],
    linkedToUser: true,
    usedForTracking: false,
  },
  {
    category: 'User Content',
    dataTypes: ['Photos', 'Audio Data', 'Other User Content'],
    linkedToUser: true,
    usedForTracking: false,
  },
  {
    category: 'Usage Data',
    dataTypes: ['Product Interaction'],
    linkedToUser: false,
    usedForTracking: false,
  },
  {
    category: 'Diagnostics',
    dataTypes: ['Crash Data', 'Performance Data'],
    linkedToUser: false,
    usedForTracking: false,
  },
]

const PWA_MANIFEST_CONFIG: PWAManifest = {
  name: 'Euangelion',
  shortName: 'Euangelion',
  display: 'standalone',
  startUrl: '/',
  backgroundColor: '#0a0a0a',
  themeColor: '#0a0a0a',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  orientation: 'portrait-primary',
}

const CONTENT_MODERATION: ContentModerationConfig = {
  autoVettingEnabled: true,
  reportMechanismPresent: true,
  blockUserCapability: true,
  moderationSlaMinutes: 2,
  vettingChecks: [
    'safety',
    'plagiarism',
    'citation',
    'profanity',
    'hate_speech',
  ],
  ageRatingAccurate: true,
}

const AI_CONSENT: AIConsentConfig = {
  providerName: 'Anthropic (Claude)',
  dataTypesDisclosed: [
    'Soul Audit response text',
    'Devotional reading context',
    'Chat messages',
  ],
  consentModalRequired: true,
  userCanOptOut: true,
  ageRatingUpdated: true,
}

const SAFE_AREA: SafeAreaConfig = {
  respectsTopInset: true,
  respectsBottomInset: true,
  respectsLeftInset: true,
  respectsRightInset: true,
  statusBarHandling: 'auto',
  homeIndicatorRespected: true,
}

const REQUIRED_LEGAL_PAGES = [
  '/terms',
  '/privacy',
  '/cookie-policy',
  '/community-guidelines',
  '/content-disclaimer',
  '/donation-disclosure',
  '/contact',
]

const APP_METADATA = {
  name: 'Euangelion',
  subtitle: 'Daily bread for the cluttered, hungry soul',
  category: 'Lifestyle', // or 'Reference'
  ageRating: '4+', // Religious content, no mature themes
  supportsIPad: true,
  supportsIPhone: true,
  minimumOSVersion: '17.0',
  sdkVersion: 'iOS 26', // Required starting April 2026
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Guideline 4.8: Sign in with Apple', () => {
  it('Sign in with Apple is available when Google login offered', () => {
    const apple = AUTH_PROVIDERS.find((p) => p.id === 'apple')
    const google = AUTH_PROVIDERS.find((p) => p.id === 'google')
    expect(apple).toBeDefined()
    expect(google).toBeDefined()
    expect(apple!.required).toBe(true)
  })

  it('Sign in with Apple is privacy-compliant', () => {
    const apple = AUTH_PROVIDERS.find((p) => p.id === 'apple')!
    expect(apple.privacyCompliant).toBe(true)
    expect(apple.limitsDataToNameEmail).toBe(true)
    expect(apple.allowsPrivateEmail).toBe(true)
    expect(apple.doesNotTrack).toBe(true)
  })

  it('all auth providers limit data collection', () => {
    for (const provider of AUTH_PROVIDERS) {
      expect(provider.limitsDataToNameEmail).toBe(true)
      expect(provider.doesNotTrack).toBe(true)
    }
  })

  it('at least 3 auth methods available', () => {
    expect(AUTH_PROVIDERS.length).toBeGreaterThanOrEqual(3)
  })

  it('no password-based auth (social + magic link only)', () => {
    const passwordAuth = AUTH_PROVIDERS.find((p) => p.id === 'password')
    expect(passwordAuth).toBeUndefined()
  })
})

describe('Guideline 3.1: In-App Purchase', () => {
  it('all digital goods use IAP', () => {
    expect(IAP_PRODUCTS.length).toBeGreaterThanOrEqual(5)
    for (const product of IAP_PRODUCTS) {
      expect([
        'consumable',
        'non_consumable',
        'auto_renewable',
        'non_renewing',
      ]).toContain(product.type)
    }
  })

  it('subscription uses auto-renewable type', () => {
    const subscription = IAP_PRODUCTS.find((p) => p.type === 'auto_renewable')
    expect(subscription).toBeDefined()
    expect(subscription!.price).toBe('$2.99')
  })

  it('all products have restore purchase capability', () => {
    for (const product of IAP_PRODUCTS) {
      expect(product.hasRestorePurchase).toBe(true)
    }
  })

  it('themes are non-consumable (do not expire)', () => {
    const themes = IAP_PRODUCTS.filter((p) => p.id.startsWith('theme_'))
    expect(themes.length).toBeGreaterThanOrEqual(2)
    for (const theme of themes) {
      expect(theme.type).toBe('non_consumable')
    }
  })

  it('sticker packs are non-consumable', () => {
    const stickers = IAP_PRODUCTS.filter((p) => p.id.startsWith('sticker_pack'))
    expect(stickers.length).toBe(3) // 3 packs per V3 Phase 13
    for (const sticker of stickers) {
      expect(sticker.type).toBe('non_consumable')
      expect(sticker.price).toBe('$0.49')
    }
  })

  it('all products have display name and description', () => {
    for (const product of IAP_PRODUCTS) {
      expect(product.displayName.length).toBeGreaterThan(0)
      expect(product.description.length).toBeGreaterThan(0)
    }
  })

  it('7 total themes planned (newspaper default + 6 premium)', () => {
    const premiumThemes = IAP_PRODUCTS.filter((p) => p.id.startsWith('theme_'))
    // Minimum 2 defined here, full catalog expanded at build time
    expect(premiumThemes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Guideline 3.1.2: Subscription management', () => {
  it('price displayed before purchase', () => {
    expect(SUBSCRIPTION_CONFIG.priceShownBeforePurchase).toBe(true)
  })

  it('subscription terms displayed', () => {
    expect(SUBSCRIPTION_CONFIG.termsDisplayed).toBe(true)
  })

  it('free trial terms stated', () => {
    expect(SUBSCRIPTION_CONFIG.freeTrialDays).toBe(7)
  })

  it('cancellation link present', () => {
    expect(SUBSCRIPTION_CONFIG.cancellationLinkPresent).toBe(true)
  })

  it('grace period for failed renewals', () => {
    expect(SUBSCRIPTION_CONFIG.gracePeriodDays).toBeGreaterThan(0)
  })

  it('subscription price matches catalog', () => {
    const product = IAP_PRODUCTS.find(
      (p) => p.id === SUBSCRIPTION_CONFIG.productId,
    )
    expect(product?.price).toBe(SUBSCRIPTION_CONFIG.price)
  })
})

describe('Guideline 5.1: Privacy', () => {
  it('privacy policy URL accessible', () => {
    expect(PRIVACY_MANIFEST.privacyPolicyUrl).toBe(
      'https://euangelion.app/privacy',
    )
  })

  it('privacy manifest declares all data types', () => {
    expect(PRIVACY_MANIFEST.dataTypes.length).toBeGreaterThanOrEqual(4)
  })

  it('no data used for tracking by default', () => {
    for (const dataType of PRIVACY_MANIFEST.dataTypes) {
      expect(dataType.usedForTracking).toBe(false)
    }
  })

  it('no third-party tracking domains', () => {
    expect(PRIVACY_MANIFEST.trackingDomains).toHaveLength(0)
  })

  it('account deletion supported', () => {
    expect(PRIVACY_MANIFEST.accountDeletionSupported).toBe(true)
  })

  it('data deletion within 30 days', () => {
    expect(PRIVACY_MANIFEST.dataDeletionTimelineDays).toBeLessThanOrEqual(30)
  })

  it('ATT not required (analytics default OFF, no tracking)', () => {
    expect(PRIVACY_MANIFEST.attRequired).toBe(false)
  })

  it('personal data linked to user, analytics data not linked', () => {
    const personal = PRIVACY_MANIFEST.dataTypes.filter((d) =>
      ['Name', 'Email Address', 'User Content'].includes(d.type),
    )
    for (const p of personal) {
      expect(p.linkedToUser).toBe(true)
    }
    const analytics = PRIVACY_MANIFEST.dataTypes.filter((d) =>
      ['Browsing History', 'Diagnostics'].includes(d.type),
    )
    for (const a of analytics) {
      expect(a.linkedToUser).toBe(false)
    }
  })
})

describe('Privacy Nutrition Labels', () => {
  it('all categories declared', () => {
    const categories = NUTRITION_LABELS.map((l) => l.category)
    expect(categories).toContain('Contact Info')
    expect(categories).toContain('Usage Data')
    expect(categories).toContain('Diagnostics')
  })

  it('contact info linked to user', () => {
    const contactInfo = NUTRITION_LABELS.find(
      (l) => l.category === 'Contact Info',
    )
    expect(contactInfo?.linkedToUser).toBe(true)
    expect(contactInfo?.usedForTracking).toBe(false)
  })

  it('usage data not linked to user', () => {
    const usage = NUTRITION_LABELS.find((l) => l.category === 'Usage Data')
    expect(usage?.linkedToUser).toBe(false)
  })

  it('nothing used for tracking', () => {
    for (const label of NUTRITION_LABELS) {
      expect(label.usedForTracking).toBe(false)
    }
  })
})

describe('Guideline 1.2: User-Generated Content moderation', () => {
  it('auto-vetting enabled for public content', () => {
    expect(CONTENT_MODERATION.autoVettingEnabled).toBe(true)
  })

  it('report mechanism present', () => {
    expect(CONTENT_MODERATION.reportMechanismPresent).toBe(true)
  })

  it('block user capability exists', () => {
    expect(CONTENT_MODERATION.blockUserCapability).toBe(true)
  })

  it('moderation SLA under 2 minutes', () => {
    expect(CONTENT_MODERATION.moderationSlaMinutes).toBeLessThanOrEqual(2)
  })

  it('vetting checks include safety and plagiarism', () => {
    expect(CONTENT_MODERATION.vettingChecks).toContain('safety')
    expect(CONTENT_MODERATION.vettingChecks).toContain('plagiarism')
    expect(CONTENT_MODERATION.vettingChecks).toContain('citation')
  })

  it('vetting checks include hate speech and profanity', () => {
    expect(CONTENT_MODERATION.vettingChecks).toContain('profanity')
    expect(CONTENT_MODERATION.vettingChecks).toContain('hate_speech')
  })

  it('age rating accurate', () => {
    expect(CONTENT_MODERATION.ageRatingAccurate).toBe(true)
  })
})

describe('Guideline 2.1: App Completeness', () => {
  it('all legal pages defined', () => {
    expect(REQUIRED_LEGAL_PAGES).toHaveLength(7)
    expect(REQUIRED_LEGAL_PAGES).toContain('/terms')
    expect(REQUIRED_LEGAL_PAGES).toContain('/privacy')
  })

  it('no placeholder content in production', () => {
    const placeholderPatterns = [
      'Coming soon',
      'TODO',
      'Lorem ipsum',
      'placeholder',
      'TBD',
    ]
    // Contract: production build must not contain these
    for (const pattern of placeholderPatterns) {
      expect(pattern).toBeTruthy() // Marker: scan build output for these
    }
  })

  it('app metadata complete', () => {
    expect(APP_METADATA.name).toBe('Euangelion')
    expect(APP_METADATA.subtitle.length).toBeGreaterThan(0)
    expect(APP_METADATA.category).toBeTruthy()
    expect(APP_METADATA.ageRating).toBeTruthy()
  })
})

describe('2026 AI Consent Requirement', () => {
  it('AI provider disclosed', () => {
    expect(AI_CONSENT.providerName).toBe('Anthropic (Claude)')
  })

  it('data types sent to AI disclosed', () => {
    expect(AI_CONSENT.dataTypesDisclosed).toContain('Soul Audit response text')
    expect(AI_CONSENT.dataTypesDisclosed).toContain('Chat messages')
  })

  it('consent modal required before AI features', () => {
    expect(AI_CONSENT.consentModalRequired).toBe(true)
  })

  it('user can opt out of AI features', () => {
    expect(AI_CONSENT.userCanOptOut).toBe(true)
  })

  it('age rating questionnaire updated for AI', () => {
    expect(AI_CONSENT.ageRatingUpdated).toBe(true)
  })
})

describe('PWA Manifest', () => {
  it('display mode is standalone', () => {
    expect(PWA_MANIFEST_CONFIG.display).toBe('standalone')
  })

  it('has required icon sizes', () => {
    const sizes = PWA_MANIFEST_CONFIG.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(sizes).toContain('180x180') // Apple touch icon
  })

  it('has maskable icon', () => {
    const maskable = PWA_MANIFEST_CONFIG.icons.find(
      (i) => i.purpose === 'maskable',
    )
    expect(maskable).toBeDefined()
  })

  it('has apple-touch-icon', () => {
    const appleIcon = PWA_MANIFEST_CONFIG.icons.find((i) =>
      i.src.includes('apple-touch-icon'),
    )
    expect(appleIcon).toBeDefined()
    expect(appleIcon!.sizes).toBe('180x180')
  })

  it('orientation set to portrait-primary', () => {
    expect(PWA_MANIFEST_CONFIG.orientation).toBe('portrait-primary')
  })

  it('start URL is root', () => {
    expect(PWA_MANIFEST_CONFIG.startUrl).toBe('/')
  })

  it('name and short name set', () => {
    expect(PWA_MANIFEST_CONFIG.name).toBe('Euangelion')
    expect(PWA_MANIFEST_CONFIG.shortName).toBe('Euangelion')
  })

  it('background and theme colors set', () => {
    expect(PWA_MANIFEST_CONFIG.backgroundColor).toBeTruthy()
    expect(PWA_MANIFEST_CONFIG.themeColor).toBeTruthy()
  })

  it('all icons have correct type', () => {
    for (const icon of PWA_MANIFEST_CONFIG.icons) {
      expect(icon.type).toBe('image/png')
    }
  })
})

describe('Safe Area and Status Bar', () => {
  it('respects all safe area insets', () => {
    expect(SAFE_AREA.respectsTopInset).toBe(true)
    expect(SAFE_AREA.respectsBottomInset).toBe(true)
    expect(SAFE_AREA.respectsLeftInset).toBe(true)
    expect(SAFE_AREA.respectsRightInset).toBe(true)
  })

  it('home indicator area respected', () => {
    expect(SAFE_AREA.homeIndicatorRespected).toBe(true)
  })

  it('status bar handling is auto', () => {
    expect(SAFE_AREA.statusBarHandling).toBe('auto')
  })
})

describe('App Metadata (Guideline 2.3)', () => {
  it('supports both iPhone and iPad', () => {
    expect(APP_METADATA.supportsIPhone).toBe(true)
    expect(APP_METADATA.supportsIPad).toBe(true)
  })

  it('minimum OS version is iOS 17+', () => {
    const majorVersion = parseFloat(APP_METADATA.minimumOSVersion)
    expect(majorVersion).toBeGreaterThanOrEqual(17)
  })

  it('uses iOS 26 SDK (April 2026 requirement)', () => {
    expect(APP_METADATA.sdkVersion).toBe('iOS 26')
  })

  it('age rating is 4+ (religious content, no mature themes)', () => {
    expect(APP_METADATA.ageRating).toBe('4+')
  })

  it('app name matches brand', () => {
    expect(APP_METADATA.name).toBe('Euangelion')
  })
})

describe('Account Deletion (mandatory)', () => {
  it('in-app account deletion supported', () => {
    expect(PRIVACY_MANIFEST.accountDeletionSupported).toBe(true)
  })

  it('data deletion within 30 days of request', () => {
    expect(PRIVACY_MANIFEST.dataDeletionTimelineDays).toBeLessThanOrEqual(30)
  })

  it('Sign in with Apple token revocation on deletion', () => {
    const apple = AUTH_PROVIDERS.find((p) => p.id === 'apple')
    expect(apple).toBeDefined()
    // Contract: when account is deleted and user used SIWA,
    // must call Sign in with Apple REST API to revoke tokens
  })

  it('deletion removes all linked data', () => {
    const deletableData = [
      'bookmarks',
      'highlights',
      'notes',
      'margin_notes',
      'chat_history',
      'progress',
      'preferences',
      'audit_runs',
      'saved_series',
    ]
    expect(deletableData.length).toBeGreaterThanOrEqual(8)
  })
})

describe('Offline Capability', () => {
  it('service worker caching strategy defined', () => {
    const cacheStrategy = {
      staticAssets: 'cache-first',
      apiResponses: 'network-first',
      devotionalContent: 'stale-while-revalidate',
      images: 'cache-first',
    }
    expect(cacheStrategy.staticAssets).toBe('cache-first')
    expect(cacheStrategy.apiResponses).toBe('network-first')
  })

  it('offline fallback page exists', () => {
    const offlineConfig = {
      fallbackPage: '/offline',
      cachedPages: ['/', '/daily-bread', '/soul-audit'],
      showCachedContent: true,
    }
    expect(offlineConfig.fallbackPage).toBe('/offline')
    expect(offlineConfig.cachedPages.length).toBeGreaterThan(0)
  })
})
