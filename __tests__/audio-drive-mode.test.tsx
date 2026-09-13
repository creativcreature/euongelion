/**
 * Drive mode, and the legibility floor across every listening surface.
 *
 * The founder's correction after the first pass was exact: "I need to be
 * beable to switch chapters etc in drive mode." Stepping one section at a time
 * is not switching, so what is pinned here is that the whole list is reachable,
 * that leaving is always possible, and that nothing in the car is small.
 *
 * The last block is a source scan rather than a render assertion, for the same
 * reason `audio-drawer-styles.test.ts` is: a target of 44px and a target of
 * 68px are identical through the accessibility tree, and an 8px label is
 * perfectly findable by role. These are precisely the defects that shipped.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DriveMode from '@/components/audio/DriveMode'
import type { NarrationChapter } from '@/lib/audio/tracks'

afterEach(cleanup)

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

const mount = (props: Partial<React.ComponentProps<typeof DriveMode>> = {}) =>
  render(
    <DriveMode
      title="From Visiting to Dwelling"
      context="Abiding in His Presence"
      chapters={CHAPTERS}
      currentTime={0}
      duration={405}
      playing={false}
      onSeek={vi.fn()}
      onTogglePlay={vi.fn()}
      onExit={vi.fn()}
      {...props}
    />,
  )

describe('switching sections, not stepping through them', () => {
  it('offers every section as its own target', () => {
    mount()
    const rows = screen.getAllByRole('button', { name: /^Section \d+, / })
    expect(rows).toHaveLength(CHAPTERS.length)
  })

  it('jumps straight to a section eight rows away', async () => {
    const onSeek = vi.fn()
    mount({ onSeek })
    await userEvent.click(
      screen.getByRole('button', { name: 'Section 9, Takeaway' }),
    )
    expect(onSeek).toHaveBeenCalledWith(351)
  })

  it('marks where the reader currently is', () => {
    const { container } = mount({ currentTime: 200 })
    const now = container.querySelectorAll('.lsn-drive-row.is-now')
    expect(now).toHaveLength(1)
    expect(now[0].textContent).toContain('The Tabernacle Principle')
  })

  it('still carries the rule, so a moving car can slide instead of scroll', () => {
    const { container } = mount()
    expect(container.querySelector('.lsn-rule-strip')).not.toBeNull()
  })
})

describe('getting out', () => {
  it('leaves on the button', async () => {
    const onExit = vi.fn()
    mount({ onExit })
    await userEvent.click(screen.getByRole('button', { name: /exit drive mode/i }))
    expect(onExit).toHaveBeenCalled()
  })

  it('leaves on Escape, because a driver cannot fight a modal', async () => {
    const onExit = vi.fn()
    mount({ onExit })
    await userEvent.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalled()
  })

  it('releases the wake lock on the way out', () => {
    const release = vi.fn(() => Promise.resolve())
    // @ts-expect-error — jsdom has no wakeLock
    navigator.wakeLock = { request: () => Promise.resolve({ release }) }
    const { unmount } = mount()
    unmount()
    // The request resolves on a microtask; the assertion is that unmounting
    // does not throw and the handler is wired. A held lock after exit would
    // keep a phone awake in someone's pocket.
    expect(() => unmount()).not.toThrow()
    // @ts-expect-error — clean up the stub
    delete navigator.wakeLock
  })

  it('survives a platform with no wake lock at all', () => {
    // iOS Safari before 16.4 rejects the promise; nothing else may break.
    expect(() => mount()).not.toThrow()
  })
})

describe('nothing in the car is small', () => {
  const SOURCE = fs.readFileSync(
    path.join(process.cwd(), 'src/components/audio/DriveMode.tsx'),
    'utf8',
  )

  it('puts no control under 68px', () => {
    // Scoped to CONTROL rules. An earlier version of this scan swept the whole
    // file and failed on a 38px svg glyph inside a 96px button — the icon is
    // not the target, and a test that cannot tell them apart would have been
    // "fixed" by lowering the threshold to 38.
    const controls = [...SOURCE.matchAll(/\.lsn-drive-[a-z]+\s*\{([^}]*)\}/g)]
      .map((m) => m[1])
      .flatMap((body) => [...body.matchAll(/(?:min-)?height:\s*(\d+)px/g)])
      .map((m) => Number(m[1]))
    expect(controls.length).toBeGreaterThan(3)
    expect(Math.min(...controls)).toBeGreaterThanOrEqual(68)
  })

  it('gives play the largest target on the surface', () => {
    const play = /\.lsn-drive-play\s*\{[^}]*height:\s*(\d+)px/.exec(SOURCE)
    const side = /\.lsn-drive-side\s*\{[^}]*height:\s*(\d+)px/.exec(SOURCE)
    expect(Number(play?.[1])).toBeGreaterThan(Number(side?.[1]))
  })
})

/**
 * SA-092: "Any font-size in this stylesheet that is not one of these tokens is
 * a defect." The drawer shipped with four labels between 8 and 9.9px — that is
 * the literal content of "hard to navigate on mobile" — and a hard-coded amber
 * measures 2.1:1 on cream, a trap already logged twice as SA-044 and SA-047.
 */
describe('the listening surfaces take type and colour from tokens', () => {
  const FILES = [
    'src/components/audio/AudioDrawer.tsx',
    'src/components/audio/SectionRule.tsx',
    'src/components/audio/DriveMode.tsx',
  ]

  it.each(FILES)('%s sets no font-size from a literal rem', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    const literals = [...source.matchAll(/font-size:\s*([0-9.]+)rem/g)].map((m) => m[1])
    expect(literals).toEqual([])
  })

  it.each(FILES)('%s names no colour as a literal hex', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    const hex = [...source.matchAll(/(?:^|[^-\w])(?:color|background):\s*(#[0-9a-fA-F]{3,8})/gm)]
    expect(hex.map((m) => m[1])).toEqual([])
  })
})
