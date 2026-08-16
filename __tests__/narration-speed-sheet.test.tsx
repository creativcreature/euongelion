/**
 * SA-058 — a speed sheet, not a cycle.
 *
 * Founder, 2026-08-16: "I also want people to be able tot listen at 2x speed
 * etc." The old control cycled 0.8 → 1 → 1.25 → 1.5 and stopped, so 2× did not
 * exist at all, and because it cycled, reaching any value cost up to four taps.
 *
 * The sheet also carries the skip interval. 15s stays the default rather than
 * Audible's 30s — this prose is dense and many readings run under five minutes
 * — but 30 is one tap away for anyone who disagrees.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SpeedSheet from '@/components/audio/SpeedSheet'

afterEach(cleanup)

function renderSheet(
  overrides: Partial<Parameters<typeof SpeedSheet>[0]> = {},
) {
  const props = {
    speed: 1,
    skipSeconds: 15 as 15 | 30,
    onSelectSpeed: vi.fn(),
    onSelectSkip: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<SpeedSheet {...props} />)
  return props
}

describe('speed sheet', () => {
  it('offers 2x, which the old cycle never reached', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: '2×' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '3×' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '0.75×' })).toBeTruthy()
  })

  it('reports the chosen speed directly, not a cycle step', () => {
    const { onSelectSpeed } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: '2×' }))
    expect(onSelectSpeed).toHaveBeenCalledWith(2)
  })

  it('marks the active speed for assistive tech', () => {
    renderSheet({ speed: 1.5 })
    expect(
      screen.getByRole('button', { name: '1.5×' }).getAttribute('aria-current'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: '2×' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('carries the skip interval, defaulting to 15 not Audible’s 30', () => {
    const { onSelectSkip } = renderSheet()
    expect(
      screen
        .getByRole('button', { name: /15 seconds/i })
        .getAttribute('aria-current'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /30 seconds/i }))
    expect(onSelectSkip).toHaveBeenCalledWith(30)
  })

  it('closes on Escape', () => {
    const { onClose } = renderSheet()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('is a modal dialog and locks the page behind it', () => {
    renderSheet()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    // Same idiom as NarrationChapters — a second modal pattern in one
    // transport would be a bug in itself.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores page scroll when it unmounts', () => {
    renderSheet()
    cleanup()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
