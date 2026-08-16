/**
 * SA-058 — the transport glyph set.
 *
 * The Audio Edition transport was five uppercase word-buttons
 * (−15 / LISTEN / +15 / CHAPTERS / 1×). Founder, 2026-08-16: "it needs to have
 * proper play buttons… the type can be smaller and more finessed". Glyphs also
 * buy back the row space the new controls need, inside the same box height.
 *
 * Two contracts matter enough to pin:
 *
 * 1. COLOUR IS INHERITED. Every glyph paints with `currentColor` so one icon
 *    serves the panel, the mini bar, light mode and dark without a second
 *    variant. This is not incidental tidiness — `--color-gold` resolves to
 *    COBALT in light mode, and hardcoding a fill here is how SA-044 and SA-047
 *    both shipped invisible controls.
 *
 * 2. THE GLYPH IS DECORATIVE. `aria-hidden` on the svg, with the accessible
 *    name on the button that wraps it. An icon that announces itself competes
 *    with its own label.
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  ChapterNextIcon,
  ChapterPrevIcon,
  ChaptersIcon,
  ClipIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SleepIcon,
} from '@/components/audio/TransportIcons'

afterEach(cleanup)

const ALL = [
  ['PlayIcon', PlayIcon],
  ['PauseIcon', PauseIcon],
  ['ChapterPrevIcon', ChapterPrevIcon],
  ['ChapterNextIcon', ChapterNextIcon],
  ['ChaptersIcon', ChaptersIcon],
  ['SleepIcon', SleepIcon],
  ['ClipIcon', ClipIcon],
] as const

describe('transport icons', () => {
  it.each(ALL)('%s renders a decorative svg', (_name, Icon) => {
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    // focusable=false keeps IE/Edge legacy and some AT out of the svg's guts.
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  it.each(ALL)(
    '%s inherits colour rather than hardcoding one',
    (_name, Icon) => {
      const { container } = render(<Icon />)
      expect(container.innerHTML).toContain('currentColor')
      // A literal hex would break in one theme or the other.
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
    },
  )

  it('sizes from the size prop', () => {
    const { container } = render(<PlayIcon size={40} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('40')
    expect(svg?.getAttribute('height')).toBe('40')
  })

  it('prints the skip interval inside the arc', () => {
    // The number IS the affordance — an unlabelled arrow does not say how far
    // it jumps, and the founder asked for 2x-style precision in the transport.
    expect(
      render(<SkipBackIcon seconds={15} />).container.textContent,
    ).toContain('15')
    cleanup()
    expect(
      render(<SkipForwardIcon seconds={30} />).container.textContent,
    ).toContain('30')
  })

  it('draws back and forward as distinct glyphs', () => {
    const back = render(<SkipBackIcon seconds={15} />).container.innerHTML
    cleanup()
    const forward = render(<SkipForwardIcon seconds={15} />).container.innerHTML
    // Mirrored, not identical — a reader must be able to tell them apart at
    // 22px without reading the number.
    expect(back).not.toBe(forward)
  })
})
