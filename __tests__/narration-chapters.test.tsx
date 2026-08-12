import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import { chapterAt, type NarrationChapter } from '@/lib/audio/tracks'

/**
 * Audio chapters.
 *
 * Chapters exist so a listener can jump to a section the way Audible does.
 * Two contracts matter beyond "it renders":
 *
 *  - the sheet is opened deliberately, never printed on the page. SA-034 had
 *    the section scrubber removed precisely because an unavoidable list of
 *    sections spoiled the headings before the first line.
 *  - the section being read is marked in the page via `data-narrating` on the
 *    matching `#devotional-section-N`, which is written only when the reading
 *    crosses into a new section — not on every clock tick.
 */

const CHAPTERS: NarrationChapter[] = [
  { t: 0, label: 'Opening', module: 0 },
  { t: 7.4, label: 'Scripture', module: 1 },
  { t: 66.2, label: 'What God Says When He Says His Own Name', module: 3 },
  { t: 206.1, label: 'The Saying He Did Not Write', module: 9 },
]

vi.mock('@/data/audio-manifest.json', () => ({
  default: {
    'has-track-day-1': {
      src: '/audio/has-track-day-1.m4a',
      duration: 1299.9,
      words: 3501,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 8001959,
      chapters: [
        { t: 0, label: 'Opening', module: 0 },
        { t: 7.4, label: 'Scripture', module: 1 },
        {
          t: 66.2,
          label: 'What God Says When He Says His Own Name',
          module: 3,
        },
        { t: 206.1, label: 'The Saying He Did Not Write', module: 9 },
      ],
    },
    'no-chapters-day-1': {
      src: '/audio/no-chapters-day-1.m4a',
      duration: 300,
      words: 800,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 1000,
    },
  },
}))

const SEGMENTS = [{ id: 'seg-0', label: 'Title', text: 'The Fruit of Lies.' }]

let observerCallback: ((e: { isIntersecting: boolean }[]) => void) | null = null

beforeEach(() => {
  localStorage.clear()
  observerCallback = null
  window.IntersectionObserver = class {
    constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
      observerCallback = cb
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
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

afterEach(cleanup)

const renderPlayer = (slug = 'has-track-day-1') =>
  render(
    <AudioPlayer title="The Fruit of Lies" segments={SEGMENTS} slug={slug} />,
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

describe('chapterAt', () => {
  it('returns the chapter containing a moment', () => {
    expect(chapterAt(CHAPTERS, 0)?.label).toBe('Opening')
    expect(chapterAt(CHAPTERS, 7.4)?.label).toBe('Scripture')
    expect(chapterAt(CHAPTERS, 100)?.label).toBe(
      'What God Says When He Says His Own Name',
    )
    expect(chapterAt(CHAPTERS, 9999)?.label).toBe('The Saying He Did Not Write')
  })

  it('is inclusive of a chapter boundary, so seeking to a mark lands in it', () => {
    expect(chapterAt(CHAPTERS, 206.1)?.label).toBe(
      'The Saying He Did Not Write',
    )
  })

  it('handles missing or empty chapter lists', () => {
    expect(chapterAt(undefined, 10)).toBeNull()
    expect(chapterAt([], 10)).toBeNull()
  })
})

describe('the chapter sheet', () => {
  it('is not on the page until it is asked for', () => {
    renderPlayer()
    expect(screen.queryByRole('dialog')).toBeNull()
    // and the headings it would list are not printed either
    expect(screen.queryByText('The Saying He Did Not Write')).toBeNull()
  })

  it('opens from the panel and lists the devotional’s own headings', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: /chapters/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /What God Says When He Says His Own Name/,
      }),
    ).toBeTruthy()
    expect(screen.getByText('3:26')).toBeTruthy() // 206.1s
  })

  it('seeks the audio AND brings the page to that section', () => {
    // The ask was to "quickly scroll to the section I want as it relates to
    // the audio player" — a chapter is a position in both, so selecting one
    // must not leave the eye and the ear in different places.
    const article = document.createElement('article')
    article.id = 'devotional-section-9'
    const scrolled: unknown[] = []
    article.scrollIntoView = (arg?: unknown) => scrolled.push(arg)
    document.body.appendChild(article)

    const { container } = renderPlayer()
    const audio = container.querySelector('audio') as HTMLAudioElement
    fireEvent.click(screen.getByRole('button', { name: /chapters/i }))
    fireEvent.click(
      screen.getByRole('button', { name: /The Saying He Did Not Write/ }),
    )

    expect(audio.currentTime).toBeCloseTo(206.1, 1)
    expect(scrolled).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    article.remove()
  })

  it('closes on Escape', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: /chapters/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('offers no chapter control when a track has none', () => {
    renderPlayer('no-chapters-day-1')
    expect(screen.queryByRole('button', { name: /chapters/i })).toBeNull()
  })
})

describe('the section being read', () => {
  it('marks the article matching the current chapter', () => {
    const article = document.createElement('article')
    article.id = 'devotional-section-3'
    article.className = 'devotional-flow-article'
    document.body.appendChild(article)

    const { container } = renderPlayer()
    const audio = container.querySelector('audio') as HTMLAudioElement
    act(() => {
      audio.dispatchEvent(new Event('play'))
    })
    setTime(container, 100) // inside module 3's chapter

    expect(article.getAttribute('data-narrating')).toBe('true')
    article.remove()
  })

  it('does not mark anything while paused', () => {
    const article = document.createElement('article')
    article.id = 'devotional-section-3'
    document.body.appendChild(article)

    const { container } = renderPlayer()
    setTime(container, 100)

    expect(article.getAttribute('data-narrating')).toBeNull()
    article.remove()
  })
})

describe('the mini bar shows position, not just identity', () => {
  it('names the current chapter once playing', () => {
    const { container } = renderPlayer()
    const audio = container.querySelector('audio') as HTMLAudioElement
    act(() => {
      audio.dispatchEvent(new Event('play'))
    })
    setTime(container, 210)
    act(() => observerCallback?.([{ isIntersecting: false }]))

    expect(screen.getByLabelText('Audio edition, minimized')).toBeTruthy()
    expect(screen.getByText('The Saying He Did Not Write')).toBeTruthy()
  })
})
