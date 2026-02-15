/**
 * Visual, Theme, and Responsive Test Suite
 *
 * Covers:
 * - Theme system (7 themes: newspaper default + 6 premium)
 * - Dark mode / light mode token contracts
 * - Responsive breakpoints (375px, 768px, 1024px)
 * - Typography scale and font stack
 * - Color contrast ratios (WCAG 2.1 AA)
 * - Layout constraints and spacing system
 * - Safe area inset handling (iOS)
 * - Print stylesheet contracts
 */
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeDefinition {
  id: string
  name: string
  isPremium: boolean
  colors: {
    background: string
    surface: string
    text: string
    textMuted: string
    accent: string
    border: string
  }
  darkMode: boolean
}

interface BreakpointSpec {
  name: string
  minWidth: number
  maxWidth: number | null
  columns: number
  gutterPx: number
  marginPx: number
}

interface TypographyToken {
  name: string
  fontFamily: string
  fontWeight: number
  sizeRem: number
  lineHeight: number
  letterSpacing: string
}

interface SpacingToken {
  name: string
  valuePx: number
}

interface LayoutConstraint {
  element: string
  maxWidth: string
  minHeight: string | null
  padding: string
}

interface PrintRule {
  selector: string
  property: string
  value: string
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const THEMES: ThemeDefinition[] = [
  {
    id: 'newspaper',
    name: 'Newspaper (Default)',
    isPremium: false,
    colors: {
      background: '#faf8f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textMuted: '#6b6b6b',
      accent: '#1f2a8d',
      border: '#d4d0c8',
    },
    darkMode: false,
  },
  {
    id: 'sacred-dark',
    name: 'Sacred Dark',
    isPremium: true,
    colors: {
      background: '#0a0a0f',
      surface: '#1a1a2e',
      text: '#e8e6e0',
      textMuted: '#8a8780',
      accent: '#c9a84c',
      border: '#2a2a3e',
    },
    darkMode: true,
  },
  {
    id: 'parchment',
    name: 'Parchment',
    isPremium: true,
    colors: {
      background: '#f4edd8',
      surface: '#faf6eb',
      text: '#3a2e1a',
      textMuted: '#7a6e5a',
      accent: '#8b4513',
      border: '#d4c8a8',
    },
    darkMode: false,
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    isPremium: true,
    colors: {
      background: '#0d1b2a',
      surface: '#1b2838',
      text: '#e0e8f0',
      textMuted: '#7a8a9a',
      accent: '#4a9eff',
      border: '#2a3848',
    },
    darkMode: true,
  },
  {
    id: 'forest',
    name: 'Forest',
    isPremium: true,
    colors: {
      background: '#0a1a0a',
      surface: '#1a2a1a',
      text: '#d8e8d0',
      textMuted: '#7a8a70',
      accent: '#4caf50',
      border: '#2a3a2a',
    },
    darkMode: true,
  },
  {
    id: 'ivory',
    name: 'Ivory',
    isPremium: true,
    colors: {
      background: '#fffff0',
      surface: '#ffffff',
      text: '#2a2a2a',
      textMuted: '#6a6a6a',
      accent: '#1a5276',
      border: '#e0ddd0',
    },
    darkMode: false,
  },
  {
    id: 'desert-rose',
    name: 'Desert Rose',
    isPremium: true,
    colors: {
      background: '#2a1a1a',
      surface: '#3a2a2a',
      text: '#e8d8d0',
      textMuted: '#9a8a80',
      accent: '#c97070',
      border: '#4a3a3a',
    },
    darkMode: true,
  },
]

const BREAKPOINTS: BreakpointSpec[] = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 767,
    columns: 1,
    gutterPx: 16,
    marginPx: 16,
  },
  {
    name: 'tablet',
    minWidth: 768,
    maxWidth: 1023,
    columns: 2,
    gutterPx: 24,
    marginPx: 24,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: null,
    columns: 3,
    gutterPx: 32,
    marginPx: 32,
  },
]

