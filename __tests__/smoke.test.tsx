import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, describe, it, expect, beforeEach, vi } from 'vitest'
import Page from '@/app/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock browser APIs for test environment
beforeEach(() => {
  // Mock IntersectionObserver
  const mockIntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
  })

  const mockResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: mockResizeObserver,
  })

  // Mock localStorage
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
      get length() {
        return Object.keys(store).length
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
    },
  })

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

// Flush React scheduler work before jsdom tears down `window`.
afterAll(async () => {
  cleanup()
  await new Promise((r) => setTimeout(r, 0))
})

describe('Smoke Test', () => {
  it('renders the landing page without crashing', () => {
    render(<Page />)
    // EUANGELION appears in both nav logo and hero — use getAllByText
    const euangelionElements = screen.getAllByText('EUANGELION')
    expect(euangelionElements.length).toBeGreaterThanOrEqual(1)
    // Masthead kicker copy is present.
    expect(
      screen.getAllByText(/Daily Devotionals for the Hungry Soul/).length,
    ).toBeGreaterThanOrEqual(1)
  })
})
