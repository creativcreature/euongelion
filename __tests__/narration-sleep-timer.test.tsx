/**
 * SA-058 — a sleep timer that fades instead of cutting.
 *
 * Not in the founder's list by name; it falls under "the player features need
 * to be better thought out and more robust", and it is the one Audible control
 * this product has the strongest claim to. A devotional is read at night more
 * often than an audiobook is, and a hard stop mid-sentence is the opposite of
 * what the feature is for.
 *
 * End-of-chapter earns its place beside the fixed durations because a
 * devotional has real sections — the reader can finish the thought rather than
 * being cut off at an arbitrary minute.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SleepTimer from '@/components/audio/SleepTimer'

afterEach(cleanup)

function renderTimer(
  overrides: Partial<Parameters<typeof SleepTimer>[0]> = {},
) {
  const props = {
    active: null,
    remainingMs: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<SleepTimer {...props} />)
  return props
}

describe('sleep timer', () => {
  it('offers end of chapter alongside the fixed durations', () => {
    renderTimer()
    expect(screen.getByRole('button', { name: /end of chapter/i })).toBeTruthy()
    for (const minutes of [5, 10, 15, 30]) {
      expect(
        screen.getByRole('button', {
          name: new RegExp(`^${minutes} minutes$`, 'i'),
        }),
      ).toBeTruthy()
    }
  })

  it('reports the chosen duration in minutes', () => {
    const { onSelect } = renderTimer()
    fireEvent.click(screen.getByRole('button', { name: /^15 minutes$/i }))
    expect(onSelect).toHaveBeenCalledWith(15)
  })

  it('reports end of chapter as its own mode', () => {
    const { onSelect } = renderTimer()
    fireEvent.click(screen.getByRole('button', { name: /end of chapter/i }))
    expect(onSelect).toHaveBeenCalledWith('end-of-chapter')
  })

  it('can be turned off once set', () => {
    const { onSelect } = renderTimer({ active: 15, remainingMs: 60_000 })
    fireEvent.click(screen.getByRole('button', { name: /^off$/i }))
    expect(onSelect).toHaveBeenCalledWith('off')
  })

  it('shows the time remaining while a timer runs', () => {
    renderTimer({ active: 15, remainingMs: 8 * 60_000 + 5_000 })
    // The reader needs to know how long is left without doing arithmetic on a
    // start time they never saw.
    expect(screen.getByRole('status').textContent).toMatch(/8:05/)
  })

  it('marks the active choice', () => {
    renderTimer({ active: 30, remainingMs: 120_000 })
    expect(
      screen
        .getByRole('button', { name: /^30 minutes$/i })
        .getAttribute('aria-current'),
    ).toBe('true')
  })

  it('offers no Off button when nothing is running', () => {
    renderTimer()
    expect(screen.queryByRole('button', { name: /^off$/i })).toBeNull()
  })
})
