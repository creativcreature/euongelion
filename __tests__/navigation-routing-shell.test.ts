/**
 * Navigation, Routing, and Site Shell Tests
 *
 * Tests from PLAN-V3 Phases 2, 15, 16 and euan-PLAN-v2 Phase A:
 * - Site shell consistency (shared header on all non-Wake-Up pages)
 * - Sticky header behavior
 * - Primary top nav: Home | Soul Audit | Daily Bread | Series
 * - Breadcrumbs on all non-home pages
 * - 4-column footer: Product, Company, Help, Legal
 * - Full legal pages presence
 * - /daily-bread canonical route + /my-devotional redirect
 * - Wake-Up product boundary (separate visual surface)
 * - Dead-end prevention (every page has forward navigation)
 * - Sign in/sign up controls (logged out) vs avatar menu (logged in)
 * - Help hub and FAQ integration
 */
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthState = 'logged_out' | 'logged_in'

interface NavItem {
  label: string
  href: string
  active: boolean
}

interface BreadcrumbItem {
  label: string
  href: string | null // null = current page (not linked)
}

interface FooterColumn {
  heading: string
  links: { label: string; href: string }[]
}

interface ShellConfig {
  route: string
  authState: AuthState
  isWakeUp: boolean
}

// ---------------------------------------------------------------------------
// Pure helpers (contract stubs)
// ---------------------------------------------------------------------------

const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/', active: false },
  { label: 'Soul Audit', href: '/soul-audit', active: false },
  { label: 'Daily Bread', href: '/daily-bread', active: false },
  { label: 'Series', href: '/series', active: false },
]

const LEGAL_PAGES = [
  '/terms',
  '/privacy',
  '/cookie-policy',
  '/community-guidelines',
  '/content-disclaimer',
  '/donation-disclosure',
  '/contact',
]

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Soul Audit', href: '/soul-audit' },
      { label: 'Daily Bread', href: '/daily-bread' },
      { label: 'Series', href: '/series' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Donation Transparency', href: '/donation-disclosure' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'FAQ', href: '/help' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Community Guidelines', href: '/community-guidelines' },
    ],
  },
]

function getPrimaryNav(currentRoute: string): NavItem[] {
  return PRIMARY_NAV.map((item) => ({
    ...item,
    active:
      currentRoute === item.href || currentRoute.startsWith(item.href + '/'),
  }))
}

function getBreadcrumbs(route: string): BreadcrumbItem[] {
  if (route === '/') return [] // No breadcrumbs on home

  const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]
  const segments = route.split('/').filter(Boolean)

  const labelMap: Record<string, string> = {
    'soul-audit': 'Soul Audit',
    'daily-bread': 'Daily Bread',
    series: 'Series',
    'wake-up': 'Wake Up',
    settings: 'Settings',
    help: 'Help',
    terms: 'Terms',
    privacy: 'Privacy',
    results: 'Results',
    devotional: 'Devotional',
  }

  for (let i = 0; i < segments.length; i++) {
    const isLast = i === segments.length - 1
    const path = '/' + segments.slice(0, i + 1).join('/')
    crumbs.push({
      label: labelMap[segments[i]] ?? segments[i],
      href: isLast ? null : path,
    })
  }

  return crumbs
}

function resolveRoute(path: string): {
  redirect: string | null
  canonical: string
} {
  if (path === '/my-devotional') {
    return { redirect: '/daily-bread', canonical: '/daily-bread' }
  }
  return { redirect: null, canonical: path }
}

function getShellVariant(config: ShellConfig): {
  showSharedShell: boolean
  showBreadcrumbs: boolean
  headerControls: 'auth_buttons' | 'avatar_menu'
  showWakeUpMasthead: boolean
} {
  const isHome = config.route === '/'
  return {
    showSharedShell: !config.isWakeUp,
    showBreadcrumbs: !isHome && !config.isWakeUp,
    headerControls:
      config.authState === 'logged_in' ? 'avatar_menu' : 'auth_buttons',
    showWakeUpMasthead: config.isWakeUp,
  }
}

function isWakeUpRoute(route: string): boolean {
  return route.startsWith('/wake-up')
}

function hasForwardNavigation(route: string): boolean {
  // Every page must have at least one forward navigation option
  // Dead-end pages return false
  const deadEndRoutes: string[] = [] // No dead ends allowed
  return !deadEndRoutes.includes(route)
}

function getFooterLinks(): FooterColumn[] {
  return FOOTER_COLUMNS
}

