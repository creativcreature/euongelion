import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import Page from '@/app/page'

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

describe('Smoke Test', () => {
  it('renders the landing page without crashing', () => {
    render(<Page />)
    // EUANGELION appears in both nav logo and hero — use getAllByText
    const euangelionElements = screen.getAllByText('EUANGELION')
    expect(euangelionElements.length).toBeGreaterThanOrEqual(1)
    // Tagline is split: "DAILY" (sans) + "bread for the cluttered, hungry soul." (serif)
    expect(
      screen.getByText(/bread for the cluttered, hungry soul/),
    ).toBeInTheDocument()
  })
})
