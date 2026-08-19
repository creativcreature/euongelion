/**
 * SA-090 / F-136 — the Gallery's frame.
 *
 * The frame is the section: a plate, its title, and — when there is one — a
 * byline. The architecture, mosaic and artifact families in the print audit are
 * recorded as artist "Unknown", and "after Unknown" is not attribution, it is a
 * missing field read aloud in the caption. An unattributed plate gets no artist
 * line at all, in the caption or in the alt text.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GalleryFrame } from '@/components/edition/EditionSections'
import type { GalleryPayload } from '@/lib/edition/kinds'

function art(overrides: Partial<GalleryPayload> = {}): GalleryPayload {
  return {
    image: '/images/devotional-prints/rembrandt-return-prodigal-grace.webp',
    artist: 'Rembrandt',
    title: 'Return Prodigal',
    looking: 'Find the darkest passage and stay with it until it opens.',
    auditVerdict: 'clean',
    ...overrides,
  }
}

describe('GalleryFrame (SA-090 / F-136)', () => {
  afterEach(cleanup)

  it('prints the byline when the work is attributed', () => {
    render(<GalleryFrame art={art()} />)

    expect(screen.getByText('Return Prodigal')).toBeInTheDocument()
    expect(screen.getByText('after Rembrandt')).toBeInTheDocument()
    expect(screen.getByAltText('Return Prodigal, after Rembrandt')).toBeTruthy()
  })

  it('prints NO artist line for an unattributed plate', () => {
    render(
      <GalleryFrame
        art={art({
          image: '/images/devotional-prints/arch-ancient-olive-press.webp',
          artist: 'Unknown',
          title: 'Ancient Olive Press',
        })}
      />,
    )

    expect(screen.getByText('Ancient Olive Press')).toBeInTheDocument()
    expect(screen.queryByText(/after Unknown/i)).toBeNull()
    expect(screen.queryByText(/^after /i)).toBeNull()
    // The alt text is the title alone — no byline through the back door.
    expect(screen.getByAltText('Ancient Olive Press')).toBeTruthy()
  })

  it('treats casing and stray spacing as the same missing attribution', () => {
    render(<GalleryFrame art={art({ artist: ' unknown ' })} />)
    expect(screen.queryByText(/after/i)).toBeNull()
  })
})
