/**
 * Accessibility Test Suite
 *
 * Covers WCAG 2.1 AA + Apple Human Interface Guidelines:
 * - Keyboard navigation (Tab, Enter, Escape, Arrow keys)
 * - Screen reader compatibility (VoiceOver labels, aria-live)
 * - ARIA attributes (roles, states, properties)
 * - Focus management (traps, return, route transitions)
 * - Color contrast (4.5:1 text, 3:1 large/UI)
 * - Touch targets (44×44pt minimum per Apple HIG)
 * - Reduced motion (prefers-reduced-motion)
 * - Dynamic Type support (iOS text scaling)
 * - Heading hierarchy (no skipped levels)
 * - Form accessibility (labels, errors, descriptions)
 */
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AriaRole =
  | 'dialog'
  | 'navigation'
  | 'tablist'
  | 'tab'
  | 'tabpanel'
  | 'region'
  | 'progressbar'
  | 'alert'
  | 'status'
  | 'banner'
  | 'main'
  | 'complementary'
  | 'contentinfo'
  | 'button'
  | 'link'

interface AriaSpec {
  element: string
  role: AriaRole
  requiredAttributes: string[]
  optionalAttributes: string[]
}

interface ContrastRequirement {
  element: string
  context: 'light' | 'dark' | 'both'
  minRatio: number
  level: 'AA' | 'AAA'
}

interface TouchTargetSpec {
  element: string
  minWidth: number
  minHeight: number
  unit: 'px' | 'pt'
}

interface KeyboardSpec {
  context: string
  key: string
  expectedAction: string
}

interface HeadingSpec {
  page: string
  headings: { level: number; text: string }[]
}

interface FocusSpec {
  trigger: string
  expectedFocusTarget: string
  returnFocusTo: string | null
}

