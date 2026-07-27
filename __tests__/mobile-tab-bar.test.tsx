/**
 * SA-024 — mobile bottom tab bar contract.
 *
 * The tab bar carries the five primary destinations on mobile. It must
 * always render all five, mark exactly the matching destination active
 * (aria-current="page"), and map companion routes onto their tab
 * (/daily-bread → TODAY, /saved + /clippings → LIBRARY, /series → SERIES).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import MobileTabBar from '@/components/MobileTabBar'

afterEach(cleanup)

const usePathnameMock = vi.hoisted(() => vi.fn<() => string>(() => '/'))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}))

const TAB_LABELS = ['TODAY', 'SERIES', 'SOUL AUDIT', 'LIBRARY', 'YOU']

function activeLabels(): string[] {
  return screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent ?? '')
}

describe('MobileTabBar', () => {
  it('renders all five destinations with their routes', () => {
    usePathnameMock.mockReturnValue('/')
    render(<MobileTabBar />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(links.map((l) => l.textContent)).toEqual(TAB_LABELS)
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/today',
      '/series',
      '/soul-audit',
      '/library',
      '/settings',
    ])
    // Marketing homepage lights no tab — HOME lives in the masthead wordmark.
    expect(activeLabels()).toEqual([])
  })

  it.each([
    ['/today', 'TODAY'],
    ['/daily-bread', 'TODAY'],
    ['/series/bible-365', 'SERIES'],
    ['/devotional/identity-day-1', 'SERIES'],
    ['/soul-audit/results', 'SOUL AUDIT'],
    ['/library', 'LIBRARY'],
    ['/saved', 'LIBRARY'],
    ['/clippings', 'LIBRARY'],
    ['/settings', 'YOU'],
  ])('marks exactly one active tab for %s', (pathname, expected) => {
    usePathnameMock.mockReturnValue(pathname)
    render(<MobileTabBar />)
    expect(activeLabels()).toEqual([expected])
  })
})
