/**
 * SA-058 — the transport layout the founder chose.
 *
 * Five directions were mocked against real players found on Mobbin and put to
 * the founder on 2026-08-16. The choice was "C, with B's restraint in the
 * type": the layout Spotify Audiobooks and The Atlantic arrived at
 * independently — captioned rail above, play control dead centre, speed and
 * sleep retreating to opposite corners — with Waking Up's typographic
 * restraint, so the chapter reads as a caption rather than a control panel.
 *
 * What is pinned here is the part that is easy to undo by accident:
 *
 *  - the chapter is a CAPTION, not an uppercase system label;
 *  - one meta line, one element (nested spans made the elapsed/total pair
 *    match twice — ambiguous for a test and for a live region);
 *  - the transport sits in the centre cell so only the flanks compress at
 *    375px, which is what stops it wrapping;
 *  - the scrubber is still a real <input type="range">.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'

vi.mock('@/data/audio-manifest.json', () => ({
  default: {
    'laid-out-day-1': {
      src: '/audio/laid-out-day-1.m4a',
      duration: 600,
      words: 1500,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 4000000,
      chapters: [
        { t: 0, label: 'Opening', module: 0 },
        { t: 60, label: 'Scripture', module: 1 },
        { t: 240, label: 'Word study', module: 2 },
      ],
    },
  },
}))

beforeEach(() => {
  localStorage.clear()
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})

afterEach(cleanup)

const renderPlayer = () =>
  render(<AudioPlayer title="Laid Out" segments={[]} slug="laid-out-day-1" />)

const panel = () => screen.getByLabelText('Audio edition')

describe('the chosen transport layout', () => {
  it('names the section as a caption, not an uppercase label', () => {
    renderPlayer()
    // Before play the caption still identifies the panel rather than sitting
    // empty — a track without chapters has to say what it is.
    expect(within(panel()).getByText(/Opening|Audio edition/)).toBeTruthy()
    // The old uppercase system label is gone.
    expect(within(panel()).queryByText('AUDIO EDITION')).toBeNull()
  })

  it('carries position, set size and time left on ONE meta element', () => {
    renderPlayer()
    // 0:00 / 10:00 · chapter 1 of 3 · 1:00 left in it.
    const meta = within(panel()).getByText(/0:00 \/ 10:00 · 1 of 3 · 1:00 left/)
    expect(meta).toBeTruthy()
  })

  it('keeps the elapsed/total pair queryable without ambiguity', () => {
    renderPlayer()
    // Would throw "found multiple elements" if the pair were wrapped in its
    // own span inside the meta line.
    expect(screen.getByText(/0:00 \/ 10:00/)).toBeTruthy()
  })

  it('puts the five transport controls together in the centre cell', () => {
    const { container } = renderPlayer()
    const transport = container.querySelector('.narration-transport')
    expect(transport).not.toBeNull()
    const labels = [...transport!.querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(labels).toEqual([
      'Previous chapter',
      'Back 15 seconds',
      'Play',
      'Forward 15 seconds',
      'Next chapter',
    ])
  })

  it('keeps speed alone on the left and the utilities on the right', () => {
    // Clip LEADS the right cell rather than splitting the pair: sleep and
    // chapters were adjacent in the mock the founder approved, and a new
    // control should not reorder what was signed off.
    const { container } = renderPlayer()
    const left = container.querySelector('.narration-cell-left')
    const right = container.querySelector('.narration-cell-right')
    expect(
      [...left!.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['Playback speed, currently 1×'])
    expect(
      [...right!.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['Clip this moment', 'Sleep timer', 'Chapters — 3 sections'])
  })

  it('opens the speed sheet, which reaches 2×', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: /playback speed/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: '2×' })).toBeTruthy()
  })

  it('opens the sleep timer', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Sleep timer' }))
    expect(screen.getByRole('button', { name: /end of chapter/i })).toBeTruthy()
  })

  it('still exposes the scrubber as a real range input', () => {
    const { container } = renderPlayer()
    const slider = screen.getByRole('slider', { name: /seek/i })
    // A div with role=slider would satisfy getByRole; only an input gives
    // keyboard stepping for free.
    expect(slider.tagName).toBe('INPUT')
    expect(container.querySelectorAll('.narration-ticks i')).toHaveLength(3)
  })

  it('remembers the chosen speed across mounts', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: /playback speed/i }))
    fireEvent.click(screen.getByRole('button', { name: '2×' }))
    cleanup()

    renderPlayer()
    expect(
      screen.getByRole('button', { name: 'Playback speed, currently 2×' }),
    ).toBeTruthy()
  })
})
