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

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      sabbathDay: 'sunday',
      textScale: 'default',
      setSabbathDay: () => {},
      setTextScale: () => {},
    }),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ theme: 'dark', setTheme: () => {} }),
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

vi.mock('@/components/TextHighlightTrigger', () => ({
  default: () => null,
}))

vi.mock('@/components/DevotionalStickiesLayer', () => ({
  default: () => null,
}))

vi.mock('@/components/ScrollProgress', () => ({
  default: () => null,
}))

vi.mock('@/components/ReaderTimeline', () => ({
  default: () => null,
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
    optionSplit: {
      aiPrimary: 3,
      curatedPrefab: 2,
      total: 5,
    },
  },
}

describe('Soul Audit results selection consent UX', () => {
  beforeEach(() => {
    pushMock.mockReset()
    replaceMock.mockReset()
    const localStorageStore: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: (key: string) => localStorageStore[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore[key] = String(value)
        },
        removeItem: (key: string) => {
          delete localStorageStore[key]
        },
        clear: () => {
          Object.keys(localStorageStore).forEach((key) => {
            delete localStorageStore[key]
          })
        },
      },
    })
    window.localStorage.removeItem('soul-audit-submit-v2')
    window.localStorage.removeItem('soul-audit-selection-v2')
    window.localStorage.removeItem('soul-audit-last-input')
    window.localStorage.removeItem('soul-audit-reroll-used')
    window.localStorage.setItem(
      'soul-audit-submit-v2',
      JSON.stringify(submitPayload),
    )
    window.localStorage.removeItem('soul-audit-selection-v2')
    window.localStorage.setItem('soul-audit-guest-signup-gate-v1', 'seen')
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
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          auditRunId: 'run_test',
          essentialAccepted: true,
          analyticsOptIn: false,
          crisisAcknowledged: false,
          consentToken: 'consent-token-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          auditRunId: 'run_test',
          selectionType: 'ai_primary',
          route: '/soul-audit/results?planToken=plan-token-1&day=1',
          planToken: 'plan-token-1',
          planDays: [],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<SoulAuditResultsPage />)

    await user.click(screen.getByRole('button', { name: /Path Alpha/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        '/soul-audit/results?planToken=plan-token-1&day=1',
      )
    })

    expect(
      screen.queryByText(
        /Cookie consent required\. Use the cookie notice at the bottom to continue\./i,
      ),
    ).toBeNull()
    const calledRoutes = fetchMock.mock.calls.map(([url]) => String(url))
    expect(calledRoutes).toContain('/api/soul-audit/consent')
    expect(calledRoutes).toContain('/api/soul-audit/select')
  })
})
