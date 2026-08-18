import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ReaderThemeControl from '@/components/ReaderThemeControl'
import { useSettingsStore } from '@/stores/settingsStore'

// F-067 — in-reader "Aa" sheet: curated named reading themes (Ink /
// Parchment / Vellum / Night) + text-size stepper. The sheet persists to the
// existing settings store, applies `data-reading-theme` on the closest
// `.mock-home` reader root for the reader-scoped themes, and keeps the site
// base theme (html.dark + localStorage 'theme') aligned with the pick.

function renderControl() {
  return render(
    <div className="mock-home" data-testid="reader-root">
      <ReaderThemeControl />
    </div>,
  )
}

function openSheet(user: ReturnType<typeof userEvent.setup>) {
  return user.click(
    screen.getByRole('button', { name: /reading theme and text size/i }),
  )
}

describe('ReaderThemeControl (F-067 — named reading themes)', () => {
  beforeEach(() => {
    // Real jsdom localStorage (zustand's persist middleware holds the global
    // binding, so a window.localStorage mock would miss its writes) — just
    // start each test from a clean slate.
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    useSettingsStore.setState({ readingTheme: null, textScale: 'default' })
  })

  afterEach(() => {
    cleanup()
    document.documentElement.classList.remove('dark')
  })

  it('renders a quiet Aa trigger and no sheet until opened', () => {
    renderControl()
    const trigger = screen.getByRole('button', {
      name: /reading theme and text size/i,
    })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the sheet with all four named themes and the size stepper', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)

    const dialog = screen.getByRole('dialog', {
      name: /reading theme and text size/i,
    })
    expect(dialog).toBeInTheDocument()
    for (const name of ['Ink', 'Parchment', 'Vellum', 'Night']) {
      // Anchored: an option's accessible name starts with its theme name
      // (the hint text follows — e.g. Parchment's hint contains "ink").
      expect(
        screen.getByRole('button', { name: new RegExp(`^${name}`, 'i') }),
      ).toBeInTheDocument()
    }
    expect(
      screen.getByRole('button', { name: /increase text size/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /decrease text size/i }),
    ).toBeInTheDocument()
  })

  it('moves focus into the sheet on open, and back to the trigger on Escape', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)

    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /reading theme and text size/i }),
    ).toHaveFocus()
  })

  it('closes on backdrop click', async () => {
    const user = userEvent.setup()
    const { container } = renderControl()
    await openSheet(user)
    const backdrop = container.querySelector('.reader-theme-backdrop')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('highlights the site-theme alias when no explicit theme is stored', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)
    // Light base + no stored choice → Parchment reads as current.
    expect(screen.getByRole('button', { name: /parchment/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /vellum/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('Vellum: persists, applies data-reading-theme, and sits on the light base', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)
    await user.click(screen.getByRole('button', { name: /vellum/i }))

    expect(useSettingsStore.getState().readingTheme).toBe('vellum')
    expect(screen.getByTestId('reader-root')).toHaveAttribute(
      'data-reading-theme',
      'vellum',
    )
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('theme')).toBe('light')

    const persisted = JSON.parse(
      window.localStorage.getItem('euangelion-settings') ?? '{}',
    ) as { state?: { readingTheme?: string } }
    expect(persisted.state?.readingTheme).toBe('vellum')
  })

  it('Night: persists, applies data-reading-theme, and sits on the dark base', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)
    await user.click(screen.getByRole('button', { name: /night/i }))

    expect(useSettingsStore.getState().readingTheme).toBe('night')
    expect(screen.getByTestId('reader-root')).toHaveAttribute(
      'data-reading-theme',
      'night',
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })

  it('Ink: clears the reader-scoped attribute and flips the site theme dark', async () => {
    const user = userEvent.setup()
    useSettingsStore.setState({ readingTheme: 'vellum' })
    renderControl()
    // Effect applies the stored vellum override on mount.
    expect(screen.getByTestId('reader-root')).toHaveAttribute(
      'data-reading-theme',
      'vellum',
    )

    await openSheet(user)
    await user.click(screen.getByRole('button', { name: /^ink/i }))

    expect(useSettingsStore.getState().readingTheme).toBe('ink')
    expect(screen.getByTestId('reader-root')).not.toHaveAttribute(
      'data-reading-theme',
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })

  it('text-size stepper walks default → large → xlarge, clamps, and persists', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)

    const increase = screen.getByRole('button', { name: /increase text size/i })
    const decrease = screen.getByRole('button', { name: /decrease text size/i })

    // Scoped to the TEXT SIZE group: since F-130 the sheet also carries LINE
    // SPACING and LINE WIDTH steppers, and all three read "Standard" at their
    // defaults, so a bare getByText is ambiguous by design rather than by bug.
    const sizeGroup = screen.getByRole('group', { name: /text size/i })

    expect(decrease).toBeDisabled()
    expect(within(sizeGroup).getByText('Standard')).toBeInTheDocument()

    await user.click(increase)
    expect(useSettingsStore.getState().textScale).toBe('large')
    expect(screen.getByText('Large')).toBeInTheDocument()

    await user.click(increase)
    expect(useSettingsStore.getState().textScale).toBe('xlarge')
    expect(screen.getByText('Extra Large')).toBeInTheDocument()
    expect(increase).toBeDisabled()

    await user.click(decrease)
    expect(useSettingsStore.getState().textScale).toBe('large')

    const persisted = JSON.parse(
      window.localStorage.getItem('euangelion-settings') ?? '{}',
    ) as { state?: { textScale?: string } }
    expect(persisted.state?.textScale).toBe('large')
  })

  it('traps Tab focus inside the sheet while open', async () => {
    const user = userEvent.setup()
    renderControl()
    await openSheet(user)

    const dialog = screen.getByRole('dialog')
    // Tab far more times than there are focusable controls — focus must
    // still be inside the dialog (wrapping, never escaping to the page).
    for (let i = 0; i < 12; i += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('removes the reader-scoped attribute on unmount (leaving the reader is clean)', () => {
    useSettingsStore.setState({ readingTheme: 'night' })
    const { unmount } = renderControl()
    const root = screen.getByTestId('reader-root')
    expect(root).toHaveAttribute('data-reading-theme', 'night')
    unmount()
    expect(root).not.toHaveAttribute('data-reading-theme')
  })
})
