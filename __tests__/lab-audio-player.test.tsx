/**
 * The listening player's design contract.
 *
 * The founder's report was "hard to navigate on mobile — especially when I am
 * driving", and three of the four causes are invisible to an ordinary unit test:
 * an 8px label is perfectly findable by role, a 44px button and a 60px button
 * are the same to `getByRole`, and a transport in the wrong order passes every
 * behavioural assertion. So this file asserts the things that actually failed —
 * order, size, tiering, and type coming from the ladder rather than a literal
 * rem — in the same spirit as `audio-drawer-styles.test.ts`, which exists
 * because a styling defect is not visible through the accessibility tree.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LabAudioPlayer from '@/components/lab/LabAudioPlayer'
import type { NarrationChapter } from '@/lib/audio/tracks'

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), 'src/components/lab/LabAudioPlayer.tsx'),
  'utf8',
)

/** The real chapter marks of abiding-in-his-presence-day-1: ten sections,
 *  four editorial against six module labels — the median shape of the catalog. */
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

// This repo does not set vitest `globals`, so RTL's auto-cleanup never runs and
// renders accumulate across tests in a file. Every suite here declares it.
afterEach(cleanup)

function mount() {
  return render(
    <LabAudioPlayer
      title="From Visiting to Dwelling"
      context="Abiding in His Presence · Day 1"
      src="/audio/abiding-in-his-presence-day-1-c2ec679c80.m4a"
      duration={405}
      chapters={CHAPTERS}
    />,
  )
}

/**
 * Scope a query to one region.
 *
 * Play/pause and the section name each appear TWICE in one render — once in the
 * transport and once in the docked bar — which is correct: the bar's whole job
 * is to carry them where the player is not open. So these queries name the
 * region rather than relying on a unique label.
 */
function region(container: HTMLElement, selector: string) {
  const found = container.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`no ${selector} in the rendered player`)
  return within(found)
}

describe('the transport', () => {
  it('runs prev, back, play, forward, next', () => {
    mount()
    const wanted =
      /^(Previous section|Back 15 seconds|Pause the reading|Resume the reading|Forward 15 seconds|Next section)$/
    const order = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '')
      .filter((label) => wanted.test(label))
    // The shipped drawer renders back, play, forward, NEXT, PREVIOUS — previous
    // last, to the right of next. Eyes-free use is muscle memory.
    expect(order.slice(0, 5)).toEqual([
      'Previous section',
      'Back 15 seconds',
      expect.stringMatching(/the reading$/),
      'Forward 15 seconds',
      'Next section',
    ])
  })

  it('gives the three roles three different sizes, none under 54px', () => {
    const sizes = Object.fromEntries(
      ['lap-btn', 'lap-btn--skip', 'lap-btn--play'].map((cls) => {
        const block = SOURCE.slice(SOURCE.indexOf(`.${cls} {`))
        return [cls, Number(/min-height:\s*(\d+)px/.exec(block)?.[1])]
      }),
    )
    expect(sizes['lap-btn']).toBeGreaterThanOrEqual(54)
    expect(sizes['lap-btn--skip']).toBeGreaterThan(sizes['lap-btn'])
    expect(sizes['lap-btn--play']).toBeGreaterThan(sizes['lap-btn--skip'])
  })
})

describe('the section rule', () => {
  it('is a slider a screen reader can read', () => {
    mount()
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/Section 1 of 10, Opening/)
  })

  // A structural label repeats — bible-365-day-1 says "Scripture" seven times —
  // so the timecode is what tells two of them apart.
  it('gives a structural section its timecode in the accessible name', () => {
    mount()
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toMatch(/at 0:00/)
  })

  // A drag-only control would be a REGRESSION from the <input type="range"> it
  // replaces, which was at least operable by keyboard.
  it('steps sections with the arrow keys', async () => {
    mount()
    const slider = screen.getByRole('slider')
    slider.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/Section 2 of 10, Scripture/)
    await userEvent.keyboard('{End}')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/The True Vine/)
    await userEvent.keyboard('{Home}')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/Section 1 of 10/)
  })

  it('tiers the ticks so a repeated module label cannot own the headline', () => {
    const { container } = mount()
    const structural = container.querySelectorAll('.lap-tick--struct')
    // Six of these ten are module furniture: Opening, Scripture, Word study,
    // Reflect, Prayer, Takeaway. The seventh, the current one, is marked
    // lap-tick--now instead, so five short ticks are drawn.
    expect(structural.length).toBe(5)
    expect(container.querySelectorAll('.lap-tick--now').length).toBe(1)
    expect(container.querySelectorAll('.lap-tick').length).toBe(CHAPTERS.length)
  })
})

describe('drive mode', () => {
  it('switches to any section, not just the next one', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'DRIVE MODE' }))
    const rows = screen.getAllByRole('button', { name: /^Section \d+, / })
    // The founder's correction: "I need to be beable to switch chapters etc in
    // drive mode." Stepping is not switching.
    expect(rows.length).toBe(CHAPTERS.length)
  })

  it('leaves on Escape as well as the button', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'DRIVE MODE' }))
    expect(screen.getByRole('dialog', { name: 'Drive mode' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Drive mode' })).not.toBeInTheDocument()
  })

  it('puts nothing in the car under 68px', () => {
    const drive = SOURCE.slice(SOURCE.indexOf('/* ── drive mode ── */'))
    const heights = [...drive.matchAll(/(?:min-)?height:\s*(\d+)px/g)].map((m) => Number(m[1]))
    expect(heights.length).toBeGreaterThan(3)
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(68)
  })
})

describe('the docked bar', () => {
  it('names the section, not only the reading', () => {
    const { container } = mount()
    const bar = region(container, '.lap-bar')
    // The shipped bar shows the reading title only, so a listener glancing at
    // it learns nothing about where they are.
    expect(bar.getByText('Opening')).toBeInTheDocument()
    expect(bar.getByText(/From Visiting to Dwelling · .* left/)).toBeInTheDocument()
  })

  it('can be dismissed', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Stop showing the player' }))
    expect(screen.queryByRole('button', { name: 'Stop showing the player' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'BRING IT BACK' })).toBeInTheDocument()
  })
})

describe('the type contract', () => {
  // SA-092: "Any font-size in this stylesheet that is not one of these tokens
  // is a defect." The shipped drawer sets four labels between 8 and 9.9px.
  it('sets every size from the ladder, never a literal rem', () => {
    const literals = [...SOURCE.matchAll(/font-size:\s*([0-9.]+)rem/g)].map((m) => m[1])
    expect(literals).toEqual([])
  })

  it('takes every colour from a token', () => {
    const hex = [...SOURCE.matchAll(/(?:color|background):\s*(#[0-9a-fA-F]{3,8})/g)].map(
      (m) => m[1],
    )
    // A hard-coded amber measures 2.1:1 on cream and fails AA — the trap logged
    // twice already as SA-044 and SA-047.
    expect(hex).toEqual([])
  })
})

describe('failure is visible', () => {
  it('surfaces a refused play instead of silently doing nothing', async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockRejectedValue(new Error('NotAllowedError'))
    const { container } = mount()
    await userEvent.click(
      region(container, '.lap-transport').getByRole('button', { name: 'Resume the reading' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('NotAllowedError')
    play.mockRestore()
  })
})