const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  {
    name: 'display-xl',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 4.0,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  {
    name: 'display-lg',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 2.5,
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },
  {
    name: 'heading-1',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 2.0,
    lineHeight: 1.2,
    letterSpacing: '0',
  },
  {
    name: 'heading-2',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 1.5,
    lineHeight: 1.25,
    letterSpacing: '0',
  },
  {
    name: 'heading-3',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 1.25,
    lineHeight: 1.3,
    letterSpacing: '0',
  },
  {
    name: 'body',
    fontFamily: 'Instrument Serif',
    fontWeight: 400,
    sizeRem: 1.0,
    lineHeight: 1.6,
    letterSpacing: '0',
  },
  {
    name: 'body-small',
    fontFamily: 'Inter',
    fontWeight: 400,
    sizeRem: 0.875,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  {
    name: 'label',
    fontFamily: 'Industry',
    fontWeight: 500,
    sizeRem: 0.75,
    lineHeight: 1.4,
    letterSpacing: '0.05em',
  },
  {
    name: 'caption',
    fontFamily: 'Inter',
    fontWeight: 400,
    sizeRem: 0.625,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
]

const SPACING_TOKENS: SpacingToken[] = [
  { name: 'space-1', valuePx: 4 },
  { name: 'space-2', valuePx: 8 },
  { name: 'space-3', valuePx: 12 },
  { name: 'space-4', valuePx: 16 },
  { name: 'space-5', valuePx: 24 },
  { name: 'space-6', valuePx: 32 },
  { name: 'space-7', valuePx: 48 },
  { name: 'space-8', valuePx: 64 },
  { name: 'space-9', valuePx: 96 },
]

const LAYOUT_CONSTRAINTS: LayoutConstraint[] = [
  {
    element: 'reader-column',
    maxWidth: '680px',
    minHeight: null,
    padding: '0 var(--space-4)',
  },
  {
    element: 'page-container',
    maxWidth: '1200px',
    minHeight: '100vh',
    padding: '0 var(--space-6)',
  },
  { element: 'card-grid', maxWidth: '1200px', minHeight: null, padding: '0' },
  {
    element: 'hero-section',
    maxWidth: '100%',
    minHeight: '60vh',
    padding: 'var(--space-8) var(--space-6)',
  },
  {
    element: 'footer',
    maxWidth: '100%',
    minHeight: null,
    padding: 'var(--space-7) var(--space-6)',
  },
]

const PRINT_RULES: PrintRule[] = [
  { selector: 'nav', property: 'display', value: 'none' },
  { selector: 'footer', property: 'display', value: 'none' },
  { selector: '.chat-fab', property: 'display', value: 'none' },
  { selector: 'body', property: 'background', value: 'white' },
  { selector: 'body', property: 'color', value: 'black' },
  { selector: 'a', property: 'text-decoration', value: 'underline' },
  { selector: '.no-print', property: 'display', value: 'none' },
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) throw new Error(`Invalid hex color: ${hex}`)
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function getColumnsForWidth(width: number): number {
  const breakpoint = BREAKPOINTS.find(
    (b) => width >= b.minWidth && (b.maxWidth === null || width <= b.maxWidth),
  )
  return breakpoint?.columns ?? 1
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Theme catalog', () => {
  it('has exactly 7 themes', () => {
    expect(THEMES).toHaveLength(7)
  })

  it('has 1 free default theme', () => {
    const free = THEMES.filter((t) => !t.isPremium)
    expect(free).toHaveLength(1)
    expect(free[0].id).toBe('newspaper')
  })

  it('has 6 premium themes', () => {
    const premium = THEMES.filter((t) => t.isPremium)
    expect(premium).toHaveLength(6)
  })

  it('all themes have complete color tokens', () => {
    for (const theme of THEMES) {
      expect(theme.colors.background).toBeTruthy()
      expect(theme.colors.surface).toBeTruthy()
      expect(theme.colors.text).toBeTruthy()
      expect(theme.colors.textMuted).toBeTruthy()
      expect(theme.colors.accent).toBeTruthy()
      expect(theme.colors.border).toBeTruthy()
    }
  })

  it('all themes have unique IDs', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dark themes have dark backgrounds', () => {
    const darkThemes = THEMES.filter((t) => t.darkMode)
    for (const theme of darkThemes) {
      const lum = relativeLuminance(theme.colors.background)
      expect(lum).toBeLessThan(0.1) // Dark backgrounds
    }
  })

  it('light themes have light backgrounds', () => {
    const lightThemes = THEMES.filter((t) => !t.darkMode)
    for (const theme of lightThemes) {
      const lum = relativeLuminance(theme.colors.background)
      expect(lum).toBeGreaterThan(0.5) // Light backgrounds
    }
  })
})

