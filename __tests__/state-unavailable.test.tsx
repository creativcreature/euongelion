import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import StateUnavailable from '@/components/StateUnavailable'

// This project does not enable RTL auto-cleanup globally, so renders would
// otherwise accumulate across cases and every query would match twice.
afterEach(cleanup)

/**
 * Founder roadmap item #5: an outage must never read as lost data. These tests
 * pin the two promises the copy makes, because they are the whole point of the
 * component — a future "tidy up the copy" pass must not quietly drop them.
 */
describe('StateUnavailable', () => {
  it('says it could not CONFIRM the thing — never that it is gone', () => {
    render(<StateUnavailable subject="your current devotional" />)
    expect(
      screen.getByText(/couldn.t confirm your current devotional/i),
    ).toBeInTheDocument()
    // Words that would imply data loss must not appear.
    const body = document.body.textContent || ''
    expect(body).not.toMatch(/\b(lost|deleted|removed|cleared|gone)\b/i)
  })

  it('states explicitly that the reader’s selection was not changed', () => {
    render(<StateUnavailable />)
    expect(
      screen.getByText(/your selection has not been changed/i),
    ).toBeInTheDocument()
  })

  it('offers a retry action that calls back', () => {
    const onRetry = vi.fn()
    render(<StateUnavailable onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables the action while retrying so it cannot be double-fired', () => {
    const onRetry = vi.fn()
    render(<StateUnavailable onRetry={onRetry} retrying />)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('renders no action when there is nothing to retry', () => {
    render(<StateUnavailable />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('announces politely to assistive tech', () => {
    render(<StateUnavailable />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })
})
