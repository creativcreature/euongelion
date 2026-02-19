import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

let mockPathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

type RectInit = {
  top: number
  height: number
  width?: number
}

function rect({ top, height, width = 1000 }: RectInit): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: width,
    width,
    bottom: top + height,
    height,
    toJSON: () => ({}),
  } as DOMRect
}

describe('EuangelionShellHeader', () => {
  beforeEach(() => {
    mockPathname = '/'
    const mockResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: mockResizeObserver,
    })

    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    })

    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: () => {},
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 900px)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })

    const store: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      })),
    )

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function getBoundingClientRectMock(this: HTMLElement) {
        if (this.classList.contains('mock-topbar')) {
          return rect({ top: 0, height: 42 })
        }
        return rect({ top: 0, height: 0 })
      },
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps primary nav visible and interactive', async () => {
    const { container } = render(<EuangelionShellHeader />)

    await waitFor(() => {
      expect(
        screen.getByLabelText('Main navigation').getAttribute('aria-hidden'),
      ).toBe(null)
    })
    expect(screen.getByLabelText('Main navigation')).not.toHaveAttribute(
      'inert',
    )

    expect(
      container
        .querySelector('.mock-topbar')
        ?.classList.contains('is-nav-docked'),
    ).toBe(false)
    expect(screen.getAllByRole('link', { name: 'HOME' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getAllByText('Daily Devotionals for the Hungry Soul').length,
    ).toBeGreaterThan(0)
    expect(container.querySelector('time.mock-topbar-date')).toBeTruthy()
  })

  it('does not render docked topbar nav state classes', async () => {
    const { container } = render(<EuangelionShellHeader />)

    await waitFor(() => {
      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
    })

    expect(
      container
        .querySelector('.mock-topbar')
        ?.classList.contains('is-nav-docked'),
    ).toBe(false)
    expect(container.querySelector('.mock-nav-sentinel')).toBeNull()
  })

  it('clears stale global scroll-lock artifacts on mount and route changes', async () => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.classList.add('lenis-stopped')
    document.body.setAttribute('data-scroll-locked', 'true')

    const { rerender } = render(<EuangelionShellHeader />)

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('')
      expect(document.body.style.position).toBe('')
      expect(document.documentElement.style.overflow).toBe('')
      expect(document.documentElement.classList.contains('lenis-stopped')).toBe(
        false,
      )
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false)
    })

    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('lenis-stopped')
    document.body.setAttribute('data-scroll-locked', 'true')
    mockPathname = '/series'
    rerender(<EuangelionShellHeader />)

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('')
      expect(document.documentElement.classList.contains('lenis-stopped')).toBe(
        false,
      )
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false)
    })
  })

  it('closes mobile secondary menu when route changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<EuangelionShellHeader />)

    const toggle = screen.getByRole('button', {
      name: 'Open secondary menu',
    })
    await user.click(toggle)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close secondary menu' }),
      ).toBeInTheDocument()
    })

    mockPathname = '/series'
    rerender(<EuangelionShellHeader />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open secondary menu' }),
      ).toBeInTheDocument()
    })
  })

  it('wires mobile secondary menu keyboard escape close behavior', async () => {
    const user = userEvent.setup()
    render(<EuangelionShellHeader />)

    const toggle = screen.getByRole('button', {
      name: 'Open secondary menu',
    })
    expect(toggle).toHaveAttribute(
      'aria-controls',
      'shell-mobile-secondary-nav',
    )

    await user.click(toggle)

    const panel = await screen.findByRole('group', {
      name: 'Navigation menu',
    })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-hidden', 'false')

    await user.keyboard('{Escape}')

    await waitFor(() => {
      const reopenedToggle = screen.getByRole('button', {
        name: 'Open secondary menu',
      })
      expect(reopenedToggle).toBeInTheDocument()
      expect(reopenedToggle).toHaveFocus()
    })
  })

  it('avoids duplicate settings/account links in authenticated mobile menu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { email: 'reader@example.com' },
        }),
      })),
    )
    const user = userEvent.setup()
    render(<EuangelionShellHeader />)

    const toggle = await screen.findByRole('button', {
      name: 'Open secondary menu',
    })
    await user.click(toggle)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close secondary menu' }),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'ACCOUNT' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'SETTINGS' })).toBeNull()
  })
})
