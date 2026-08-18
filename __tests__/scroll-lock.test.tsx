import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { isScrollLocked, useScrollLock } from '@/lib/use-scroll-lock'

/**
 * Ref-counted scroll lock (backlog #59 / SA-088).
 *
 * The behaviour under test is the ORDER-INDEPENDENCE that seven independent
 * save/restore owners did not have: whoever closes first must not speak for the
 * whole page.
 */

function Locker({ active }: { active: boolean }) {
  useScrollLock(active)
  return null
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('useScrollLock', () => {
  it('locks while held and restores when released', () => {
    const view = render(<Locker active />)
    expect(document.body.style.overflow).toBe('hidden')
    expect(isScrollLocked()).toBe(true)
    view.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(isScrollLocked()).toBe(false)
  })

  it('does nothing while inactive', () => {
    render(<Locker active={false} />)
    expect(document.body.style.overflow).toBe('')
    expect(isScrollLocked()).toBe(false)
  })

  it('survives the out-of-order close that used to leak', () => {
    // menu opens, then search opens, then the MENU closes first — the exact
    // two-tap sequence that unlocked the page behind an open search overlay.
    const menu = render(<Locker active />)
    const search = render(<Locker active />)
    expect(document.body.style.overflow).toBe('hidden')

    menu.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    expect(isScrollLocked()).toBe(true)

    search.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(isScrollLocked()).toBe(false)
  })

  it('restores what was there before the first lock, not an assumed default', () => {
    document.body.style.overflow = 'scroll'
    const view = render(<Locker active />)
    expect(document.body.style.overflow).toBe('hidden')
    view.unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })
})
