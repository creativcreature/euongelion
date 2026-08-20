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
 *  - the play control sits in the centre cell so only the flanks compress at
 *    375px, which is what stops it wrapping;
 *  - the scrubber is still a real <input type="range">.
 *
 * AMENDED BY OPTION A (SA-120). The founder found this panel and the audio
 * sidebar "basically redundant" and chose to make the sidebar the player: the
 * panel is now ONE ROW — play/pause, progress, time — plus clipping, which
 * exists nowhere else. Speed, skip, chapters and the sleep timer moved to the
 * sidebar, and the tests that pinned them here moved with them, to
 * audio-drawer.test.tsx. What SA-058 settled and this file still guards is the
 * type: a caption rather than a system label, and one meta line in one element.
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
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'

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
  render(
    <>
      <GlobalAudioHost />
      <AudioPlayer title="Laid Out" segments={[]} slug="laid-out-day-1" />
    </>,
  )

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

  it('carries time left, set size and progress on ONE meta element', () => {
    renderPlayer()
    // Since F-131: "10:00 left · 1 of 3 · 0% complete". The whole line is one
    // element — the property under test — and it now leads with the remainder
    // rather than pairing elapsed against total.
    const meta = within(panel()).getByText(/10:00 left · 1 of 3 · 0% complete/)
    expect(meta).toBeTruthy()
  })

  it('keeps the remaining-time value queryable without ambiguity', () => {
    renderPlayer()
    // Would throw "found multiple elements" if the value were wrapped in its
    // own span inside the meta line.
    expect(screen.getByText(/10:00 left/)).toBeTruthy()
  })

  it('leaves play alone in the centre cell', () => {
    const { container } = renderPlayer()
    const transport = container.querySelector('.narration-transport')
    expect(transport).not.toBeNull()
    const labels = [...transport!.querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-label'),
    )
    // Was five controls until option A. Skipping and chapter-stepping are the
    // sidebar's now; what a reader needs from the page is whether it is
    // playing.
    expect(labels).toEqual(['Play'])
  })

  it('keeps only what the sidebar cannot do on the right', () => {
    // Clipping attaches a note to THIS reading at THIS timestamp — an act of
    // reading, not a player control, so it stays. Beside it is the way
    // through: "anything more opens the sidebar".
    const { container } = renderPlayer()
    expect(container.querySelector('.narration-cell-left')).toBeNull()
    const right = container.querySelector('.narration-cell-right')
    expect(
      [...right!.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['Clip this moment', 'More listening controls'])
  })

  it('still exposes the scrubber as a real range input', () => {
    const { container } = renderPlayer()
    const slider = screen.getByRole('slider', { name: /seek/i })
    // A div with role=slider would satisfy getByRole; only an input gives
    // keyboard stepping for free.
    expect(slider.tagName).toBe('INPUT')
    expect(container.querySelectorAll('.narration-ticks i')).toHaveLength(3)
  })

  it('still reads the remembered speed, even with no control to set it', () => {
    // The panel no longer offers the speed control, but it is still what
    // applies the remembered rate to the element when a reading loads. Were
    // this to stop reading the preference, a reader who chose 1.5x in the
    // sidebar would be dropped back to 1x by the next devotional they opened.
    localStorage.setItem('euangelion:narration-speed', '2')
    const { container } = renderPlayer()
    const audio = container.querySelector('audio') as HTMLAudioElement
    fireEvent(audio, new Event('loadedmetadata'))
    expect(audio.playbackRate).toBe(2)
  })
})
