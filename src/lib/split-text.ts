import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * React-native text splitter — renders words/chars as <span> elements.
 *
 * Unlike GSAP SplitText (paid), this works via React rendering:
 * - No DOM manipulation conflicts with React reconciliation
 * - Accessible: aria-label on container, aria-hidden on spans
 * - Progressive: content visible as text in HTML, spans are decorative
 *
 * Usage:
 *   const words = splitIntoWords("Hello world")
 *   // Returns array of ReactElements: [<span>Hello </span>, <span>world</span>]
 */

export interface SplitOptions {
  /** Wrapper element type for each word/char */
  as?: 'span' | 'div'
  /** CSS class applied to each word/char span */
  className?: string
  /** Starting index for stagger delay (useful for multiple lines) */
  startIndex?: number
}

/** Split text into word spans for animation */
export function splitIntoWords(
  text: string,
  options: SplitOptions = {},
): ReactNode[] {
  const { as = 'span', className = '', startIndex = 0 } = options
  const words = text.split(/(\s+)/)

  return words
    .filter((word) => word.trim().length > 0)
    .map((word, i) =>
      createElement(
        as,
        {
          key: `w-${startIndex + i}`,
          className: className || undefined,
          style: { display: 'inline-block', whiteSpace: 'pre' as const },
          'aria-hidden': 'true',
          'data-word-index': startIndex + i,
        },
        word + ' ',
      ),
    )
}

/** Split text into character spans for animation */
export function splitIntoChars(
  text: string,
  options: SplitOptions = {},
): ReactNode[] {
  const { as = 'span', className = '', startIndex = 0 } = options

  return text.split('').map((char, i) =>
    createElement(
      as,
      {
        key: `c-${startIndex + i}`,
        className: className || undefined,
        style: { display: 'inline-block' },
        'aria-hidden': 'true',
        'data-char-index': startIndex + i,
      },
      char === ' ' ? '\u00A0' : char,
    ),
  )
}