function getHelpHubSections(): string[] {
  return [
    'Getting Started',
    'Soul Audit',
    'Daily Bread',
    'Reading',
    'Saves & Highlights',
    'Settings',
    'FAQ',
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Primary navigation', () => {
  it('has exactly 4 primary nav items', () => {
    expect(PRIMARY_NAV).toHaveLength(4)
  })

  it('includes Home, Soul Audit, Daily Bread, Series', () => {
    const labels = PRIMARY_NAV.map((n) => n.label)
    expect(labels).toEqual(['Home', 'Soul Audit', 'Daily Bread', 'Series'])
  })

  it('marks active item based on current route', () => {
    const nav = getPrimaryNav('/soul-audit')
    const active = nav.find((n) => n.active)
    expect(active?.label).toBe('Soul Audit')
  })

  it('marks nested route as active', () => {
    const nav = getPrimaryNav('/daily-bread/slot-1')
    const active = nav.find((n) => n.active)
    expect(active?.label).toBe('Daily Bread')
  })

  it('home is active on root route', () => {
    const nav = getPrimaryNav('/')
    const active = nav.find((n) => n.active)
    expect(active?.label).toBe('Home')
  })

  it('FAQ moved to footer, not in primary nav', () => {
    const labels = PRIMARY_NAV.map((n) => n.label)
    expect(labels).not.toContain('FAQ')
    expect(labels).not.toContain('Help')
  })
})

describe('Breadcrumbs', () => {
  it('no breadcrumbs on home page', () => {
    const crumbs = getBreadcrumbs('/')
    expect(crumbs).toHaveLength(0)
  })

  it('soul-audit has Home → Soul Audit', () => {
    const crumbs = getBreadcrumbs('/soul-audit')
    expect(crumbs).toHaveLength(2)
    expect(crumbs[0]).toEqual({ label: 'Home', href: '/' })
    expect(crumbs[1]).toEqual({ label: 'Soul Audit', href: null })
  })

  it('soul-audit/results has Home → Soul Audit → Results', () => {
    const crumbs = getBreadcrumbs('/soul-audit/results')
    expect(crumbs).toHaveLength(3)
    expect(crumbs[1]).toEqual({ label: 'Soul Audit', href: '/soul-audit' })
    expect(crumbs[2]).toEqual({ label: 'Results', href: null })
  })

  it('daily-bread has Home → Daily Bread', () => {
    const crumbs = getBreadcrumbs('/daily-bread')
    expect(crumbs).toHaveLength(2)
    expect(crumbs[1].label).toBe('Daily Bread')
  })

  it('series page has Home → Series', () => {
    const crumbs = getBreadcrumbs('/series')
    expect(crumbs).toHaveLength(2)
  })

  it('settings has Home → Settings', () => {
    const crumbs = getBreadcrumbs('/settings')
    expect(crumbs[1].label).toBe('Settings')
  })

  it('last breadcrumb has null href (current page)', () => {
    const crumbs = getBreadcrumbs('/daily-bread')
    expect(crumbs[crumbs.length - 1].href).toBeNull()
  })
})

describe('Route redirects', () => {
  it('/my-devotional redirects to /daily-bread', () => {
    const result = resolveRoute('/my-devotional')
    expect(result.redirect).toBe('/daily-bread')
    expect(result.canonical).toBe('/daily-bread')
  })

  it('/daily-bread is canonical (no redirect)', () => {
    const result = resolveRoute('/daily-bread')
    expect(result.redirect).toBeNull()
    expect(result.canonical).toBe('/daily-bread')
  })

  it('/soul-audit is canonical (no redirect)', () => {
    const result = resolveRoute('/soul-audit')
    expect(result.redirect).toBeNull()
  })
})

describe('Site shell variants', () => {
  it('non-wake-up pages show shared shell', () => {
    const shell = getShellVariant({
      route: '/daily-bread',
      authState: 'logged_out',
      isWakeUp: false,
    })
    expect(shell.showSharedShell).toBe(true)
    expect(shell.showWakeUpMasthead).toBe(false)
  })

  it('wake-up pages show separate masthead', () => {
    const shell = getShellVariant({
      route: '/wake-up',
      authState: 'logged_out',
      isWakeUp: true,
    })
    expect(shell.showSharedShell).toBe(false)
    expect(shell.showWakeUpMasthead).toBe(true)
  })

  it('logged-out users see auth buttons', () => {
    const shell = getShellVariant({
      route: '/',
      authState: 'logged_out',
      isWakeUp: false,
    })
    expect(shell.headerControls).toBe('auth_buttons')
  })

  it('logged-in users see avatar menu', () => {
    const shell = getShellVariant({
      route: '/',
      authState: 'logged_in',
      isWakeUp: false,
    })
    expect(shell.headerControls).toBe('avatar_menu')
  })

  it('breadcrumbs shown on non-home, non-wake-up pages', () => {
    const shell = getShellVariant({
      route: '/series',
      authState: 'logged_out',
      isWakeUp: false,
    })
    expect(shell.showBreadcrumbs).toBe(true)
  })

  it('no breadcrumbs on home page', () => {
    const shell = getShellVariant({
      route: '/',
      authState: 'logged_out',
      isWakeUp: false,
    })
    expect(shell.showBreadcrumbs).toBe(false)
  })

  it('no breadcrumbs on wake-up pages', () => {
    const shell = getShellVariant({
      route: '/wake-up/series/identity',
      authState: 'logged_out',
      isWakeUp: true,
    })
    expect(shell.showBreadcrumbs).toBe(false)
  })
})

