import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from '@/lib/markdown-safe'

/**
 * F-089: study-chat excerpts sliced the raw answer, so a reply that opened
 * with a heading appeared in the sidebar as "## Genesis 15 and the Covenant…".
 * Previews are read as sentences, so the syntax has to come off.
 */
describe('markdownToPlainText', () => {
  it('strips the heading that started every chat excerpt', () => {
    expect(markdownToPlainText('## Genesis 15 and the Covenant')).toBe(
      'Genesis 15 and the Covenant',
    )
  })

  it('strips bold and italic without eating the words', () => {
    expect(markdownToPlainText('a **treaty** and a *will*')).toBe(
      'a treaty and a will',
    )
    expect(markdownToPlainText('__bold__ and _thin_')).toBe('bold and thin')
  })

  it('keeps link text and drops the target', () => {
    expect(markdownToPlainText('see [Genesis 15](https://example.com)')).toBe(
      'see Genesis 15',
    )
  })

  it('drops images entirely', () => {
    expect(markdownToPlainText('before ![alt](/x.png) after')).toBe(
      'before after',
    )
  })

  it('flattens lists and blockquotes into prose', () => {
    expect(markdownToPlainText('- one\n- two')).toBe('one two')
    expect(markdownToPlainText('1. first\n2. second')).toBe('first second')
    expect(markdownToPlainText('> quoted line')).toBe('quoted line')
  })

  it('removes code fences and inline code markers', () => {
    expect(markdownToPlainText('a ```js\nconst x=1\n``` b')).toBe('a b')
    expect(markdownToPlainText('use `berith` here')).toBe('use berith here')
  })

  it('collapses whitespace so an excerpt is one clean line', () => {
    expect(markdownToPlainText('one\n\n\ntwo   three')).toBe('one two three')
  })

  it('is safe on empty and non-string input', () => {
    expect(markdownToPlainText('')).toBe('')
    expect(markdownToPlainText(undefined as unknown as string)).toBe('')
  })

  it('leaves ordinary prose untouched', () => {
    const prose = 'Abram cut the animals and drove the vultures off.'
    expect(markdownToPlainText(prose)).toBe(prose)
  })
})
