/**
 * F-095 — the words of Christ in red.
 *
 * The contract that matters is NEGATIVE: this renders attribution, it never
 * infers it. The catalog contains a passage where the obvious inference is
 * wrong, and that case is pinned here.
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRedLetter, hasRedLetter } from '@/lib/red-letter'

const LUKE = `But when a Samaritan on a journey came upon him, he looked at him and had compassion. … "Which of these three do you think was a neighbor to the man who fell into the hands of robbers?" "The one who showed him mercy," replied the expert in the law. Then Jesus told him, "Go and do likewise."`

describe('renderRedLetter', () => {
  it('reddens only the spans it is given', () => {
    const { container } = render(
      <p>
        {renderRedLetter(LUKE, [
          'Which of these three do you think was a neighbor to the man who fell into the hands of robbers?',
          'Go and do likewise.',
        ])}
      </p>,
    )
    const reds = Array.from(container.querySelectorAll('.wj')).map(
      (n) => n.textContent ?? '',
    )
    expect(reds).toHaveLength(2)
    // The expert in the law keeps his own words.
    expect(reds.join(' ')).not.toContain('The one who showed him mercy')
    expect(container.textContent).toContain('The one who showed him mercy')
  })

  it('leaves the passage untouched when nothing is attributed', () => {
    const { container } = render(<p>{renderRedLetter(LUKE, [])}</p>)
    expect(container.querySelectorAll('.wj')).toHaveLength(0)
    expect(container.textContent).toContain('Go and do likewise')
  })

  it('skips a span that does not appear, rather than widening the red', () => {
    const { container } = render(
      <p>{renderRedLetter(LUKE, ['Verily I say unto you'])}</p>,
    )
    expect(container.querySelectorAll('.wj')).toHaveLength(0)
    // The passage still renders in full.
    expect(container.textContent).toContain('Samaritan')
  })

  it('matches the longest span first so nested spans are not cut in half', () => {
    const text = 'He said, Peace be with you, and then he left.'
    const { container } = render(
      <p>{renderRedLetter(text, ['Peace', 'Peace be with you'])}</p>,
    )
    const reds = Array.from(container.querySelectorAll('.wj')).map(
      (n) => n.textContent,
    )
    expect(reds).toContain('Peace be with you')
  })

  it('marks attributed spans for downstream styling and print', () => {
    const { container } = render(
      <p>{renderRedLetter(LUKE, ['Go and do likewise.'])}</p>,
    )
    const el = container.querySelector('.wj') as HTMLElement
    expect(el.dataset.wordsOfChrist).toBe('true')
  })

  it('hasRedLetter is false for empty or whitespace attribution', () => {
    expect(hasRedLetter(undefined)).toBe(false)
    expect(hasRedLetter([])).toBe(false)
    expect(hasRedLetter(['  '])).toBe(false)
    expect(hasRedLetter(['Go and do likewise.'])).toBe(true)
  })
})
