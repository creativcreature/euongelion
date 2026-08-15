/**
 * F-092 — an existing highlight is editable.
 *
 * Founder, 2026-08-15: "I can highlight text, but not change colors or make
 * notes etc. i am also signed in."
 *
 * Reproduced on production before the fix: a mark, once made, was inert.
 * Clicking it produced no toolbar (handleSelection returns early for anything
 * inside `.reader-highlight`), re-selecting it produced no toolbar, and a scan
 * of every button in the reader found no note, edit or delete control at all.
 *
 * These tests pin the second act: click a mark, get the toolbar, recolour it,
 * write a note on it, remove it.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'

const SLUG = 'looking-at-the-sun-day-1'

let fetchMock: ReturnType<typeof vi.fn>

/** A hydrated, account-backed highlight already on the page. */
function seedMark(id: string | null = 'ann-1', color = 'yellow') {
  const root = document.createElement('div')
  root.id = 'main-content'
  const p = document.createElement('p')
  p.innerHTML = `Before <mark class="reader-highlight reader-highlight--${color}" data-highlight-color="${color}"${
    id ? ` data-highlight-id="${id}"` : ''
  }>the promise was not made to the strong</mark> after.`
  root.appendChild(p)
  document.body.appendChild(root)
  return root.querySelector('mark') as HTMLElement
}

beforeEach(() => {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ annotations: [] }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, annotation: { id: 'ann-1' } }),
    } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const patchCalls = () =>
  fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
  )

describe('editing an existing highlight', () => {
  it('opens the toolbar when a highlight is clicked', async () => {
    const mark = seedMark()
    render(<TextHighlightTrigger devotionalSlug={SLUG} />)

    expect(document.querySelector('.reader-highlight-toolbar')).toBeNull()
    fireEvent.click(mark)

    await waitFor(() => {
      expect(document.querySelector('.reader-highlight-toolbar')).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('recolours the mark in place and persists the change', async () => {
    const mark = seedMark('ann-1', 'yellow')
    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)

    const purple = await screen.findByRole('button', {
      name: /change highlight to purple/i,
    })
    fireEvent.click(purple)

    // The swatch is the control: the mark repaints immediately, not after the
    // network settles.
    expect(mark.dataset.highlightColor).toBe('purple')
    expect(mark.className).toContain('reader-highlight--purple')

    await waitFor(() => expect(patchCalls().length).toBe(1))
    const body = JSON.parse(String(patchCalls()[0][1]?.body))
    expect(body.annotationId).toBe('ann-1')
    expect(body.style.color).toBe('purple')
  })

  it('attaches a note, marks it visibly, and saves it', async () => {
    const mark = seedMark()
    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)

    fireEvent.click(await screen.findByRole('button', { name: 'Note' }))
    const box = screen.getByLabelText('Note on this highlight')
    fireEvent.change(box, { target: { value: 'The sentence I keep skipping.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))

    await waitFor(() => expect(patchCalls().length).toBe(1))
    expect(mark.dataset.highlightNote).toBe('The sentence I keep skipping.')
    // A written-on passage must be findable without clicking every mark.
    expect(mark.classList.contains('reader-highlight--noted')).toBe(true)
    expect(JSON.parse(String(patchCalls()[0][1]?.body)).style.note).toBe(
      'The sentence I keep skipping.',
    )
  })

  it('removes the highlight and leaves the text intact', async () => {
    const mark = seedMark()
    const paragraph = mark.parentElement as HTMLElement
    const textBefore = paragraph.textContent

    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(document.querySelector('mark.reader-highlight')).toBeNull()
    })
    // The words stay exactly as they were — removing a highlight is not
    // removing the reading.
    expect(paragraph.textContent).toBe(textBefore)

    const deletes = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
    )
    expect(deletes.length).toBe(1)
    expect(String(deletes[0][0])).toContain('annotationId=ann-1')
  })

  it('edits a device-kept highlight without calling the API', async () => {
    // No id = made while signed out. SA-038/039 keep it on the device, so the
    // same controls must work without a server round-trip.
    const mark = seedMark(null, 'yellow')
    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)

    fireEvent.click(
      await screen.findByRole('button', { name: /change highlight to green/i }),
    )
    expect(mark.dataset.highlightColor).toBe('green')
    await waitFor(() => expect(patchCalls().length).toBe(0))
  })

  it('flips below the passage when there is no room above', async () => {
    // A highlight near the top of the window used to put the toolbar off the
    // top of the screen (or under the sticky masthead), so Remove could not be
    // reached at all.
    const mark = seedMark()
    vi.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      bottom: 40,
      left: 100,
      right: 300,
      width: 200,
      height: 20,
      x: 100,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect)

    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)

    const toolbar = (await waitFor(() => {
      const el = document.querySelector('.reader-highlight-toolbar')
      expect(el).not.toBeNull()
      return el
    })) as HTMLElement

    // Below the mark's bottom edge, and not translated up out of view.
    expect(toolbar.style.top).toBe('52px')
    expect(toolbar.style.transform).toBe('translate(-50%, 0)')
  })

  it('sits above the passage when there is room', async () => {
    const mark = seedMark()
    vi.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
      top: 600,
      bottom: 620,
      left: 100,
      right: 300,
      width: 200,
      height: 20,
      x: 100,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect)

    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)

    const toolbar = (await waitFor(() => {
      const el = document.querySelector('.reader-highlight-toolbar')
      expect(el).not.toBeNull()
      return el
    })) as HTMLElement

    expect(toolbar.style.top).toBe('588px')
    expect(toolbar.style.transform).toBe('translate(-50%, -100%)')
  })

  it('closes the toolbar when the reader clicks away', async () => {
    const mark = seedMark()
    render(<TextHighlightTrigger devotionalSlug={SLUG} />)
    fireEvent.click(mark)
    await waitFor(() =>
      expect(document.querySelector('.reader-highlight-toolbar')).not.toBeNull(),
    )

    fireEvent.click(document.body)
    await waitFor(() =>
      expect(document.querySelector('.reader-highlight-toolbar')).toBeNull(),
    )
  })
})
