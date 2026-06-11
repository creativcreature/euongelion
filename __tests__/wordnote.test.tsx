import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import WordNote from '@/components/WordNote'
import {
  getWordNote,
  hasWordNote,
  listWordNotes,
  type WordNoteEntry,
} from '@/lib/wordnote'
import { hasWordNoteMarkup, renderWithWordNotes } from '@/lib/wordnote-markup'

afterEach(cleanup)

describe('WordNote bank', () => {
  it('ships a non-trivial, grounded bank', () => {
    const bank = listWordNotes()
    expect(bank.length).toBeGreaterThanOrEqual(40)
  })

  it('every entry carries a real lexicon gloss + source (never blank/fabricated)', () => {
    for (const e of listWordNotes()) {
      expect(e.id).toMatch(/^[a-z0-9-]+$/)
      expect(e.strong).toMatch(/^[HG]\d+$/)
      expect(e.word.length).toBeGreaterThan(0)
      expect(e.gloss.length).toBeGreaterThan(0)
      // Source must attribute a real public-domain lexicon.
      expect(e.source).toMatch(/Brown-Driver-Briggs|Strong's|Abbott-Smith/)
    }
  })

  it('has unique ids', () => {
    const ids = listWordNotes().map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves known ids and rejects unknown ones', () => {
    const shalom = getWordNote('shalom') as WordNoteEntry
    expect(shalom).not.toBeNull()
    expect(shalom.strong).toBe('H7965')
    expect(shalom.gloss.toLowerCase()).toContain('peace')
    expect(hasWordNote('shalom')).toBe(true)
    expect(getWordNote('not-a-real-id')).toBeNull()
    expect(hasWordNote('not-a-real-id')).toBe(false)
  })
})

describe('renderWithWordNotes (marker parser)', () => {
  it('detects markers', () => {
    expect(hasWordNoteMarkup('the {{wn:shalom|peace} of God')).toBe(true)
    expect(hasWordNoteMarkup('plain prose, no markers')).toBe(false)
  })

  it('passes plain prose through untouched (no markers → no WordNote)', () => {
    render(<p>{renderWithWordNotes('a quiet, ordinary sentence')}</p>)
    // No disclosure button is created for plain text.
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/a quiet, ordinary sentence/)).toBeInTheDocument()
  })

  it('converts a marker into an interactive WordNote, keeping surrounding text', () => {
    render(
      <p>{renderWithWordNotes('he gives {{wn:shalom|peace}} to the weary')}</p>,
    )
    const trigger = screen.getByRole('button', { name: 'peace' })
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText(/he gives/)).toBeInTheDocument()
    expect(screen.getByText(/to the weary/)).toBeInTheDocument()
  })
})

describe('WordNote component', () => {
  it('renders the surface text with a disclosure trigger', () => {
    render(<WordNote id="shalom">peace</WordNote>)
    const trigger = screen.getByRole('button', { name: 'peace' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens a grounded footnote card on activation (word + gloss + source)', async () => {
    const user = userEvent.setup()
    render(<WordNote id="shalom">peace</WordNote>)
    const trigger = screen.getByRole('button', { name: 'peace' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const card = screen.getByRole('note')
    // Compare against the bank's exact strings to avoid Unicode-normalization
    // mismatches with hand-typed Hebrew literals.
    const entry = getWordNote('shalom') as WordNoteEntry
    expect(card.textContent).toContain(entry.word)
    expect(card.textContent).toContain(entry.gloss)
    expect(card.textContent?.toLowerCase()).toContain('peace')
    expect(card.textContent).toMatch(/Brown-Driver-Briggs|Strong's/)
  })

  it('renders plain text and NO note for an unknown bank id (never fabricates)', () => {
    render(<WordNote id="totally-made-up">mystery</WordNote>)
    expect(screen.getByText('mystery')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('note')).toBeNull()
  })
})
