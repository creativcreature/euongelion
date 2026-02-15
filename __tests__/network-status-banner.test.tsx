import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NetworkStatusBanner from '@/components/NetworkStatusBanner'

function mockOnlineState(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

describe('NetworkStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    mockOnlineState(true)
  })

  it('shows offline banner when app boots offline', () => {
    mockOnlineState(false)
    render(<NetworkStatusBanner />)
    expect(screen.getByText(/offline mode/i)).toBeTruthy()
  })

  it('shows brief online sync notice after reconnect', () => {
    mockOnlineState(false)
    render(<NetworkStatusBanner />)
    expect(screen.getByText(/offline mode/i)).toBeTruthy()

    mockOnlineState(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.getByText(/back online/i)).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(4_100)
    })

    expect(screen.queryByText(/back online/i)).toBeNull()
  })
})
