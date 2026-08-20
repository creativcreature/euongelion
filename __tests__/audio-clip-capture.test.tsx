/**
 * SA-058/SA-061 — clip this moment.
 *
 * Founder-approved 2026-08-16. A listener currently has no way to mark anything
 * without stopping, finding the passage in the text, and selecting it. This is
 * the audio half of "maybe it even works with the highlight somehow": the
 * transport drops a mark at the current timestamp, and it lands in the same
 * Notes list as everything else the reader writes.
 *
 * The chapter LABEL is captured alongside the time on purpose — a Library row
 * reading "Word study — 2:20" is something a person can act on; a bare number
 * is something they have to decode.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { __resetSessionProbe } from '@/components/reader/ReaderContext'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/data/audio-manifest.json', () => ({
  default: {
    'clip-day-1': {
      src: '/audio/clip-day-1.m4a',
      duration: 600,
      words: 1500,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 4000000,
      chapters: [
        { t: 0, label: 'Opening', module: 0 },
        { t: 120, label: 'Word study', module: 2 },
      ],
    },
  },
}))

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  __resetSessionProbe()
  useAuthStore.setState({ userId: 'signed-in', email: null, initialized: true })
  fetchMock = vi.fn((input: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          String(input).startsWith('/api/auth/session')
            ? { authenticated: true, user: { id: 'u1' } }
            : { ok: true, annotation: { id: 'c1' }, annotations: [] },
        ),
    } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderPlayer = () =>
  render(
    <>
      <GlobalAudioHost />
      <AudioPlayer title="Clip Day" segments={[]} slug="clip-day-1" />
    </>,
  )

const setTime = (container: HTMLElement, seconds: number) => {
  const audio = container.querySelector('audio') as HTMLAudioElement
  act(() => {
    Object.defineProperty(audio, 'currentTime', {
      value: seconds,
      configurable: true,
    })
    audio.dispatchEvent(new Event('timeupdate'))
  })
}

const clipWrites = () =>
  fetchMock.mock.calls.filter(([url, init]) => {
    if (!String(url).startsWith('/api/annotations')) return false
    return (init as RequestInit | undefined)?.method === 'POST'
  })

describe('audio clips', () => {
  it('offers a clip control on a track with chapters', () => {
    renderPlayer()
    expect(
      screen.getByRole('button', { name: /clip this moment/i }),
    ).toBeTruthy()
  })

  it('captures the timestamp and the chapter it fell in', async () => {
    const { container } = renderPlayer()
    setTime(container, 140)

    fireEvent.click(screen.getByRole('button', { name: /clip this moment/i }))
    fireEvent.click(screen.getByRole('button', { name: /save clip/i }))

    await vi.waitFor(() => expect(clipWrites()).toHaveLength(1))
    const body = JSON.parse((clipWrites()[0][1] as RequestInit).body as string)
    expect(body.annotationType).toBe('note')
    expect(body.style.kind).toBe('clip')
    expect(body.style.t).toBe(140)
    // 140s falls inside "Word study", which starts at 120.
    expect(body.style.chapter).toBe('Word study')
    expect(body.devotionalSlug).toBe('clip-day-1')
  })

  it('carries the reader’s own words when they write some', async () => {
    const { container } = renderPlayer()
    setTime(container, 30)

    fireEvent.click(screen.getByRole('button', { name: /clip this moment/i }))
    fireEvent.change(screen.getByLabelText(/note on this moment/i), {
      target: { value: 'This is the line.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save clip/i }))

    await vi.waitFor(() => expect(clipWrites()).toHaveLength(1))
    const body = JSON.parse((clipWrites()[0][1] as RequestInit).body as string)
    expect(body.body).toBe('This is the line.')
    expect(body.style.chapter).toBe('Opening')
  })

  it('can be dismissed without writing anything', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: /clip this moment/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(clipWrites()).toHaveLength(0)
    expect(screen.queryByLabelText(/note on this moment/i)).toBeNull()
  })
})
