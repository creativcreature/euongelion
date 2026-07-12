import { describe, expect, it } from 'vitest'
import { renderMarkdownSafe } from '@/lib/markdown-safe'

/**
 * Brief §12.3 / OWASP M-1: model-authored markdown renders with raw
 * HTML disabled — injected HTML displays as text, never executes.
 */

describe('renderMarkdownSafe', () => {
  it('renders normal markdown formatting', () => {
    const html = renderMarkdownSafe(
      '**bold** and *italic* and a [link](https://example.com)',
    )
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<a href="https://example.com">link</a>')
  })

  it('escapes block-level raw HTML instead of passing it through', () => {
    const html = renderMarkdownSafe('<script>alert(1)</script>\n\nA prayer.')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('A prayer.')
  })

  it('escapes inline raw HTML', () => {
    const html = renderMarkdownSafe(
      'Be still <img src=x onerror=alert(1)> and know.',
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('escapes event-handler smuggling via anchor tags', () => {
    const html = renderMarkdownSafe('<a href="javascript:alert(1)">click</a>')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('&lt;a href=')
  })

  it('keeps blockquotes and headings (used by devotional content)', () => {
    const html = renderMarkdownSafe(
      '> Come to me, all who are weary.\n\n## Selah',
    )
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<h2>Selah</h2>')
  })
})
