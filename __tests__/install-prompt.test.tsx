/**
 * F-072 — PWA install prompt after a good session.
 *
 * Contract under test:
 *  - Renders NOTHING on first paint, even with a stashed beforeinstallprompt
 *    event (the invitation only ever follows a value moment).
 *  - A stale `euangelion:just-finished-reading` = '1' from a previous visit
 *    does NOT count as this session's value moment.
 *  - Appears after a value-moment signal (`progressUpdated`) when the
 *    install event is stashed; preventDefault was called on the event.
 *  - "Not now" persists a 60-day dismissal — no re-show on a fresh mount.
 *  - A dismissal older than 60 days no longer suppresses the invitation.
 *  - display-mode: standalone → never renders.
 *  - iOS Safari (no beforeinstallprompt) → same card with Share → Add to
 *    Home Screen instructions and no install button.
 *  - Accepting the native prompt hides the card and persists installed state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import InstallPrompt from '@/components/InstallPrompt'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

const DISMISSED_AT_KEY = 'euangelion:install-prompt-dismissed-at'
const INSTALLED_KEY = 'euangelion:pwa-installed'
const FINISHED_READING_KEY = 'euangelion:just-finished-reading'

const ORIGINAL_USER_AGENT = window.navigator.userAgent

type StashableInstallEvent = Event & {
  prompt: ReturnType<typeof vi.fn>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function createInstallEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
): StashableInstallEvent {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as StashableInstallEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome, platform: 'web' })
  return event
}

function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: ua,
  })
}

function stashInstallEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
): StashableInstallEvent {
  const event = createInstallEvent(outcome)
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

function fireValueMoment() {
  act(() => {
    window.dispatchEvent(new CustomEvent('progressUpdated'))
  })
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  mockMatchMedia(false)
  setUserAgent(ORIGINAL_USER_AGENT)
})

afterEach(() => {
  cleanup()
  setUserAgent(ORIGINAL_USER_AGENT)
})

describe('InstallPrompt', () => {
  it('renders nothing on first paint, even with a stashed install event', () => {
    render(<InstallPrompt beatWindowMs={0} />)
    const event = stashInstallEvent()

    expect(screen.queryByRole('dialog')).toBeNull()
    // The event was captured: preventDefault stops the browser mini-infobar.
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores a stale finished-reading signal from a previous visit', () => {
    window.localStorage.setItem(FINISHED_READING_KEY, '1')
    render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('appears after a value moment when the install event is stashed', async () => {
    render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()
    fireValueMoment()

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(screen.getByText('Keep it close')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Add Euangelion to your home screen — one quiet word each morning.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add to home screen' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument()
  })

  it('appears when the value moment lands before the install event', async () => {
    render(<InstallPrompt beatWindowMs={0} />)
    fireValueMoment()
    expect(screen.queryByRole('dialog')).toBeNull()

    stashInstallEvent()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('"Not now" dismisses, persists, and suppresses re-show on a fresh mount', async () => {
    const first = render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()
    fireValueMoment()
    await screen.findByRole('dialog')

    act(() => {
      screen.getByRole('button', { name: 'Not now' }).click()
    })
    expect(screen.queryByRole('dialog')).toBeNull()

    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY))
    expect(Number.isFinite(dismissedAt)).toBe(true)
    expect(Math.abs(Date.now() - dismissedAt)).toBeLessThan(5_000)

    // Fresh mount inside the 60-day window: stays silent even with both
    // trigger conditions met again.
    first.unmount()
    render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()
    fireValueMoment()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('invites again once a dismissal is older than the 60-day window', async () => {
    const sixtyOneDaysMs = 61 * 24 * 60 * 60 * 1000
    window.localStorage.setItem(
      DISMISSED_AT_KEY,
      String(Date.now() - sixtyOneDaysMs),
    )

    render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()
    fireValueMoment()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('never renders in standalone display mode', () => {
    mockMatchMedia(true)

    render(<InstallPrompt beatWindowMs={0} />)
    stashInstallEvent()
    fireValueMoment()

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows Share instructions on iOS Safari where no install event exists', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 ' +
        'Mobile/15E148 Safari/604.1',
    )

    render(<InstallPrompt beatWindowMs={0} />)
    fireValueMoment()

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByText('In Safari: Share → Add to Home Screen.'),
    ).toBeInTheDocument()
    // No programmatic install path on iOS — only the quiet dismissal.
    expect(
      screen.queryByRole('button', { name: 'Add to home screen' }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument()
  })

  it('stays silent on browsers with neither path (no event, not iOS Safari)', () => {
    render(<InstallPrompt beatWindowMs={0} />)
    fireValueMoment()

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls prompt() on accept, hides, and persists installed state', async () => {
    render(<InstallPrompt beatWindowMs={0} />)
    const event = stashInstallEvent('accepted')
    fireValueMoment()
    await screen.findByRole('dialog')

    act(() => {
      screen.getByRole('button', { name: 'Add to home screen' }).click()
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(INSTALLED_KEY)).toBe('1')
    // Accepting is not a dismissal — no 60-day window recorded.
    expect(window.localStorage.getItem(DISMISSED_AT_KEY)).toBeNull()
  })

  it('treats declining the native sheet as a respected dismissal', async () => {
    render(<InstallPrompt beatWindowMs={0} />)
    const event = stashInstallEvent('dismissed')
    fireValueMoment()
    await screen.findByRole('dialog')

    act(() => {
      screen.getByRole('button', { name: 'Add to home screen' }).click()
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(INSTALLED_KEY)).toBeNull()
    expect(window.localStorage.getItem(DISMISSED_AT_KEY)).not.toBeNull()
  })
})

describe('InstallPrompt completion-beat sequencing (SA-025)', () => {
  it('holds the invitation back for the beat window after the value moment', async () => {
    render(<InstallPrompt beatWindowMs={120} />)
    stashInstallEvent()
    fireValueMoment()
    // Immediately after the value moment the card must NOT be visible —
    // the completion beat owns this moment.
    expect(screen.queryByRole('dialog')).toBeNull()
    // After the window passes, the invitation may appear.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
