/**
 * The section rule.
 *
 * What is pinned here is everything a rendering test cannot see and a future
 * change could quietly undo: that it is still a real slider to a screen reader,
 * that it still works from a keyboard, that a snapped drag lands on a section
 * start rather than an arbitrary second, and that the ticks are still tiered.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SectionRule from '@/components/audio/SectionRule'
import type { NarrationChapter } from '@/lib/audio/tracks'

afterEach(cleanup)

/** The real marks of abiding-in-his-presence-day-1: ten sections, four
 *  editorial against six module labels — the median shape of the catalog. */
const CHAPTERS: NarrationChapter[] = [
  { t: 0, label: 'Opening', module: 0 },
  { t: 3.3, label: 'Scripture', module: 1 },
  { t: 19.1, label: 'Word study', module: 2 },
  { t: 72.6, label: "Jesus' Invitation to Permanent Residence", module: 3 },
  { t: 139.5, label: "The Spiritual Commuter's Dilemma", module: 4 },
  { t: 195.7, label: 'The Tabernacle Principle', module: 5 },
  { t: 329.7, label: 'Reflect', module: 7 },
  { t: 335.0, label: 'Prayer', module: 8 },
  { t: 351.0, label: 'Takeaway', module: 9 },
  { t: 365.5, label: 'The True Vine', module: 12 },
]

const mount = (props: Partial<React.ComponentProps<typeof SectionRule>> = {}) =>
  render(
    <SectionRule
      chapters={CHAPTERS}
      currentTime={0}
      duration={405}
      onSeek={vi.fn()}
      {...props}
    />,
  )

describe('what assistive tech is told', () => {
  it('is a slider with the section as its value', () => {
    mount({ currentTime: 200 })
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '5')
    expect(slider).toHaveAttribute('aria-valuemax', '9')
    expect(slider.getAttribute('aria-valuetext')).toBe(
      'Section 6 of 10, The Tabernacle Principle',
    )
  })

  it('gives a structural section its timecode, because those repeat', () => {
    // Without the stamp, three sections called "Scripture" are indistinguishable
    // to anyone navigating by ear or by screen reader.
    mount({ currentTime: 340 })
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe(
      'Section 8 of 10, Prayer at 5:35',
    )
  })
})

describe('operating it', () => {
  it('steps a section at a time with the arrow keys', async () => {
    const onSeek = vi.fn()
    mount({ currentTime: 200, onSeek })
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onSeek).toHaveBeenLastCalledWith(329.7)
    await userEvent.keyboard('{ArrowLeft}')
    expect(onSeek).toHaveBeenLastCalledWith(139.5)
  })

  it('jumps to the ends with Home and End', async () => {
    const onSeek = vi.fn()
    mount({ currentTime: 200, onSeek })
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{Home}')
    expect(onSeek).toHaveBeenLastCalledWith(0)
    await userEvent.keyboard('{End}')
    expect(onSeek).toHaveBeenLastCalledWith(365.5)
  })

  it('ignores keys it does not own', async () => {
    const onSeek = vi.fn()
    mount({ currentTime: 200, onSeek })
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{Enter}a ')
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('snaps a drag to the nearest section start, never a raw second', () => {
    const onSeek = vi.fn()
    const { container } = mount({ onSeek })
    const strip = container.querySelector('.lsn-rule-strip') as HTMLElement
    // jsdom gives every element a zero-size rect, so the geometry is supplied.
    strip.getBoundingClientRect = () =>
      ({ left: 0, width: 400, top: 0, height: 56 }) as DOMRect
    strip.setPointerCapture = vi.fn()
    strip.hasPointerCapture = vi.fn(() => false)

    // x=200 of a 400px strip inset by 13px each side ≈ halfway ≈ 202s. The
    // nearest section start is "The Tabernacle Principle" at 195.7.
    strip.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 200, bubbles: true }),
    )
    expect(onSeek).toHaveBeenCalledWith(195.7)
    expect(CHAPTERS.some((c) => c.t === onSeek.mock.calls[0][0])).toBe(true)
  })
})

describe('the ticks', () => {
  it('draws one per section, tiered', () => {
    const { container } = mount({ currentTime: 200 })
    expect(container.querySelectorAll('.lsn-rule-tick')).toHaveLength(10)
    // Six module labels, none of them the current section here, so all six are
    // short; the current one is marked separately.
    expect(container.querySelectorAll('.lsn-rule-tick.is-struct')).toHaveLength(6)
    expect(container.querySelectorAll('.lsn-rule-tick.is-now')).toHaveLength(1)
  })

  it('marks an armed sleep stop', () => {
    const { container } = mount({ stopAt: 300 })
    expect(container.querySelector('.lsn-rule-stop')).not.toBeNull()
  })

  it('draws no stop marker when none is armed', () => {
    const { container } = mount({ stopAt: null })
    expect(container.querySelector('.lsn-rule-stop')).toBeNull()
  })
})

describe('when it should not render at all', () => {
  it('declines a single-section reading rather than drawing a lying track', () => {
    const { container } = mount({ chapters: [CHAPTERS[0]] })
    expect(container).toBeEmptyDOMElement()
  })

  it('declines before the duration is known', () => {
    const { container } = mount({ duration: 0 })
    expect(container).toBeEmptyDOMElement()
  })
})