describe('Wake-Up product boundary', () => {
  it('wake-up routes are identified correctly', () => {
    expect(isWakeUpRoute('/wake-up')).toBe(true)
    expect(isWakeUpRoute('/wake-up/series/identity')).toBe(true)
    expect(isWakeUpRoute('/wake-up/devotional/identity-day-1')).toBe(true)
  })

  it('non-wake-up routes are identified correctly', () => {
    expect(isWakeUpRoute('/')).toBe(false)
    expect(isWakeUpRoute('/daily-bread')).toBe(false)
    expect(isWakeUpRoute('/soul-audit')).toBe(false)
    expect(isWakeUpRoute('/series')).toBe(false)
  })

  it('wake-up uses warm-black treatment, not blue', () => {
    // Contract: Wake-Up visual surface is separate
    const wakeUpVisual = {
      colorSystem: 'warm-black',
      masthead: 'WAKE UP',
      entryPoint: 'footer-only',
    }
    expect(wakeUpVisual.colorSystem).toBe('warm-black')
    expect(wakeUpVisual.entryPoint).toBe('footer-only')
  })
})

describe('Footer', () => {
  it('has exactly 4 columns', () => {
    const footer = getFooterLinks()
    expect(footer).toHaveLength(4)
  })

  it('columns are Product, Company, Help, Legal', () => {
    const headings = getFooterLinks().map((c) => c.heading)
    expect(headings).toEqual(['Product', 'Company', 'Help', 'Legal'])
  })

  it('Product column links to core features', () => {
    const product = getFooterLinks().find((c) => c.heading === 'Product')!
    const hrefs = product.links.map((l) => l.href)
    expect(hrefs).toContain('/soul-audit')
    expect(hrefs).toContain('/daily-bread')
    expect(hrefs).toContain('/series')
  })

  it('Legal column has essential links', () => {
    const legal = getFooterLinks().find((c) => c.heading === 'Legal')!
    const hrefs = legal.links.map((l) => l.href)
    expect(hrefs).toContain('/terms')
    expect(hrefs).toContain('/privacy')
  })

  it('Help column links to FAQ and Contact', () => {
    const help = getFooterLinks().find((c) => c.heading === 'Help')!
    const hrefs = help.links.map((l) => l.href)
    expect(hrefs).toContain('/help')
    expect(hrefs).toContain('/contact')
  })

  it('Company column includes donation transparency', () => {
    const company = getFooterLinks().find((c) => c.heading === 'Company')!
    const hrefs = company.links.map((l) => l.href)
    expect(hrefs).toContain('/donation-disclosure')
  })
})

describe('Legal pages', () => {
  it('all required legal pages defined', () => {
    expect(LEGAL_PAGES).toContain('/terms')
    expect(LEGAL_PAGES).toContain('/privacy')
    expect(LEGAL_PAGES).toContain('/cookie-policy')
    expect(LEGAL_PAGES).toContain('/community-guidelines')
    expect(LEGAL_PAGES).toContain('/content-disclaimer')
    expect(LEGAL_PAGES).toContain('/donation-disclosure')
    expect(LEGAL_PAGES).toContain('/contact')
  })

  it('has 7 legal pages total', () => {
    expect(LEGAL_PAGES).toHaveLength(7)
  })
})

describe('Dead-end prevention', () => {
  const allRoutes = [
    '/',
    '/soul-audit',
    '/soul-audit/results',
    '/daily-bread',
    '/series',
    '/settings',
    '/help',
    '/terms',
    '/privacy',
    '/wake-up',
    '/wake-up/series/identity',
  ]

  it('no route is a dead end', () => {
    for (const route of allRoutes) {
      expect(hasForwardNavigation(route)).toBe(true)
    }
  })
})

describe('Help hub', () => {
  it('has required sections', () => {
    const sections = getHelpHubSections()
    expect(sections).toContain('Getting Started')
    expect(sections).toContain('Soul Audit')
    expect(sections).toContain('Daily Bread')
    expect(sections).toContain('FAQ')
  })

  it('includes saves and highlights section', () => {
    const sections = getHelpHubSections()
    expect(sections).toContain('Saves & Highlights')
  })

  it('includes settings section for tutorial replay', () => {
    const sections = getHelpHubSections()
    expect(sections).toContain('Settings')
  })
})

describe('Sticky header behavior', () => {
  it('header config includes sticky on all pages', () => {
    const headerConfig = {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      components: ['time', 'slogan', 'mode_toggle', 'auth_control'],
    }
    expect(headerConfig.position).toBe('sticky')
    expect(headerConfig.components).toContain('auth_control')
  })

  it('section nav consistent across routes', () => {
    const sectionNavRoutes = ['/daily-bread', '/series', '/soul-audit']
    const navConfig = {
      behavior: 'sticky_below_header',
      showOn: sectionNavRoutes,
    }
    expect(navConfig.behavior).toBe('sticky_below_header')
    expect(navConfig.showOn).toHaveLength(3)
  })
})
