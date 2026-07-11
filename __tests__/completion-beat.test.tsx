/**
 * F-066 (SA-025) — completion beat, surface A.
 *
 * The quiet end-of-session moment: renders nothing until a completion
 * event arrives, shows one benediction line (once per completion),
 * dismisses on tap-anywhere / Escape, auto-dismisses, and honors
 * reduced motion. Brand-voice contract on the lines themselves: no
 * exclamation marks, no digits, no streak language.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CompletionBeat from '@/components/CompletionBeat'
import {
  BENEDICTION_LINES,
  COMPLETION_BEAT_EVENT,
  benedictionForDate,
  signalCompletionBeat,
} from '@/lib/completion-beat'

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') && reducedMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('benediction lines (brand voice)', () => {
  it('every line is quiet: no exclamation, no digits, no streak framing', () => {
    expect(BENEDICTION_LINES.length).toBeGreaterThanOrEqual(5)
    for (const line of BENEDICTION_LINES) {
      expect(line, `"${line}" shouts`).not.toMatch(/!/)
      expect(line, `"${line}" contains a count`).not.toMatch(/\d/)
      expect(line.toLowerCase(), `"${line}" gamifies`).not.toMatch(
        /streak|in a row|record|score|level|badge/,
      )
    }
  })

  it('rotates by day, deterministically', () => {
    const a = benedictionForDate(new Date(2026, 6, 10))
    const b = benedictionForDate(new Date(2026, 6, 10, 23, 59))
    expect(a).toBe(b)
    expect(BENEDICTION_LINES).toContain(a)
    // Consecutive days walk the set.
    const next = benedictionForDate(new Date(2026, 6, 11))
    expect(BENEDICTION_LINES).toContain(next)
    expect(next).not.toBe(a)
  })
})

describe('CompletionBeat', () => {
  beforeEach(() => {
    stubMatchMedia(false)
    document.documentElement.classList.remove('reduce-motion')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders nothing until a completion event arrives', () => {
    render(<CompletionBeat />)
    expect(screen.queryByTestId('completion-beat')).toBeNull()
  })

  it('shows once on progressUpdated — one benediction from the set, with the prop scripture reference', () => {
    render(<CompletionBeat scriptureReference="Psalm 46:10" />)

    act(() => {
      window.dispatchEvent(
        new CustomEvent('progressUpdated', { detail: { slug: 'x-day-1' } }),
      )
    })

    const beat = screen.getByTestId('completion-beat')
    expect(BENEDICTION_LINES).toContain(benedictionForDate())
    expect(beat.textContent).toContain(benedictionForDate())
    expect(beat.textContent).toContain('Psalm 46:10')
    // Quiet, not a wall: a polite status region, no dialog semantics.
    expect(beat.getAttribute('role')).toBe('status')
    expect(beat.getAttribute('aria-live')).toBe('polite')
  })

  it('prefers the scripture reference carried by the completion event', () => {
    render(<CompletionBeat scriptureReference="Psalm 46:10" />)
    act(() => {
      signalCompletionBeat({ scriptureReference: 'John 1:5' })
    })
    expect(screen.getByTestId('completion-beat').textContent).toContain(
      'John 1:5',
    )
  })

  it('shows exactly once per completion — repeat events do not stack or duplicate', () => {
    render(<CompletionBeat />)
    act(() => {
      window.dispatchEvent(new CustomEvent('progressUpdated'))
      window.dispatchEvent(new CustomEvent(COMPLETION_BEAT_EVENT))
      window.dispatchEvent(new CustomEvent('progressUpdated'))
    })
    expect(screen.getAllByTestId('completion-beat')).toHaveLength(1)
  })

  it('dismisses on a tap anywhere on the page', () => {
    render(<CompletionBeat />)
    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat')).toBeTruthy()

    fireEvent.click(document.body)
    expect(screen.queryByTestId('completion-beat')).toBeNull()
  })

  it('dismisses on Escape', () => {
    render(<CompletionBeat />)
    act(() => {
      signalCompletionBeat()
    })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('completion-beat')).toBeNull()
  })

  it('auto-dismisses after the quiet interval, and can show again on the next completion', () => {
    vi.useFakeTimers()
    render(<CompletionBeat />)

    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(12_000)
    })
    expect(screen.queryByTestId('completion-beat')).toBeNull()

    // The next completion (e.g. the following day) gets its own beat.
    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat')).toBeTruthy()
  })

  it('animates entrance by default, and skips it under prefers-reduced-motion', () => {
    render(<CompletionBeat />)
    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat').className).toContain(
      'completion-beat-enter',
    )
    fireEvent.click(document.body)

    stubMatchMedia(true)
    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat').className).not.toContain(
      'completion-beat-enter',
    )
  })

  it('skips the entrance under the in-app reduce-motion toggle (html.reduce-motion)', () => {
    document.documentElement.classList.add('reduce-motion')
    render(<CompletionBeat />)
    act(() => {
      signalCompletionBeat()
    })
    expect(screen.getByTestId('completion-beat').className).not.toContain(
      'completion-beat-enter',
    )
    document.documentElement.classList.remove('reduce-motion')
  })

  it('never renders counts or streak language', () => {
    render(<CompletionBeat scriptureReference="Genesis 32:26" />)
    act(() => {
      signalCompletionBeat()
    })
    const text = screen.getByTestId('completion-beat').textContent ?? ''
    expect(text).not.toMatch(/\d+ days?/i)
    expect(text.toLowerCase()).not.toMatch(/streak|in a row/)
    expect(text).not.toMatch(/!/)
  })
})
