/**
 * SA-075 (F-119) — motion stills on inline-image modules.
 *
 * Trap #1 in the devo-go traps file: client-render drops are invisible to curl,
 * and since the reader stopped wrapping modules in bordered panels a null render
 * ships a silent gap rather than a visible empty box. Any NEW module shape needs
 * a rendered-DOM assertion, so this pins the motion-still contract:
 *
 *   1. Without inlineImageMotionSrc the module renders exactly as before — the
 *      still, and no <video>. This is the regression that matters most, because
 *      it covers every existing inline-image in the catalog.
 *   2. With it, a looping muted inline video renders over the still, carrying the
 *      still as its poster so a blocked or failed clip degrades to the image.
 *   3. The video is decorative and must stay out of the accessibility tree and
 *      out of the tab order — it is the same content as the still beneath it.
 *   4. It carries .motion-still, which globals.css hides under
 *      prefers-reduced-motion. A <video autoplay> cannot honour that itself.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import InlineImageModule from '@/components/modules/InlineImageModule'
import type { Module } from '@/types'

afterEach(cleanup)

const base: Module = {
  type: 'inline-image',
  inlineImageSrc: '/images/series/rekindled/day1-lead.webp',
  inlineImageAlt:
    'A scribe’s hands on a blank scroll, lit from behind the page',
  inlineImageCaption: 'The light is behind the page, not on it.',
  inlineImageWidth: 'bleed',
} as Module

describe('inline-image motion stills (SA-075 / F-119)', () => {
  it('renders the still and NO video when no motion clip is supplied', () => {
    const { container } = render(<InlineImageModule module={base} />)
    expect(
      screen.getByAltText(base.inlineImageAlt as string),
    ).toBeInTheDocument()
    expect(container.querySelector('video')).toBeNull()
  })

  it('renders a looping muted inline video over the still when one is', () => {
    const { container } = render(
      <InlineImageModule
        module={
          {
            ...base,
            inlineImageMotionSrc: '/video/rekindled/day1-lead.mp4',
          } as Module
        }
      />,
    )
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('src', '/video/rekindled/day1-lead.mp4')
    expect(video).toHaveAttribute('loop')
    // playsInline is required or iOS Safari refuses to autoplay and instead
    // takes the clip fullscreen on tap.
    expect(video).toHaveProperty('playsInline', true)
    expect(video).toHaveProperty('muted', true)
    expect(video).toHaveProperty('autoplay', true)
  })

  it('keeps the still underneath as the poster so a failed clip degrades', () => {
    const { container } = render(
      <InlineImageModule
        module={
          {
            ...base,
            inlineImageMotionSrc: '/video/rekindled/day1-lead.mp4',
          } as Module
        }
      />,
    )
    expect(container.querySelector('video')).toHaveAttribute(
      'poster',
      base.inlineImageSrc as string,
    )
    // the <Image> still renders regardless
    expect(
      screen.getByAltText(base.inlineImageAlt as string),
    ).toBeInTheDocument()
  })

  it('is decorative: out of the a11y tree and out of the tab order', () => {
    const { container } = render(
      <InlineImageModule
        module={
          {
            ...base,
            inlineImageMotionSrc: '/video/rekindled/day1-lead.mp4',
          } as Module
        }
      />,
    )
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('aria-hidden', 'true')
    expect(video).toHaveAttribute('tabindex', '-1')
  })

  it('carries .motion-still so the reduced-motion rule can reach it', () => {
    const { container } = render(
      <InlineImageModule
        module={
          {
            ...base,
            inlineImageMotionSrc: '/video/rekindled/day1-lead.mp4',
          } as Module
        }
      />,
    )
    expect(container.querySelector('video')).toHaveClass('motion-still')
  })

  it('still renders the caption alongside a motion clip', () => {
    render(
      <InlineImageModule
        module={
          {
            ...base,
            inlineImageMotionSrc: '/video/rekindled/day1-lead.mp4',
          } as Module
        }
      />,
    )
    expect(screen.getByText(/The light is behind the page/)).toBeInTheDocument()
  })
})
