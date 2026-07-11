/**
 * F-065 — anonymous first-run introduction (FirstRunIntro).
 *
 * Contract under test:
 *  - Shows ONLY for an anonymous, genuinely-first visit (auth probed via
 *    /api/auth/session; prior-use localStorage signals mean "returning").
 *  - Never shows to authenticated users (and marks itself done).
 *  - Never shows again after dismissal (Skip / Maybe later / Escape).
 *  - An offer ignored in a PREVIOUS session counts as a quiet dismissal;
 *    a reload in the SAME session re-offers.
 *  - Personalization writes the REAL stores: theme via useUIStore.setTheme
 *    (canonical localStorage 'theme' + html.dark), text size via
 *    settingsStore.textScale.
 *  - The fork routes to /soul-audit and /series; the account offer is one
 *    quiet sign-in line, not a gate.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FirstRunIntro from '@/components/FirstRunIntro'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'

const FIRST_RUN_KEY = 'euangelion:first-run-intro'
const FIRST_RUN_SESSION_KEY = 'euangelion:first-run-intro-session'

function mockSessionProbe(authenticated: boolean) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ authenticated, user: null }),
    } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockSessionProbeFailure() {
  const fetchMock = vi.fn(() => Promise.reject(new Error('network down')))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderAndFindDialog() {
  render(<FirstRunIntro />)
  return await screen.findByRole('dialog')
}

/** The intro resolves eligibility asynchronously — give it a beat, then
 *  assert it stayed silent. */
async function expectStaysSilent() {
  render(<FirstRunIntro />)
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  expect(screen.queryByRole('dialog')).toBeNull()
}

beforeEach(() => {
  // Reset the stores FIRST — setState on the persisted settings store
  // writes 'euangelion-settings' to localStorage, which the component
  // rightly reads as a prior-use signal. Clearing storage afterwards
  // restores a genuine first-visit environment.
  useUIStore.setState({ theme: 'dark' })
  useSettingsStore.setState({ textScale: 'default' })
  window.localStorage.clear()
  window.sessionStorage.clear()
  document.documentElement.classList.add('dark')
  document.body.style.overflow = ''
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FirstRunIntro eligibility', () => {
  it('shows for an anonymous first-time visitor and records the offer', async () => {
    mockSessionProbe(false)
    const dialog = await renderAndFindDialog()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      screen.getByText('A daily newspaper of the Gospel.'),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('offered')
    expect(window.sessionStorage.getItem(FIRST_RUN_SESSION_KEY)).toBe('1')
  })

  it('never shows to an authenticated user — and marks itself done', async () => {
    const fetchMock = mockSessionProbe(true)
    await expectStaysSilent()

    expect(fetchMock).toHaveBeenCalled()
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
  })

  it('never shows once marked done — without even probing auth', async () => {
    const fetchMock = mockSessionProbe(false)
    window.localStorage.setItem(FIRST_RUN_KEY, 'done')
    await expectStaysSilent()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an offer ignored in a previous session as a quiet dismissal', async () => {
    const fetchMock = mockSessionProbe(false)
    // 'offered' persisted, but no same-session marker → previous session.
    window.localStorage.setItem(FIRST_RUN_KEY, 'offered')
    await expectStaysSilent()

    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('re-offers on a reload within the SAME session', async () => {
    mockSessionProbe(false)
    window.localStorage.setItem(FIRST_RUN_KEY, 'offered')
    window.sessionStorage.setItem(FIRST_RUN_SESSION_KEY, '1')

    expect(await renderAndFindDialog()).toBeInTheDocument()
  })

  it('treats prior-use localStorage signals as a returning visitor', async () => {
    const fetchMock = mockSessionProbe(false)
    // A persisted settings store proves this browser used Euangelion
    // before the first-run feature shipped.
    window.localStorage.setItem('euangelion-settings', '{"state":{}}')
    await expectStaysSilent()

    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays silent without burning the flag when the auth probe fails', async () => {
    mockSessionProbeFailure()
    await expectStaysSilent()

    // No decision recorded — the intro may offer next pageview.
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBeNull()
  })
})

describe('FirstRunIntro dismissal', () => {
  it('Skip dismisses, persists done, and never shows on a fresh mount', async () => {
    mockSessionProbe(false)
    const first = render(<FirstRunIntro />)
    await screen.findByRole('dialog')

    act(() => {
      screen.getByRole('button', { name: 'Skip' }).click()
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')

    first.unmount()
    await expectStaysSilent()
  })

  it('Escape dismisses and persists done', async () => {
    mockSessionProbe(false)
    await renderAndFindDialog()

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
  })

  it('"Maybe later" on the final beat dismisses and persists done', async () => {
    mockSessionProbe(false)
    await renderAndFindDialog()

    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })

    act(() => {
      screen.getByRole('button', { name: 'Maybe later' }).click()
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
  })

  it('restores body scroll after dismissal', async () => {
    mockSessionProbe(false)
    await renderAndFindDialog()
    expect(document.body.style.overflow).toBe('hidden')

    act(() => {
      screen.getByRole('button', { name: 'Skip' }).click()
    })
    expect(document.body.style.overflow).toBe('')
  })
})

describe('FirstRunIntro personalization writes the real stores', () => {
  async function goToComfortBeat() {
    await renderAndFindDialog()
    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })
  }

  it('theme tap drives useUIStore.setTheme → canonical localStorage + html.dark', async () => {
    mockSessionProbe(false)
    await goToComfortBeat()

    act(() => {
      screen.getByRole('button', { name: 'Light' }).click()
    })

    expect(useUIStore.getState().theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    act(() => {
      screen.getByRole('button', { name: 'Dark' }).click()
    })
    expect(useUIStore.getState().theme).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('text-size tap drives settingsStore.textScale', async () => {
    mockSessionProbe(false)
    await goToComfortBeat()

    act(() => {
      screen.getByRole('button', { name: 'Large' }).click()
    })
    expect(useSettingsStore.getState().textScale).toBe('large')

    act(() => {
      screen.getByRole('button', { name: 'Extra Large' }).click()
    })
    expect(useSettingsStore.getState().textScale).toBe('xlarge')
  })
})

describe('FirstRunIntro fork', () => {
  it('offers Soul Audit (primary), the library, and one quiet sign-in line', async () => {
    mockSessionProbe(false)
    await renderAndFindDialog()

    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })

    expect(
      screen.getByRole('link', { name: 'START WITH THE SOUL AUDIT' }),
    ).toHaveAttribute('href', '/soul-audit')
    expect(
      screen.getByRole('link', { name: 'BROWSE THE LIBRARY' }),
    ).toHaveAttribute('href', '/series')
    // The account offer is one quiet line — a link, never a wall.
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    )
    expect(
      screen.getByRole('button', { name: 'Maybe later' }),
    ).toBeInTheDocument()
  })

  it('choosing a fork records completion so the intro never returns', async () => {
    mockSessionProbe(false)
    await renderAndFindDialog()

    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'Continue' }).click()
    })

    // jsdom cannot navigate; clicking still runs the onClick bookkeeping.
    act(() => {
      screen.getByRole('link', { name: 'START WITH THE SOUL AUDIT' }).click()
    })

    await waitFor(() => {
      expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe('done')
    })
  })
})
