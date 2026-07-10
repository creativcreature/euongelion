import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoulAuditResultsPage from '@/app/soul-audit/results/page'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/stores/soulAuditStore', () => ({
  useSoulAuditStore: () => ({ lastInput: 'I need clarity.', auditCount: 1 }),
}))

vi.mock('@/components/Breadcrumbs', () => ({
  default: () => <nav aria-label="Breadcrumbs">Breadcrumbs</nav>,
}))

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <header>Header</header>,
}))

vi.mock('@/components/SiteFooter', () => ({
  default: () => <footer>Footer</footer>,
}))

vi.mock('@/components/motion/FadeIn', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const submitPayload: SoulAuditSubmitResponseV2 = {
  version: 'v2',
  auditRunId: 'run_test',
  runToken: 'token_test',
  remainingAudits: 2,
  requiresEssentialConsent: true,
  analyticsOptInDefault: false,
  consentAccepted: false,
  crisis: {
    required: false,
    acknowledged: false,
    resources: [],
    prompt: '',
  },
  options: [
    {
      id: 'ai-option-1',
      kind: 'ai_primary',
      rank: 1,
      slug: 'path-alpha',
      title: 'Path Alpha',
      question: 'How do I move forward this week?',
      confidence: 0.92,
      reasoning: 'Based on your input, this path is a strong fit.',
      preview: {
        verse: 'Psalm 46:10',
        verseText: 'Be still, and know that I am God.',
        paragraph: 'Stillness can help you hear what to do next.',
      },
    },
  ],
  policy: {
    noAccountRequired: true,
    maxAuditsPerCycle: 3,
    directionCount: 3,
  },
}

describe('Soul Audit results selection consent UX', () => {
  beforeEach(() => {
    pushMock.mockReset()
    replaceMock.mockReset()
    const storageStore: Record<string, string> = {}
    const makeMockStorage = () => ({
      getItem: (key: string) => storageStore[key] ?? null,
      setItem: (key: string, value: string) => {
        storageStore[key] = String(value)
      },
      removeItem: (key: string) => {
        delete storageStore[key]
      },
      clear: () => {
        Object.keys(storageStore).forEach((key) => {
          delete storageStore[key]
        })
      },
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: makeMockStorage(),
    })
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: makeMockStorage(),
    })
    window.sessionStorage.setItem(
      'soul-audit-submit-v2',
      JSON.stringify(submitPayload),
    )
    document.cookie =
      'euangelion_site_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not gate option selection on site-cookie state and proceeds to devotional routing', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/soul-audit/select') {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            auditRunId: 'run_test',
            selectionType: 'ai_primary',
            // /select routes AI plans to the canonical /daily-bread reader
            // (the dedicated /soul-audit/plan reader is retired).
            route: '/daily-bread',
            planToken: 'plan-token-1',
            planDays: [],
          }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SoulAuditResultsPage />)

    await user.click(
      screen.getByRole('button', {
        name: /Build this reading path: Path Alpha/i,
      }),
    )

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/daily-bread')
    })

    // No cookie-consent error should appear
    expect(
      screen.queryByText(
        /Cookie consent required\. Use the cookie notice at the bottom to continue\./i,
      ),
    ).toBeNull()

    // Consent is inline — select is called directly (no separate consent API call)
    const calledRoutes = fetchMock.mock.calls.map(([url]) => String(url))
    expect(calledRoutes).toContain('/api/soul-audit/select')
    expect(calledRoutes).not.toContain('/api/soul-audit/consent')
  })
})

const makeOption = (
  index: number,
  name: string,
): SoulAuditSubmitResponseV2['options'][number] => ({
  id: `ai-option-${index}`,
  kind: 'ai_primary',
  rank: index,
  slug: `path-${name.toLowerCase()}`,
  title: `Path ${name}`,
  question: `Question for path ${name}?`,
  confidence: 0.9,
  reasoning: `Reasoning for path ${name}.`,
  preview: {
    verse: `Psalm ${index}:1`,
    verseText: `Verse text for path ${name}.`,
    paragraph: `Teaching excerpt for path ${name}.`,
  },
})

const threeOptionPayload: SoulAuditSubmitResponseV2 = {
  ...submitPayload,
  options: [
    makeOption(1, 'Alpha'),
    makeOption(2, 'Beta'),
    makeOption(3, 'Gamma'),
  ],
  diagnostics: {
    retrievalStrategy: 'contextual-hybrid-bm25-rrf',
    optionEvidence: [
      {
        optionId: 'ai-option-1',
        scriptureAnchor: 'Psalm 1:1',
        matchedKeywords: ['clarity', 'direction', 'trust'],
        sourceHints: [],
      },
      {
        optionId: 'ai-option-2',
        scriptureAnchor: 'Psalm 2:1',
        matchedKeywords: ['rest'],
        sourceHints: [],
      },
      {
        optionId: 'ai-option-3',
        scriptureAnchor: 'Psalm 3:1',
        matchedKeywords: ['hope'],
        sourceHints: [],
      },
    ],
  },
}

describe('Soul Audit results guided reveal', () => {
  beforeEach(() => {
    window.sessionStorage.setItem(
      'soul-audit-submit-v2',
      JSON.stringify(threeOptionPayload),
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('starts with only the recommended path and reveals alternatives one per tap', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    )

    render(<SoulAuditResultsPage />)

    // First paint: ONLY the recommended card, with its reasoning expanded.
    expect(screen.getByText('RECOMMENDED')).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /Build this reading path: Path Alpha/i,
      }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: /Build this reading path: Path Beta/i,
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: /Build this reading path: Path Gamma/i,
      }),
    ).toBeNull()
    expect(screen.getByText('Reasoning for path Alpha.')).toBeTruthy()

    // Text-first card content: matched-keyword chips + real plan length.
    expect(screen.getByText('clarity')).toBeTruthy()
    expect(screen.getByText('direction')).toBeTruthy()
    expect(screen.getAllByText('7 DAYS')).toHaveLength(1)

    // Tap 1: first alternative appears.
    await user.click(
      screen.getByRole('button', { name: /Explore another direction/i }),
    )
    expect(
      screen.getByRole('button', {
        name: /Build this reading path: Path Beta/i,
      }),
    ).toBeTruthy()
    expect(screen.getByText('ALTERNATIVE')).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: /Build this reading path: Path Gamma/i,
      }),
    ).toBeNull()

    // Tap 2: second alternative appears and the reveal button retires.
    await user.click(
      screen.getByRole('button', { name: /Explore another direction/i }),
    )
    expect(
      screen.getByRole('button', {
        name: /Build this reading path: Path Gamma/i,
      }),
    ).toBeTruthy()
    expect(screen.getByText('ANOTHER DIRECTION')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Explore another direction/i }),
    ).toBeNull()
  })
})