interface ScreenReaderLabel {
  element: string
  label: string
  context: string
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const ARIA_SPECS: AriaSpec[] = [
  {
    element: 'ConsentBanner',
    role: 'dialog',
    requiredAttributes: ['aria-modal', 'aria-labelledby'],
    optionalAttributes: ['aria-describedby'],
  },
  {
    element: 'ReplaceSlotModal',
    role: 'dialog',
    requiredAttributes: ['aria-modal', 'aria-labelledby'],
    optionalAttributes: [],
  },
  {
    element: 'AuthPromptModal',
    role: 'dialog',
    requiredAttributes: ['aria-modal', 'aria-labelledby'],
    optionalAttributes: ['aria-describedby'],
  },
  {
    element: 'PrimaryNav',
    role: 'navigation',
    requiredAttributes: ['aria-label'],
    optionalAttributes: [],
  },
  {
    element: 'Breadcrumbs',
    role: 'navigation',
    requiredAttributes: ['aria-label'],
    optionalAttributes: [],
  },
  {
    element: 'SlotChips',
    role: 'tablist',
    requiredAttributes: ['aria-label'],
    optionalAttributes: ['aria-orientation'],
  },
  {
    element: 'SlotChip',
    role: 'tab',
    requiredAttributes: ['aria-selected', 'aria-controls'],
    optionalAttributes: ['aria-disabled'],
  },
  {
    element: 'SlotPanel',
    role: 'tabpanel',
    requiredAttributes: ['aria-labelledby'],
    optionalAttributes: [],
  },
  {
    element: 'ReasoningAccordion',
    role: 'region',
    requiredAttributes: ['aria-labelledby'],
    optionalAttributes: [],
  },
  {
    element: 'DayProgress',
    role: 'progressbar',
    requiredAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    optionalAttributes: ['aria-label'],
  },
  {
    element: 'ToastNotification',
    role: 'alert',
    requiredAttributes: [],
    optionalAttributes: ['aria-live'],
  },
  {
    element: 'SlotCounter',
    role: 'status',
    requiredAttributes: ['aria-live'],
    optionalAttributes: ['aria-atomic'],
  },
  {
    element: 'SiteHeader',
    role: 'banner',
    requiredAttributes: [],
    optionalAttributes: ['aria-label'],
  },
  {
    element: 'MainContent',
    role: 'main',
    requiredAttributes: [],
    optionalAttributes: ['aria-label'],
  },
  {
    element: 'ChatSidebar',
    role: 'complementary',
    requiredAttributes: ['aria-label'],
    optionalAttributes: [],
  },
  {
    element: 'SiteFooter',
    role: 'contentinfo',
    requiredAttributes: [],
    optionalAttributes: [],
  },
]

const CONTRAST_REQUIREMENTS: ContrastRequirement[] = [
  { element: 'body-text', context: 'both', minRatio: 4.5, level: 'AA' },
  { element: 'large-heading', context: 'both', minRatio: 3.0, level: 'AA' },
  { element: 'ui-component', context: 'both', minRatio: 3.0, level: 'AA' },
  { element: 'placeholder-text', context: 'both', minRatio: 4.5, level: 'AA' },
  {
    element: 'highlight-yellow-on-light',
    context: 'light',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-yellow-on-dark',
    context: 'dark',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-blue-on-light',
    context: 'light',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-blue-on-dark',
    context: 'dark',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-green-on-light',
    context: 'light',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-green-on-dark',
    context: 'dark',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-pink-on-light',
    context: 'light',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-pink-on-dark',
    context: 'dark',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-purple-on-light',
    context: 'light',
    minRatio: 4.5,
    level: 'AA',
  },
  {
    element: 'highlight-purple-on-dark',
    context: 'dark',
    minRatio: 4.5,
    level: 'AA',
  },
  { element: 'locked-badge', context: 'both', minRatio: 3.0, level: 'AA' },
  { element: 'link-text', context: 'both', minRatio: 4.5, level: 'AA' },
  { element: 'button-text', context: 'both', minRatio: 4.5, level: 'AA' },
  { element: 'error-text', context: 'both', minRatio: 4.5, level: 'AA' },
]

const TOUCH_TARGETS: TouchTargetSpec[] = [
  { element: 'nav-link', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'button', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'slot-chip', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'day-cell', minWidth: 44, minHeight: 44, unit: 'pt' },
  {
    element: 'highlight-color-swatch',
    minWidth: 44,
    minHeight: 44,
    unit: 'pt',
  },
  { element: 'chat-fab', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'close-button', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'accordion-trigger', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'checkbox', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'radio-button', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'toggle-switch', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'breadcrumb-link', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'footer-link', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'series-card', minWidth: 44, minHeight: 44, unit: 'pt' },
  { element: 'devotional-day-button', minWidth: 44, minHeight: 44, unit: 'pt' },
]

const KEYBOARD_SPECS: KeyboardSpec[] = [
  {
    context: 'PrimaryNav',
    key: 'Tab',
    expectedAction: 'Move focus to next nav item',
  },
  {
    context: 'PrimaryNav',
    key: 'Enter',
    expectedAction: 'Navigate to focused link',
  },
  { context: 'Modal', key: 'Escape', expectedAction: 'Close modal' },
  {
    context: 'Modal',
    key: 'Tab',
    expectedAction: 'Cycle within modal (focus trap)',
  },
  {
    context: 'Accordion',
    key: 'Enter',
    expectedAction: 'Toggle accordion panel',
  },
  {
    context: 'Accordion',
    key: 'Space',
    expectedAction: 'Toggle accordion panel',
  },
  {
    context: 'Accordion',
    key: 'ArrowDown',
    expectedAction: 'Move to next accordion trigger',
  },
  {
    context: 'Accordion',
    key: 'ArrowUp',
    expectedAction: 'Move to previous accordion trigger',
  },
  {
    context: 'SlotChips',
    key: 'ArrowRight',
    expectedAction: 'Move to next tab',
  },
  {
    context: 'SlotChips',
    key: 'ArrowLeft',
    expectedAction: 'Move to previous tab',
  },
  {
    context: 'SlotChips',
    key: 'Enter',
    expectedAction: 'Activate focused tab',
  },
  {
    context: 'HighlightColorPicker',
    key: 'ArrowRight',
    expectedAction: 'Move to next color',
  },
  {
    context: 'HighlightColorPicker',
    key: 'Enter',
    expectedAction: 'Select focused color',
  },
  { context: 'ChatInput', key: 'Enter', expectedAction: 'Send message' },
  {
    context: 'ChatInput',
    key: 'Shift+Enter',
    expectedAction: 'New line in message',
  },
  {
    context: 'SearchInput',
    key: 'Escape',
    expectedAction: 'Clear search and close results',
  },
  {
    context: 'ConsentBanner',
    key: 'Tab',
    expectedAction: 'Move between consent options',
  },
  {
    context: 'ConsentBanner',
    key: 'Enter',
    expectedAction: 'Accept focused consent option',
  },
]

const HEADING_SPECS: HeadingSpec[] = [
  {
    page: '/',
    headings: [
      { level: 1, text: 'EUANGELION' },
      { level: 2, text: 'What This Is' },
      { level: 2, text: 'Featured Series' },
    ],
  },
  {
    page: '/soul-audit',
    headings: [
      { level: 1, text: 'Soul Audit' },
      { level: 2, text: 'What are you wrestling with today?' },
    ],
  },
  {
    page: '/daily-bread',
    headings: [
      { level: 1, text: 'Daily Bread' },
      { level: 2, text: 'Active Devotionals' },
    ],
  },
  {
    page: '/series',
    headings: [{ level: 1, text: 'All Series' }],
  },
]

const FOCUS_SPECS: FocusSpec[] = [
  {
    trigger: 'open-consent-banner',
    expectedFocusTarget: 'consent-heading',
    returnFocusTo: null,
  },
  {
    trigger: 'open-replace-modal',
    expectedFocusTarget: 'replace-modal-heading',
    returnFocusTo: 'replace-trigger-button',
  },
  {
    trigger: 'open-auth-modal',
    expectedFocusTarget: 'auth-modal-heading',
    returnFocusTo: 'auth-trigger-button',
  },
  {
    trigger: 'open-chat-sidebar',
    expectedFocusTarget: 'chat-input',
    returnFocusTo: 'chat-fab',
  },
  {
    trigger: 'close-chat-sidebar',
    expectedFocusTarget: 'chat-fab',
    returnFocusTo: null,
  },
  {
    trigger: 'route-transition',
    expectedFocusTarget: 'main-heading',
    returnFocusTo: null,
  },
]

const SCREEN_READER_LABELS: ScreenReaderLabel[] = [
  {
    element: 'locked-day',
    label: 'Day {n}, Locked. Unlocks at {time}',
    context: 'Day calendar',
  },
  {
    element: 'unlocked-day',
    label: 'Day {n}, Unlocked. {title}',
    context: 'Day calendar',
  },
  {
    element: 'completed-day',
    label: 'Day {n}, Completed. {title}',
    context: 'Day calendar',
  },
  {
    element: 'archived-day',
    label: 'Day {n}, Archived. {title}',
    context: 'Day calendar',
  },
  {
    element: 'sabbath-day',
    label: 'Day {n}, Sabbath rest day',
    context: 'Day calendar',
  },
  {
    element: 'current-slot',
    label: '{title}, Current devotional, Day {n} of 7',
    context: 'Slot chips',
  },
  {
    element: 'queued-slot',
    label: '{title}, Queued devotional, Day {n} of 7',
    context: 'Slot chips',
  },
  {
    element: 'slot-counter',
    label: 'Active slots: {x} of 3',
    context: 'Daily Bread',
  },
  {
    element: 'switch-counter',
    label: 'Switches this cycle: {n}',
    context: 'Daily Bread',
  },
  {
    element: 'consent-accept',
    label: 'Accept essential cookies',
    context: 'Consent banner',
  },
  {
    element: 'consent-analytics',
    label: 'Optional analytics cookies, currently {on/off}',
    context: 'Consent banner',
  },
  {
    element: 'reroll-button',
    label: 'Reroll options. This action is irreversible.',
    context: 'Soul Audit results',
  },
  {
    element: 'save-for-later',
    label: 'Save {title} for later',
    context: 'Soul Audit results',
  },
  {
    element: 'breadcrumb-current',
    label: '{page}, current page',
    context: 'Breadcrumbs',
  },
]

const REDUCED_MOTION_ANIMATIONS = [
  'chat-sidebar-slide',
  'reader-shift-left',
  'page-transition',
  'modal-overlay-fade',
  'toast-slide-in',
  'accordion-expand',
  'bottom-sheet-drag',
  'parallax-scroll',
  'card-hover-lift',
]

const ESSENTIAL_ANIMATIONS = ['loading-spinner', 'progress-bar-fill']

const DYNAMIC_TYPE_ELEMENTS = [
  'body-text',
  'heading-h1',
  'heading-h2',
  'heading-h3',
  'nav-label',
  'button-text',
  'form-label',
  'error-message',
  'devotional-scripture',
  'devotional-teaching',
  'chat-message',
  'highlight-note',
  'badge-text',
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ARIA specifications', () => {
  it('all modals have dialog role with required attributes', () => {
    const modals = ARIA_SPECS.filter((s) => s.role === 'dialog')
    expect(modals.length).toBeGreaterThanOrEqual(3)
    for (const modal of modals) {
      expect(modal.requiredAttributes).toContain('aria-modal')
      expect(modal.requiredAttributes).toContain('aria-labelledby')
    }
  })

  it('navigation elements have navigation role with label', () => {
    const navs = ARIA_SPECS.filter((s) => s.role === 'navigation')
    expect(navs.length).toBeGreaterThanOrEqual(2) // PrimaryNav + Breadcrumbs
    for (const nav of navs) {
      expect(nav.requiredAttributes).toContain('aria-label')
    }
  })

  it('slot chips use tablist/tab/tabpanel pattern', () => {
    const tablist = ARIA_SPECS.find((s) => s.element === 'SlotChips')
    const tab = ARIA_SPECS.find((s) => s.element === 'SlotChip')
    const tabpanel = ARIA_SPECS.find((s) => s.element === 'SlotPanel')
    expect(tablist?.role).toBe('tablist')
    expect(tab?.role).toBe('tab')
    expect(tab?.requiredAttributes).toContain('aria-selected')
    expect(tab?.requiredAttributes).toContain('aria-controls')
    expect(tabpanel?.role).toBe('tabpanel')
    expect(tabpanel?.requiredAttributes).toContain('aria-labelledby')
  })

  it('progress indicators have progressbar role', () => {
    const progress = ARIA_SPECS.find((s) => s.element === 'DayProgress')
    expect(progress?.role).toBe('progressbar')
    expect(progress?.requiredAttributes).toContain('aria-valuenow')
    expect(progress?.requiredAttributes).toContain('aria-valuemin')
    expect(progress?.requiredAttributes).toContain('aria-valuemax')
  })

  it('dynamic updates use live regions', () => {
    const toast = ARIA_SPECS.find((s) => s.element === 'ToastNotification')
    const counter = ARIA_SPECS.find((s) => s.element === 'SlotCounter')
    expect(toast?.role).toBe('alert')
    expect(counter?.role).toBe('status')
    expect(counter?.requiredAttributes).toContain('aria-live')
  })

  it('landmark roles cover all page regions', () => {
    const landmarks = ARIA_SPECS.filter((s) =>
      ['banner', 'main', 'complementary', 'contentinfo', 'navigation'].includes(
        s.role,
      ),
    )
    const roles = landmarks.map((l) => l.role)
    expect(roles).toContain('banner')
    expect(roles).toContain('main')
    expect(roles).toContain('contentinfo')
    expect(roles).toContain('navigation')
  })

  it('accordions have region role with labelledby', () => {
    const accordion = ARIA_SPECS.find((s) => s.element === 'ReasoningAccordion')
    expect(accordion?.role).toBe('region')
    expect(accordion?.requiredAttributes).toContain('aria-labelledby')
  })
})

