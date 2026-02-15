/**
 * Help, FAQ, and Onboarding Tutorial Test Suite (Phase 16)
 *
 * Covers PLAN-V3 Phase 16:
 * - Dedicated Help hub with searchable FAQ and categorized guidance
 * - Homepage Q+A section linked into Help hub
 * - First-devotional guided walkthrough (step overlays)
 * - Walkthrough skippable and replayable from Help/Settings
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FAQEntry {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  sortOrder: number
}

type FAQCategory =
  | 'getting-started'
  | 'soul-audit'
  | 'daily-bread'
  | 'account'
  | 'privacy'
  | 'content'
  | 'technical'

interface HelpHub {
  categories: FAQCategory[]
  entries: FAQEntry[]
  searchEnabled: boolean
  contactLink: string
}

interface WalkthroughStep {
  id: string
  stepNumber: number
  targetSelector: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  hasOverlay: boolean
}

interface WalkthroughState {
  userId: string
  completed: boolean
  skipped: boolean
  currentStep: number
  totalSteps: number
  replayable: boolean
  triggeredOn: string
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const FAQ_CATEGORIES: FAQCategory[] = [
  'getting-started',
  'soul-audit',
  'daily-bread',
  'account',
  'privacy',
  'content',
  'technical',
]

const HELP_HUB: HelpHub = {
  categories: FAQ_CATEGORIES,
  entries: [
    {
      id: 'faq-1',
      question: 'What is Euangelion?',
      answer: 'A devotional app for spiritual formation.',
      category: 'getting-started',
      tags: ['intro', 'about'],
      sortOrder: 1,
    },
    {
      id: 'faq-2',
      question: 'How does the Soul Audit work?',
      answer: 'Answer three questions to find your starting series.',
      category: 'soul-audit',
      tags: ['audit', 'start'],
      sortOrder: 1,
    },
    {
      id: 'faq-3',
      question: 'What is Daily Bread?',
      answer: 'Your active devotional reading area.',
      category: 'daily-bread',
      tags: ['reading', 'devotional'],
      sortOrder: 1,
    },
    {
      id: 'faq-4',
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Account > Delete Account.',
      category: 'account',
      tags: ['delete', 'account'],
      sortOrder: 1,
    },
    {
      id: 'faq-5',
      question: 'What data do you collect?',
      answer: 'See our Privacy Policy for full details.',
      category: 'privacy',
      tags: ['data', 'privacy'],
      sortOrder: 1,
    },
    {
      id: 'faq-6',
      question: 'Who writes the devotionals?',
      answer: 'Content is authored and curated by the Euangelion team.',
      category: 'content',
      tags: ['author', 'writing'],
      sortOrder: 1,
    },
    {
      id: 'faq-7',
      question: 'The app is not loading. What should I do?',
      answer: 'Try clearing your cache or reloading.',
      category: 'technical',
      tags: ['bug', 'loading'],
      sortOrder: 1,
    },
    {
      id: 'faq-8',
      question: 'Can I do multiple series at once?',
      answer: 'Yes, you can have up to 3 active series.',
      category: 'daily-bread',
      tags: ['slots', 'series'],
      sortOrder: 2,
    },
    {
      id: 'faq-9',
      question: 'How do I change my email?',
      answer: 'Go to Settings > Account to update your email.',
      category: 'account',
      tags: ['email', 'settings'],
      sortOrder: 2,
    },
    {
      id: 'faq-10',
      question: "What if the Soul Audit results don't feel right?",
      answer: 'You can reroll once with a typed confirmation.',
      category: 'soul-audit',
      tags: ['reroll', 'results'],
      sortOrder: 2,
    },
  ],
  searchEnabled: true,
  contactLink: '/settings#contact',
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    targetSelector: '[data-walkthrough="soul-audit"]',
    title: 'Start Here',
    description: 'Take the Soul Audit to find your starting path.',
    position: 'bottom',
    hasOverlay: true,
  },
  {
    id: 'step-2',
    stepNumber: 2,
    targetSelector: '[data-walkthrough="daily-bread"]',
    title: 'Your Daily Bread',
    description: 'This is where your active devotionals live.',
    position: 'bottom',
    hasOverlay: true,
  },
  {
    id: 'step-3',
    stepNumber: 3,
    targetSelector: '[data-walkthrough="reader"]',
    title: 'Read & Reflect',
    description: 'Scripture, teaching, vocabulary, and prayer in each day.',
    position: 'top',
    hasOverlay: true,
  },
  {
    id: 'step-4',
    stepNumber: 4,
    targetSelector: '[data-walkthrough="saves"]',
    title: 'Save & Highlight',
    description: 'Bookmark, highlight, and annotate what speaks to you.',
    position: 'left',
    hasOverlay: true,
  },
  {
    id: 'step-5',
    stepNumber: 5,
    targetSelector: '[data-walkthrough="chat"]',
    title: 'Ask Questions',
    description: 'Use the chat to explore passages deeper.',
    position: 'left',
    hasOverlay: true,
  },
]

function createWalkthroughState(userId: string): WalkthroughState {
  return {
    userId,
    completed: false,
    skipped: false,
    currentStep: 0,
    totalSteps: WALKTHROUGH_STEPS.length,
    replayable: true,
    triggeredOn: 'first_devotional_open',
  }
}

function advanceStep(state: WalkthroughState): WalkthroughState {
  if (state.completed || state.skipped) return state
  const nextStep = state.currentStep + 1
  if (nextStep >= state.totalSteps) {
    return { ...state, currentStep: nextStep, completed: true }
  }
  return { ...state, currentStep: nextStep }
}

function skipWalkthrough(state: WalkthroughState): WalkthroughState {
  return { ...state, skipped: true }
}

function replayWalkthrough(state: WalkthroughState): WalkthroughState {
  return { ...state, completed: false, skipped: false, currentStep: 0 }
}

function searchFAQ(hub: HelpHub, query: string): FAQEntry[] {
  const q = query.toLowerCase()
  return hub.entries.filter(
    (e) =>
      e.question.toLowerCase().includes(q) ||
      e.answer.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  )
}

function filterFAQByCategory(hub: HelpHub, category: FAQCategory): FAQEntry[] {
  return hub.entries
    .filter((e) => e.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function shouldShowWalkthrough(
  state: WalkthroughState,
  isFirstDevotionalOpen: boolean,
): boolean {
  return isFirstDevotionalOpen && !state.completed && !state.skipped
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Help hub structure', () => {
  it('has 7 FAQ categories', () => {
    expect(FAQ_CATEGORIES).toHaveLength(7)
  })

  it('categories cover all product areas', () => {
    expect(FAQ_CATEGORIES).toContain('getting-started')
    expect(FAQ_CATEGORIES).toContain('soul-audit')
    expect(FAQ_CATEGORIES).toContain('daily-bread')
    expect(FAQ_CATEGORIES).toContain('account')
    expect(FAQ_CATEGORIES).toContain('privacy')
    expect(FAQ_CATEGORIES).toContain('content')
    expect(FAQ_CATEGORIES).toContain('technical')
  })

  it('has search enabled', () => {
    expect(HELP_HUB.searchEnabled).toBe(true)
  })

  it('has contact link', () => {
    expect(HELP_HUB.contactLink).toBeTruthy()
  })

  it('all entries have required fields', () => {
    for (const entry of HELP_HUB.entries) {
      expect(entry.id).toBeTruthy()
      expect(entry.question.length).toBeGreaterThan(0)
      expect(entry.answer.length).toBeGreaterThan(0)
      expect(FAQ_CATEGORIES).toContain(entry.category)
      expect(entry.tags.length).toBeGreaterThan(0)
    }
  })

  it('every category has at least one FAQ entry', () => {
    for (const category of FAQ_CATEGORIES) {
      const entries = filterFAQByCategory(HELP_HUB, category)
      expect(entries.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('FAQ search', () => {
  it('searches by question text', () => {
    const results = searchFAQ(HELP_HUB, 'Soul Audit')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.question.includes('Soul Audit'))).toBe(true)
  })

  it('searches by answer text', () => {
    const results = searchFAQ(HELP_HUB, 'spiritual formation')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('searches by tags', () => {
    const results = searchFAQ(HELP_HUB, 'reroll')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('search is case-insensitive', () => {
    const results = searchFAQ(HELP_HUB, 'DEVOTIONAL')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('no results for non-existent query', () => {
    const results = searchFAQ(HELP_HUB, 'xyznonexistent123')
    expect(results).toHaveLength(0)
  })
})

describe('FAQ category filtering', () => {
  it('filters by getting-started', () => {
    const results = filterFAQByCategory(HELP_HUB, 'getting-started')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.every((e) => e.category === 'getting-started')).toBe(true)
  })

  it('filters by soul-audit', () => {
    const results = filterFAQByCategory(HELP_HUB, 'soul-audit')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('results are sorted by sortOrder', () => {
    const results = filterFAQByCategory(HELP_HUB, 'daily-bread')
    for (let i = 1; i < results.length; i++) {
      expect(results[i].sortOrder).toBeGreaterThanOrEqual(
        results[i - 1].sortOrder,
      )
    }
  })
})

describe('Walkthrough steps', () => {
  it('has 5 walkthrough steps', () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(5)
  })

  it('steps are in sequential order', () => {
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      expect(WALKTHROUGH_STEPS[i].stepNumber).toBe(i + 1)
    }
  })

  it('all steps have overlay', () => {
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.hasOverlay).toBe(true)
    }
  })

  it('all steps have target selectors', () => {
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.targetSelector).toMatch(/\[data-walkthrough=/)
    }
  })

  it('all steps have title and description', () => {
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.description.length).toBeGreaterThan(0)
    }
  })

  it('steps cover key product areas', () => {
    const titles = WALKTHROUGH_STEPS.map((s) => s.title.toLowerCase())
    const allTitles = titles.join(' ')
    expect(allTitles).toContain('start')
    expect(allTitles).toContain('bread')
    expect(allTitles).toContain('read')
  })
})

describe('Walkthrough state management', () => {
  let state: WalkthroughState

  beforeEach(() => {
    state = createWalkthroughState('user-1')
  })

  it('starts at step 0 (not started)', () => {
    expect(state.currentStep).toBe(0)
    expect(state.completed).toBe(false)
    expect(state.skipped).toBe(false)
  })

  it('triggers on first devotional open', () => {
    expect(state.triggeredOn).toBe('first_devotional_open')
  })

  it('is replayable', () => {
    expect(state.replayable).toBe(true)
  })

  it('advances through steps', () => {
    state = advanceStep(state)
    expect(state.currentStep).toBe(1)
    state = advanceStep(state)
    expect(state.currentStep).toBe(2)
  })

  it('completes after all steps', () => {
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      state = advanceStep(state)
    }
    expect(state.completed).toBe(true)
  })

  it('does not advance past completion', () => {
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      state = advanceStep(state)
    }
    const stateAfterComplete = advanceStep(state)
    expect(stateAfterComplete.currentStep).toBe(state.currentStep)
  })

  it('can be skipped', () => {
    state = advanceStep(state) // partially through
    state = skipWalkthrough(state)
    expect(state.skipped).toBe(true)
  })

  it('does not advance after skip', () => {
    state = skipWalkthrough(state)
    const afterSkip = advanceStep(state)
    expect(afterSkip.currentStep).toBe(state.currentStep)
  })

  it('can be replayed from settings', () => {
    // Complete the walkthrough
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      state = advanceStep(state)
    }
    expect(state.completed).toBe(true)
    // Replay
    state = replayWalkthrough(state)
    expect(state.completed).toBe(false)
    expect(state.skipped).toBe(false)
    expect(state.currentStep).toBe(0)
  })

  it('can be replayed after skip', () => {
    state = skipWalkthrough(state)
    state = replayWalkthrough(state)
    expect(state.skipped).toBe(false)
    expect(state.currentStep).toBe(0)
  })
})

describe('Walkthrough trigger conditions', () => {
  it('shows on first devotional open when not completed', () => {
    const state = createWalkthroughState('user-1')
    expect(shouldShowWalkthrough(state, true)).toBe(true)
  })

  it('does not show if not first devotional open', () => {
    const state = createWalkthroughState('user-1')
    expect(shouldShowWalkthrough(state, false)).toBe(false)
  })

  it('does not show if already completed', () => {
    let state = createWalkthroughState('user-1')
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      state = advanceStep(state)
    }
    expect(shouldShowWalkthrough(state, true)).toBe(false)
  })

  it('does not show if skipped', () => {
    let state = createWalkthroughState('user-1')
    state = skipWalkthrough(state)
    expect(shouldShowWalkthrough(state, true)).toBe(false)
  })
})
