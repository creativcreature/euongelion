import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownWithWordNotes, {
  hasWordNoteMarkers,
} from '@/components/today/MarkdownWithWordNotes'
import { getWordNote, type WordNoteEntry } from '@/lib/wordnote'

afterEach(cleanup)

// Regression: the Daily Bread reader renders the grounded weave's woven body as
// markdown AND must turn inline {{wn:id|surface}} markers into interactive
// WordNotes. Without this the generated days would show literal "{{wn:...}}".

describe('MarkdownWithWordNotes', () => {
  it('detects markers', () => {
    expect(hasWordNoteMarkers('the {{wn:shalom|peace} of God')).toBe(true)
    expect(hasWordNoteMarkers('plain markdown, no markers')).toBe(false)
  })

  it('renders plain markdown untouched when there are no markers', () => {
    render(<MarkdownWithWordNotes markdown={'A **quiet**, ordinary line.'} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/ordinary line/)).toBeInTheDocument()
  })

  it('converts a marker in markdown prose into an interactive WordNote', async () => {
    const user = userEvent.setup()
    render(
      <MarkdownWithWordNotes
        markdown={'He gives {{wn:shalom|peace}} to the weary.'}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'peace' })
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText(/to the weary/)).toBeInTheDocument()

    await user.click(trigger)
    const card = screen.getByRole('note')
    const entry = getWordNote('shalom') as WordNoteEntry
    expect(card.textContent).toContain(entry.gloss)
    expect(card.textContent).toMatch(/Brown-Driver-Briggs|Strong's/)
  })

  it('renders an unknown bank id as plain text (never fabricates a note)', () => {
    const { container } = render(
      <MarkdownWithWordNotes
        markdown={'A {{wn:totally-made-up|mystery}} word.'}
      />,
    )
    // The surface word still appears (as plain text), but there is NO disclosure
    // trigger and NO note card — an unknown id never fabricates a definition.
    expect(container.textContent).toContain('mystery')
    expect(container.textContent).not.toContain('{{wn:')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('does not leak literal marker syntax into the rendered text', () => {
    render(
      <MarkdownWithWordNotes
        markdown={'The {{wn:charis|grace}} of God abounds.'}
      />,
    )
    expect(screen.queryByText(/\{\{wn:/)).toBeNull()
    expect(screen.getByRole('button', { name: 'grace' })).toBeInTheDocument()
  })
})