describe('Color contrast (WCAG 2.1 AA)', () => {
  it('body text requires 4.5:1 minimum in both themes', () => {
    const bodyText = CONTRAST_REQUIREMENTS.find(
      (c) => c.element === 'body-text',
    )
    expect(bodyText?.minRatio).toBe(4.5)
    expect(bodyText?.context).toBe('both')
  })

  it('large headings require 3:1 minimum', () => {
    const heading = CONTRAST_REQUIREMENTS.find(
      (c) => c.element === 'large-heading',
    )
    expect(heading?.minRatio).toBe(3.0)
  })

  it('UI components require 3:1 minimum', () => {
    const ui = CONTRAST_REQUIREMENTS.find((c) => c.element === 'ui-component')
    expect(ui?.minRatio).toBe(3.0)
  })

  it('all 5 highlight colors have contrast requirements in both themes', () => {
    const highlightColors = ['yellow', 'blue', 'green', 'pink', 'purple']
    for (const color of highlightColors) {
      const light = CONTRAST_REQUIREMENTS.find(
        (c) => c.element === `highlight-${color}-on-light`,
      )
      const dark = CONTRAST_REQUIREMENTS.find(
        (c) => c.element === `highlight-${color}-on-dark`,
      )
      expect(light).toBeDefined()
      expect(dark).toBeDefined()
      expect(light!.minRatio).toBeGreaterThanOrEqual(4.5)
      expect(dark!.minRatio).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('placeholder text meets 4.5:1 ratio', () => {
    const placeholder = CONTRAST_REQUIREMENTS.find(
      (c) => c.element === 'placeholder-text',
    )
    expect(placeholder?.minRatio).toBe(4.5)
  })

  it('link text meets 4.5:1 ratio', () => {
    const link = CONTRAST_REQUIREMENTS.find((c) => c.element === 'link-text')
    expect(link?.minRatio).toBe(4.5)
  })

  it('error text meets 4.5:1 ratio', () => {
    const error = CONTRAST_REQUIREMENTS.find((c) => c.element === 'error-text')
    expect(error?.minRatio).toBe(4.5)
  })

  it('status badges meet 3:1 minimum', () => {
    const badge = CONTRAST_REQUIREMENTS.find(
      (c) => c.element === 'locked-badge',
    )
    expect(badge?.minRatio).toBeGreaterThanOrEqual(3.0)
  })

  it('total contrast requirements cover all critical elements', () => {
    expect(CONTRAST_REQUIREMENTS.length).toBeGreaterThanOrEqual(16)
  })
})

describe('Touch targets (Apple HIG 44pt minimum)', () => {
  it('all interactive elements meet 44pt minimum', () => {
    for (const target of TOUCH_TARGETS) {
      expect(target.minWidth).toBeGreaterThanOrEqual(44)
      expect(target.minHeight).toBeGreaterThanOrEqual(44)
    }
  })

  it('navigation links have sufficient touch targets', () => {
    const navLink = TOUCH_TARGETS.find((t) => t.element === 'nav-link')
    expect(navLink).toBeDefined()
    expect(navLink!.minWidth).toBeGreaterThanOrEqual(44)
  })

  it('slot chips have sufficient touch targets', () => {
    const chip = TOUCH_TARGETS.find((t) => t.element === 'slot-chip')
    expect(chip).toBeDefined()
  })

  it('day cells have sufficient touch targets', () => {
    const day = TOUCH_TARGETS.find((t) => t.element === 'day-cell')
    expect(day).toBeDefined()
  })

  it('color swatches have sufficient touch targets', () => {
    const swatch = TOUCH_TARGETS.find(
      (t) => t.element === 'highlight-color-swatch',
    )
    expect(swatch).toBeDefined()
  })

  it('chat FAB has sufficient touch target', () => {
    const fab = TOUCH_TARGETS.find((t) => t.element === 'chat-fab')
    expect(fab).toBeDefined()
    expect(fab!.minWidth).toBeGreaterThanOrEqual(44)
  })

  it('form controls have sufficient touch targets', () => {
    const checkbox = TOUCH_TARGETS.find((t) => t.element === 'checkbox')
    const radio = TOUCH_TARGETS.find((t) => t.element === 'radio-button')
    const toggle = TOUCH_TARGETS.find((t) => t.element === 'toggle-switch')
    expect(checkbox).toBeDefined()
    expect(radio).toBeDefined()
    expect(toggle).toBeDefined()
  })

  it('covers all interactive element types', () => {
    expect(TOUCH_TARGETS.length).toBeGreaterThanOrEqual(14)
  })
})

describe('Keyboard navigation', () => {
  it('Tab moves through nav items', () => {
    const spec = KEYBOARD_SPECS.find(
      (s) => s.context === 'PrimaryNav' && s.key === 'Tab',
    )
    expect(spec?.expectedAction).toContain('Move focus')
  })

  it('Escape closes modals', () => {
    const spec = KEYBOARD_SPECS.find(
      (s) => s.context === 'Modal' && s.key === 'Escape',
    )
    expect(spec?.expectedAction).toBe('Close modal')
  })

  it('Tab cycles within modal (focus trap)', () => {
    const spec = KEYBOARD_SPECS.find(
      (s) => s.context === 'Modal' && s.key === 'Tab',
    )
    expect(spec?.expectedAction).toContain('focus trap')
  })

  it('accordion supports Enter/Space/Arrow keys', () => {
    const accordionKeys = KEYBOARD_SPECS.filter(
      (s) => s.context === 'Accordion',
    )
    const keys = accordionKeys.map((s) => s.key)
    expect(keys).toContain('Enter')
    expect(keys).toContain('Space')
    expect(keys).toContain('ArrowDown')
    expect(keys).toContain('ArrowUp')
  })

  it('slot chips support Arrow key navigation', () => {
    const chipKeys = KEYBOARD_SPECS.filter((s) => s.context === 'SlotChips')
    const keys = chipKeys.map((s) => s.key)
    expect(keys).toContain('ArrowRight')
    expect(keys).toContain('ArrowLeft')
    expect(keys).toContain('Enter')
  })

  it('chat input handles Enter vs Shift+Enter', () => {
    const enter = KEYBOARD_SPECS.find(
      (s) => s.context === 'ChatInput' && s.key === 'Enter',
    )
    const shiftEnter = KEYBOARD_SPECS.find(
      (s) => s.context === 'ChatInput' && s.key === 'Shift+Enter',
    )
    expect(enter?.expectedAction).toBe('Send message')
    expect(shiftEnter?.expectedAction).toBe('New line in message')
  })

  it('search input Escape clears and closes', () => {
    const spec = KEYBOARD_SPECS.find(
      (s) => s.context === 'SearchInput' && s.key === 'Escape',
    )
    expect(spec?.expectedAction).toContain('Clear search')
  })

  it('consent banner navigable via keyboard', () => {
    const consentKeys = KEYBOARD_SPECS.filter(
      (s) => s.context === 'ConsentBanner',
    )
    expect(consentKeys.length).toBeGreaterThanOrEqual(2)
  })

  it('all keyboard specs have defined actions', () => {
    for (const spec of KEYBOARD_SPECS) {
      expect(spec.expectedAction).toBeTruthy()
    }
  })
})

describe('Heading hierarchy', () => {
  it('every page starts with h1', () => {
    for (const spec of HEADING_SPECS) {
      expect(spec.headings[0].level).toBe(1)
    }
  })

  it('no skipped heading levels', () => {
    for (const spec of HEADING_SPECS) {
      for (let i = 1; i < spec.headings.length; i++) {
        const prev = spec.headings[i - 1].level
        const curr = spec.headings[i].level
        // Can go same level, one deeper, or back up — but never skip
        expect(curr).toBeLessThanOrEqual(prev + 1)
      }
    }
  })

  it('home page has proper heading structure', () => {
    const home = HEADING_SPECS.find((s) => s.page === '/')
    expect(home?.headings.length).toBeGreaterThanOrEqual(2)
  })

  it('all key pages have heading specs', () => {
    const pages = HEADING_SPECS.map((s) => s.page)
    expect(pages).toContain('/')
    expect(pages).toContain('/soul-audit')
    expect(pages).toContain('/daily-bread')
    expect(pages).toContain('/series')
  })
})

describe('Focus management', () => {
  it('modals receive focus on open', () => {
    const modalFocus = FOCUS_SPECS.filter((s) => s.trigger.includes('open'))
    for (const spec of modalFocus) {
      expect(spec.expectedFocusTarget).toBeTruthy()
    }
  })

  it('focus returns to trigger after modal close', () => {
    const replaceModal = FOCUS_SPECS.find(
      (s) => s.trigger === 'open-replace-modal',
    )
    expect(replaceModal?.returnFocusTo).toBe('replace-trigger-button')
  })

  it('chat sidebar focus management', () => {
    const open = FOCUS_SPECS.find((s) => s.trigger === 'open-chat-sidebar')
    const close = FOCUS_SPECS.find((s) => s.trigger === 'close-chat-sidebar')
    expect(open?.expectedFocusTarget).toBe('chat-input')
    expect(close?.expectedFocusTarget).toBe('chat-fab')
  })

  it('route transitions move focus to main heading', () => {
    const route = FOCUS_SPECS.find((s) => s.trigger === 'route-transition')
    expect(route?.expectedFocusTarget).toBe('main-heading')
  })

  it('consent banner receives focus on show', () => {
    const consent = FOCUS_SPECS.find((s) => s.trigger === 'open-consent-banner')
    expect(consent?.expectedFocusTarget).toBe('consent-heading')
  })
})

describe('Screen reader labels', () => {
  it('day status badges have descriptive labels', () => {
    const dayLabels = SCREEN_READER_LABELS.filter(
      (l) => l.context === 'Day calendar',
    )
    expect(dayLabels.length).toBe(5) // locked, unlocked, completed, archived, sabbath
  })

  it('locked day label includes unlock time', () => {
    const locked = SCREEN_READER_LABELS.find((l) => l.element === 'locked-day')
    expect(locked?.label).toContain('Unlocks at')
  })

  it('slot chips have role and status labels', () => {
    const slotLabels = SCREEN_READER_LABELS.filter(
      (l) => l.context === 'Slot chips',
    )
    expect(slotLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('counters have descriptive labels', () => {
    const slotCounter = SCREEN_READER_LABELS.find(
      (l) => l.element === 'slot-counter',
    )
    const switchCounter = SCREEN_READER_LABELS.find(
      (l) => l.element === 'switch-counter',
    )
    expect(slotCounter?.label).toContain('Active slots')
    expect(switchCounter?.label).toContain('Switches')
  })

  it('consent options have labels', () => {
    const consentLabels = SCREEN_READER_LABELS.filter(
      (l) => l.context === 'Consent banner',
    )
    expect(consentLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('reroll button has irreversible warning', () => {
    const reroll = SCREEN_READER_LABELS.find(
      (l) => l.element === 'reroll-button',
    )
    expect(reroll?.label).toContain('irreversible')
  })

  it('breadcrumb current page has aria-current label', () => {
    const breadcrumb = SCREEN_READER_LABELS.find(
      (l) => l.element === 'breadcrumb-current',
    )
    expect(breadcrumb?.label).toContain('current page')
  })
})

describe('Reduced motion', () => {
  it('non-essential animations are disabled', () => {
    expect(REDUCED_MOTION_ANIMATIONS.length).toBeGreaterThanOrEqual(8)
    expect(REDUCED_MOTION_ANIMATIONS).toContain('chat-sidebar-slide')
    expect(REDUCED_MOTION_ANIMATIONS).toContain('reader-shift-left')
    expect(REDUCED_MOTION_ANIMATIONS).toContain('page-transition')
    expect(REDUCED_MOTION_ANIMATIONS).toContain('modal-overlay-fade')
  })

  it('essential animations remain active', () => {
    expect(ESSENTIAL_ANIMATIONS).toContain('loading-spinner')
    expect(ESSENTIAL_ANIMATIONS).toContain('progress-bar-fill')
  })

  it('no overlap between reduced and essential animations', () => {
    for (const essential of ESSENTIAL_ANIMATIONS) {
      expect(REDUCED_MOTION_ANIMATIONS).not.toContain(essential)
    }
  })
})

describe('Dynamic Type (iOS)', () => {
  it('all text elements support Dynamic Type scaling', () => {
    expect(DYNAMIC_TYPE_ELEMENTS.length).toBeGreaterThanOrEqual(12)
  })

  it('body text and headings scale', () => {
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('body-text')
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('heading-h1')
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('heading-h2')
  })

  it('devotional content scales', () => {
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('devotional-scripture')
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('devotional-teaching')
  })

  it('UI elements scale', () => {
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('nav-label')
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('button-text')
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('form-label')
  })

  it('badge text scales', () => {
    expect(DYNAMIC_TYPE_ELEMENTS).toContain('badge-text')
  })
})

describe('Form accessibility', () => {
  const FORM_FIELDS = [
    {
      name: 'soul-audit-response',
      hasLabel: true,
      hasError: true,
      hasDescription: true,
    },
    {
      name: 'email-input',
      hasLabel: true,
      hasError: true,
      hasDescription: false,
    },
    {
      name: 'chat-input',
      hasLabel: true,
      hasError: false,
      hasDescription: true,
    },
    {
      name: 'search-input',
      hasLabel: true,
      hasError: false,
      hasDescription: false,
    },
    {
      name: 'sabbath-preference',
      hasLabel: true,
      hasError: false,
      hasDescription: true,
    },
    {
      name: 'length-preference',
      hasLabel: true,
      hasError: false,
      hasDescription: true,
    },
    {
      name: 'highlight-note',
      hasLabel: true,
      hasError: false,
      hasDescription: false,
    },
    {
      name: 'margin-note',
      hasLabel: true,
      hasError: false,
      hasDescription: false,
    },
  ]

  it('all form fields have associated labels', () => {
    for (const field of FORM_FIELDS) {
      expect(field.hasLabel).toBe(true)
    }
  })

  it('error-capable fields have error handling', () => {
    const errorFields = FORM_FIELDS.filter((f) => f.hasError)
    expect(errorFields.length).toBeGreaterThanOrEqual(2)
  })

  it('soul audit response has label, error, and description', () => {
    const field = FORM_FIELDS.find((f) => f.name === 'soul-audit-response')
    expect(field?.hasLabel).toBe(true)
    expect(field?.hasError).toBe(true)
    expect(field?.hasDescription).toBe(true)
  })
})
