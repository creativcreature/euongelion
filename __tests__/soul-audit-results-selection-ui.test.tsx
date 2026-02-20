import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoulAuditResultsPage from '@/app/soul-audit/results/page'
import { SITE_CONSENT_REQUIRED_EVENT } from '@/lib/site-consent'
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
  useSoulAuditStore: () => ({ lastInput: 'I need clarity.' }),
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
    window.sessionStorage.removeItem('soul-audit-submit-v2')
    window.sessionStorage.removeItem('soul-audit-selection-v2')
    window.sessionStorage.removeItem('soul-audit-last-input')
    window.sessionStorage.removeItem('soul-audit-reroll-used')
    window.sessionStorage.setItem(
      'soul-audit-submit-v2',
      JSON.stringify(submitPayload),
    )
    window.sessionStorage.removeItem('soul-audit-selection-v2')
    document.cookie =
      'euangelion_site_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows inline consent-required error, dispatches event, and avoids selection API call', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<SoulAuditResultsPage />)

    await user.click(screen.getByRole('button', { name: /Path Alpha/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /Cookie consent required\. Use the cookie notice at the bottom to continue\./i,
        ),
      ).toBeInTheDocument()
    })

    expect(container.querySelector('.soul-audit-selection-error')).toBeTruthy()
    expect(
      dispatchSpy.mock.calls.some(
        ([event]) => (event as Event).type === SITE_CONSENT_REQUIRED_EVENT,
      ),
    ).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