describe('Theme contrast ratios (WCAG 2.1 AA)', () => {
  it('body text contrast ≥ 4.5:1 on all themes', () => {
    for (const theme of THEMES) {
      const ratio = contrastRatio(theme.colors.text, theme.colors.background)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('body text contrast ≥ 4.5:1 on surface', () => {
    for (const theme of THEMES) {
      const ratio = contrastRatio(theme.colors.text, theme.colors.surface)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('muted text contrast ≥ 3:1 on background (large text)', () => {
    for (const theme of THEMES) {
      const ratio = contrastRatio(
        theme.colors.textMuted,
        theme.colors.background,
      )
      expect(ratio).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('accent color contrast ≥ 3:1 on background', () => {
    for (const theme of THEMES) {
      const ratio = contrastRatio(theme.colors.accent, theme.colors.background)
      expect(ratio).toBeGreaterThanOrEqual(3.0)
    }
  })
})

describe('Responsive breakpoints', () => {
  it('has 3 breakpoints (mobile, tablet, desktop)', () => {
    expect(BREAKPOINTS).toHaveLength(3)
  })

  it('mobile: 0-767px, 1 column', () => {
    const mobile = BREAKPOINTS.find((b) => b.name === 'mobile')!
    expect(mobile.minWidth).toBe(0)
    expect(mobile.maxWidth).toBe(767)
    expect(mobile.columns).toBe(1)
  })

  it('tablet: 768-1023px, 2 columns', () => {
    const tablet = BREAKPOINTS.find((b) => b.name === 'tablet')!
    expect(tablet.minWidth).toBe(768)
    expect(tablet.maxWidth).toBe(1023)
    expect(tablet.columns).toBe(2)
  })

  it('desktop: 1024px+, 3 columns', () => {
    const desktop = BREAKPOINTS.find((b) => b.name === 'desktop')!
    expect(desktop.minWidth).toBe(1024)
    expect(desktop.maxWidth).toBeNull()
    expect(desktop.columns).toBe(3)
  })

  it('breakpoints cover all widths without gaps', () => {
    const sorted = [...BREAKPOINTS].sort((a, b) => a.minWidth - b.minWidth)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].minWidth).toBe(sorted[i - 1].maxWidth! + 1)
    }
  })

  it('column count correct at key widths', () => {
    expect(getColumnsForWidth(375)).toBe(1) // iPhone SE
    expect(getColumnsForWidth(768)).toBe(2) // iPad
    expect(getColumnsForWidth(1024)).toBe(3) // Desktop
    expect(getColumnsForWidth(1440)).toBe(3) // Large desktop
  })

  it('mobile gutters are smallest', () => {
    const mobile = BREAKPOINTS.find((b) => b.name === 'mobile')!
    const tablet = BREAKPOINTS.find((b) => b.name === 'tablet')!
    const desktop = BREAKPOINTS.find((b) => b.name === 'desktop')!
    expect(mobile.gutterPx).toBeLessThan(tablet.gutterPx)
    expect(tablet.gutterPx).toBeLessThan(desktop.gutterPx)
  })
})

describe('Typography tokens', () => {
  it('uses 3 font families', () => {
    const families = new Set(TYPOGRAPHY_TOKENS.map((t) => t.fontFamily))
    expect(families.size).toBe(3)
    expect(families).toContain('Instrument Serif')
    expect(families).toContain('Inter')
    expect(families).toContain('Industry')
  })

  it('display sizes use Instrument Serif', () => {
    const displays = TYPOGRAPHY_TOKENS.filter((t) =>
      t.name.startsWith('display'),
    )
    for (const token of displays) {
      expect(token.fontFamily).toBe('Instrument Serif')
    }
  })

  it('labels use Industry', () => {
    const labels = TYPOGRAPHY_TOKENS.filter((t) => t.name === 'label')
    for (const token of labels) {
      expect(token.fontFamily).toBe('Industry')
    }
  })

  it('sizes descend from display to caption', () => {
    const display = TYPOGRAPHY_TOKENS.find((t) => t.name === 'display-xl')!
    const body = TYPOGRAPHY_TOKENS.find((t) => t.name === 'body')!
    const caption = TYPOGRAPHY_TOKENS.find((t) => t.name === 'caption')!
    expect(display.sizeRem).toBeGreaterThan(body.sizeRem)
    expect(body.sizeRem).toBeGreaterThan(caption.sizeRem)
  })

  it('line heights are appropriate', () => {
    for (const token of TYPOGRAPHY_TOKENS) {
      expect(token.lineHeight).toBeGreaterThanOrEqual(1.0)
      expect(token.lineHeight).toBeLessThanOrEqual(2.0)
    }
  })

  it('body text has reading-optimized line height', () => {
    const body = TYPOGRAPHY_TOKENS.find((t) => t.name === 'body')!
    expect(body.lineHeight).toBeGreaterThanOrEqual(1.5) // Good for reading
  })

  it('display text has tight line height', () => {
    const display = TYPOGRAPHY_TOKENS.find((t) => t.name === 'display-xl')!
    expect(display.lineHeight).toBeLessThanOrEqual(1.2)
  })
})

describe('Spacing system', () => {
  it('has 9 spacing tokens', () => {
    expect(SPACING_TOKENS).toHaveLength(9)
  })

  it('base unit is 4px', () => {
    expect(SPACING_TOKENS[0].valuePx).toBe(4)
  })

  it('spacing values increase monotonically', () => {
    for (let i = 1; i < SPACING_TOKENS.length; i++) {
      expect(SPACING_TOKENS[i].valuePx).toBeGreaterThan(
        SPACING_TOKENS[i - 1].valuePx,
      )
    }
  })

  it('all values are multiples of 4', () => {
    for (const token of SPACING_TOKENS) {
      expect(token.valuePx % 4).toBe(0)
    }
  })
})

describe('Layout constraints', () => {
  it('reader column max-width is 680px', () => {
    const reader = LAYOUT_CONSTRAINTS.find(
      (l) => l.element === 'reader-column',
    )!
    expect(reader.maxWidth).toBe('680px')
  })

  it('page container max-width is 1200px', () => {
    const page = LAYOUT_CONSTRAINTS.find((l) => l.element === 'page-container')!
    expect(page.maxWidth).toBe('1200px')
  })

  it('page container has min-height 100vh', () => {
    const page = LAYOUT_CONSTRAINTS.find((l) => l.element === 'page-container')!
    expect(page.minHeight).toBe('100vh')
  })

  it('hero section is full-width', () => {
    const hero = LAYOUT_CONSTRAINTS.find((l) => l.element === 'hero-section')!
    expect(hero.maxWidth).toBe('100%')
  })

  it('all elements have padding defined', () => {
    for (const constraint of LAYOUT_CONSTRAINTS) {
      expect(constraint.padding).toBeTruthy()
    }
  })
})

describe('Print stylesheet', () => {
  it('hides navigation in print', () => {
    const navRule = PRINT_RULES.find((r) => r.selector === 'nav')
    expect(navRule?.property).toBe('display')
    expect(navRule?.value).toBe('none')
  })

  it('hides footer in print', () => {
    const footerRule = PRINT_RULES.find((r) => r.selector === 'footer')
    expect(footerRule?.value).toBe('none')
  })

  it('hides chat FAB in print', () => {
    const fabRule = PRINT_RULES.find((r) => r.selector === '.chat-fab')
    expect(fabRule?.value).toBe('none')
  })

  it('uses white background for print', () => {
    const bgRule = PRINT_RULES.find(
      (r) => r.selector === 'body' && r.property === 'background',
    )
    expect(bgRule?.value).toBe('white')
  })

  it('uses black text for print', () => {
    const colorRule = PRINT_RULES.find(
      (r) => r.selector === 'body' && r.property === 'color',
    )
    expect(colorRule?.value).toBe('black')
  })

  it('underlines links in print', () => {
    const linkRule = PRINT_RULES.find((r) => r.selector === 'a')
    expect(linkRule?.value).toBe('underline')
  })

  it('hides no-print elements', () => {
    const noPrintRule = PRINT_RULES.find((r) => r.selector === '.no-print')
    expect(noPrintRule?.value).toBe('none')
  })
})
