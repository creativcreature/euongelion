/**
 * /admin/comics — approving weekly Echo & Dust strips in one sitting (SA-142 /
 * F-184; founder 2026-09-14: "I want to approve the months of comics at once").
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ComicsBatchClient, { type WeekOfStrips } from '@/app/admin/comics/ComicsBatchClient'
import { weekStart } from '@/lib/daily-bread/time'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const strip = (id: string, monday: string, status: 'draft' | 'published' | 'rejected') => ({
  id,
  publishDate: monday,
  status,
  image: `https://example.test/${id}.jpg`,
  alt: `Echo & Dust: ${id}`,
  caption: `Echo & Dust — ${id}`,
  width: 1512,
  height: 745,
})

const WEEKS: WeekOfStrips[] = [
  { monday: '2026-09-14', isCurrent: true, strips: [strip('the-button', '2026-09-14', 'published')] },
  { monday: '2026-09-21', isCurrent: false, strips: [strip('the-receipt-2', '2026-09-21', 'draft')] },
  { monday: '2026-09-28', isCurrent: false, strips: [strip('the-bus', '2026-09-28', 'draft')] },
  { monday: '2026-10-05', isCurrent: false, strips: [] },
]

describe('weekly strips', () => {
  it('weeks run Monday to Sunday', () => {
    expect(weekStart('2026-09-14')).toBe('2026-09-14') // Monday
    expect(weekStart('2026-09-20')).toBe('2026-09-14') // Sunday
    expect(weekStart('2026-09-16')).toBe('2026-09-14')
    expect(weekStart('2027-01-01')).toBe('2026-12-28') // across a year
  })
})

describe('<ComicsBatchClient />', () => {
  it('lists every week with its strip or the gap, and counts what awaits approval', () => {
    render(<ComicsBatchClient weeks={WEEKS} />)
    expect(screen.getByText('2 strips are waiting for your approval.')).toBeInTheDocument()
    expect(screen.getByText(/1 upcoming week has no strip yet/)).toBeInTheDocument()
    expect(screen.getByText('Week of Monday, September 14 · this week')).toBeInTheDocument()
    expect(screen.getByText('Approved — prints every day this week')).toBeInTheDocument()
    expect(screen.getByText('No strip for this week yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(2)
  })

  it('approves one week through the existing review endpoint', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ComicsBatchClient weeks={WEEKS} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0])
    await waitFor(() => expect(screen.getByText('1 strip is waiting for your approval.')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/edition', expect.objectContaining({ method: 'POST', body: JSON.stringify({ id: 'the-receipt-2', verdict: 'published' }) }))
  })

  it('"Approve all" asks once, then approves every draft on the page', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ComicsBatchClient weeks={WEEKS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve all 2 drafts' }))
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes — approve all 2' }))
    await waitFor(() => expect(screen.getByText('No strips are waiting for your approval.')).toBeInTheDocument())
    expect(fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)).id)).toEqual(['the-receipt-2', 'the-bus'])
  })

  it('a failed verdict is shown, not hidden', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Forbidden.' }, { status: 403 })))
    render(<ComicsBatchClient weeks={WEEKS} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0])
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not record the verdict: Forbidden.'))
    expect(screen.getByText('2 strips are waiting for your approval.')).toBeInTheDocument()
  })
})
