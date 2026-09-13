import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ComicStrip from '@/components/daily-bread/ComicStrip'
import {
  renderComicPanel,
  renderComicPanelSvg,
  renderComicStrip,
} from '@/lib/daily-bread/comic/render'
import {
  assertSafeSvgTree,
  svgToString,
  type SvgNode,
} from '@/lib/daily-bread/comic/svg'
import {
  COMIC_TEMPLATES,
  pickComicTemplate,
} from '@/lib/daily-bread/comic/templates'
import {
  COMIC_FIGURES,
  COMIC_SETTINGS,
  validateComicScript,
  verifyComicCaptions,
} from '@/lib/daily-bread/comic/validate'
import type { ComicScript } from '@/lib/daily-bread/types'

afterEach(() => cleanup())

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const base = COMIC_TEMPLATES[0]

function svg(children: SvgNode[], attrs: SvgNode['attrs'] = {}): SvgNode {
  return { tag: 'svg', attrs: { viewBox: '0 0 10 10', ...attrs }, children }
}

describe('comic templates', () => {
  it('ships at least 14 templates with unique ids', () => {
    expect(COMIC_TEMPLATES.length).toBeGreaterThanOrEqual(14)
    const ids = COMIC_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every template validates', () => {
    for (const template of COMIC_TEMPLATES) {
      expect(validateComicScript(template), template.id).toEqual([])
    }
  })

  it('every caption is plain text with at most one caption per strip', () => {
    for (const template of COMIC_TEMPLATES) {
      const captions = template.panels.filter((p) => p.caption !== undefined)
      expect(captions.length, template.id).toBeLessThanOrEqual(1)
    }
  })

  it('pickComicTemplate is deterministic', () => {
    for (const seed of [0, 1, 7, 20260913, 4294967295]) {
      expect(pickComicTemplate(seed, []).id).toBe(
        pickComicTemplate(seed, []).id,
      )
    }
    const picks = new Set(
      Array.from({ length: 60 }, (_, i) => pickComicTemplate(i, []).id),
    )
    expect(picks.size).toBeGreaterThan(5)
  })

  it('pickComicTemplate skips excluded ids unless all are excluded', () => {
    const allIds = COMIC_TEMPLATES.map((t) => t.id)
    for (let seed = 0; seed < 40; seed++) {
      const exclude = allIds.slice(0, allIds.length - 2)
      const pick = pickComicTemplate(seed, exclude)
      expect(exclude).not.toContain(pick.id)
    }
    const fallback = pickComicTemplate(3, allIds)
    expect(allIds).toContain(fallback.id)
    expect(pickComicTemplate(3, allIds).id).toBe(fallback.id)
  })
})

describe('validateComicScript', () => {
  it('knows every setting and figure id', () => {
    expect(COMIC_SETTINGS).toHaveLength(8)
    expect(COMIC_FIGURES).toHaveLength(17)
  })

  it('rejects a non-object', () => {
    expect(validateComicScript(null)).not.toEqual([])
    expect(validateComicScript('strip')).not.toEqual([])
  })

  it('rejects a bad id and title', () => {
    const bad = clone(base)
    bad.id = 'Bad Id!'
    bad.title = 'x'
    const problems = validateComicScript(bad)
    expect(problems.some((p) => p.includes('id'))).toBe(true)
    expect(problems.some((p) => p.includes('title'))).toBe(true)
  })

  it('rejects an unknown setting', () => {
    const bad = clone(base) as unknown as { panels: { setting: string }[] }
    bad.panels[0].setting = 'spaceship'
    expect(validateComicScript(bad).join(' ')).toContain('unknown setting')
  })

  it('rejects an unknown figure', () => {
    const bad = clone(base) as unknown as {
      panels: { figures: { figure: string }[] }[]
    }
    bad.panels[1].figures[0].figure = 'dragon'
    expect(validateComicScript(bad).join(' ')).toContain('unknown figure')
  })

  it('rejects out-of-range coordinates and scale', () => {
    const bad = clone(base)
    bad.panels[0].figures[0].x = 1.2
    bad.panels[0].figures[0].y = -0.1
    bad.panels[0].figures[0].scale = 2
    const problems = validateComicScript(bad).join(' ')
    expect(problems).toContain('x must be 0-1')
    expect(problems).toContain('y must be 0-1')
    expect(problems).toContain('scale must be 0.3-1.6')
  })

  it('rejects too many or too few figures', () => {
    const bad = clone(base)
    bad.panels[0].figures = []
    expect(validateComicScript(bad).join(' ')).toContain('1-4 figures')
    const crowd = clone(base)
    crowd.panels[0].figures = Array.from({ length: 5 }, () => ({
      figure: 'sheep' as const,
      x: 0.5,
      y: 0.5,
      scale: 1,
    }))
    expect(validateComicScript(crowd).join(' ')).toContain('1-4 figures')
  })

  it('rejects a wrong panel count', () => {
    const two = clone(base)
    two.panels = two.panels.slice(0, 2)
    expect(validateComicScript(two).join(' ')).toContain('exactly 3 panels')
    const four = clone(base)
    four.panels = [...four.panels, four.panels[0]]
    expect(validateComicScript(four).join(' ')).toContain('exactly 3 panels')
  })

  it('rejects unsafe captions and bad descriptions', () => {
    const bad = clone(base)
    bad.panels[0].caption = '<b>see https://example.com</b>'
    bad.panels[1].caption = 'He said "hello"'
    bad.panels[2].description = 'short'
    const problems = validateComicScript(bad).join(' ')
    expect(problems).toContain('< or >')
    expect(problems).toContain('link')
    expect(problems).toContain('quote marks')
    expect(problems).toContain('description')
    const long = clone(base)
    long.panels[0].caption = 'a'.repeat(141)
    expect(validateComicScript(long).join(' ')).toContain('140')
  })
})

describe('verifyComicCaptions', () => {
  const verse =
    'And He told them many things in parables, saying, “A farmer went out to sow his seed.'

  it('accepts a verbatim caption after whitespace normalisation', async () => {
    const script = clone(base)
    script.panels[0].caption = 'A farmer went  out\nto sow his seed.'
    expect(await verifyComicCaptions(script, async () => verse)).toEqual([])
  })

  it('rejects an invented caption', async () => {
    const script = clone(base)
    script.panels[0].caption = 'A farmer went out to plant corn.'
    const problems = await verifyComicCaptions(script, async () => verse)
    expect(problems).toHaveLength(1)
  })

  it('reports a lookup failure instead of passing', async () => {
    const script = clone(base)
    const problems = await verifyComicCaptions(script, async () => {
      throw new Error('corpus missing')
    })
    expect(problems.join(' ')).toContain('corpus missing')
  })
})

describe('assertSafeSvgTree', () => {
  it('accepts a plain tree', () => {
    expect(() =>
      assertSafeSvgTree(
        svg([
          {
            tag: 'path',
            attrs: { d: 'M 0 0 L 1 1', fill: 'url(#db2-halftone-x)' },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it('rejects a script tag', () => {
    const tree = svg([{ tag: 'script' as SvgNode['tag'], attrs: {} }])
    expect(() => assertSafeSvgTree(tree)).toThrow(/not allowed/)
  })

  it('rejects href, xlink:href, onload and style attributes', () => {
    for (const name of ['href', 'xlink:href', 'onload', 'style']) {
      const tree = svg([{ tag: 'rect', attrs: { [name]: 'x' } }])
      expect(() => assertSafeSvgTree(tree), name).toThrow(/not allowed/)
    }
  })

  it('rejects javascript: urls and external url()', () => {
    expect(() =>
      assertSafeSvgTree(
        svg([{ tag: 'g', attrs: { class: 'javascript:alert(1)' } }]),
      ),
    ).toThrow(/javascript/)
    expect(() =>
      assertSafeSvgTree(
        svg([
          { tag: 'rect', attrs: { fill: 'url(https://evil.example/x.svg#p)' } },
        ]),
      ),
    ).toThrow(/url/)
    expect(() =>
      assertSafeSvgTree(
        svg([{ tag: 'g', attrs: { transform: 'url(data:x)' } }]),
      ),
    ).toThrow(/url/)
  })

  it('rejects markup in values, bad paints, non-finite numbers, and text off title', () => {
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'g', attrs: { id: '"><script>' } }])),
    ).toThrow()
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'rect', attrs: { fill: 'red' } }])),
    ).toThrow(/paint/)
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'circle', attrs: { r: Number.NaN } }])),
    ).toThrow(/finite/)
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'g', attrs: {}, text: 'hello' }])),
    ).toThrow(/text/)
  })

  it('rejects trees that are too deep or too large', () => {
    let deep: SvgNode = { tag: 'g', attrs: {} }
    for (let i = 0; i < 13; i++)
      deep = { tag: 'g', attrs: {}, children: [deep] }
    expect(() => assertSafeSvgTree(deep)).toThrow(/depth/)
    const wide = svg(
      Array.from({ length: 4001 }, () => ({ tag: 'rect' as const, attrs: {} })),
    )
    expect(() => assertSafeSvgTree(wide)).toThrow(/nodes/)
  })

  it('svgToString escapes title text', () => {
    const out = svgToString(
      svg([{ tag: 'title', attrs: {}, text: 'Bread & <fish>' }]),
    )
    expect(out).toContain('Bread &amp; &lt;fish&gt;')
    expect(out).not.toContain('<fish>')
  })
})

describe('comic renderer', () => {
  it('is deterministic and safe for every template', () => {
    for (const template of COMIC_TEMPLATES) {
      const a = renderComicStrip(template)
      const b = renderComicStrip(clone(template))
      expect(() => assertSafeSvgTree(a), template.id).not.toThrow()
      const markup = svgToString(a)
      expect(markup, template.id).toBe(svgToString(b))
      expect(markup).not.toMatch(/<script|href|style=|\son[a-z]+=/i)
      template.panels.forEach((_, index) => {
        expect(() =>
          assertSafeSvgTree(renderComicPanelSvg(template, index)),
        ).not.toThrow()
      })
    }
  })

  it('draws a 1260x320 strip with a title, a halftone pattern and three panels', () => {
    const tree = renderComicStrip(base)
    expect(tree.attrs.viewBox).toBe('0 0 1260 320')
    expect(tree.attrs.role).toBe('img')
    const title = tree.children?.find((c) => c.tag === 'title')
    expect(title?.text).toBe(base.title)
    const markup = svgToString(tree)
    expect(markup).toContain(`<pattern id="db2-halftone-${base.id}"`)
    expect(markup.match(/class="db2-panel db2-panel-/g)).toHaveLength(3)
  })

  it('draws every setting and figure without throwing', () => {
    for (const setting of COMIC_SETTINGS) {
      const node = renderComicPanel(
        {
          setting,
          figures: COMIC_FIGURES.slice(0, 4).map((figure, i) => ({
            figure,
            x: 0.2 + i * 0.2,
            y: 0.8,
            scale: 1,
          })),
          description: 'Every figure on every setting.',
        },
        0,
        'coverage-strip',
      )
      expect(() => assertSafeSvgTree(svg([node]))).not.toThrow()
    }
    for (const figure of COMIC_FIGURES) {
      const node = renderComicPanel(
        {
          setting: 'field',
          figures: [{ figure, x: 0.5, y: 0.8, scale: 1.6, flip: true }],
          description: 'One figure, flipped, at full scale.',
        },
        2,
        'coverage-strip',
      )
      expect(() => assertSafeSvgTree(svg([node])), figure).not.toThrow()
    }
  })

  it('never uses Math.random', () => {
    const original = Math.random
    Math.random = () => {
      throw new Error('Math.random called')
    }
    try {
      expect(() => renderComicStrip(COMIC_TEMPLATES[4])).not.toThrow()
    } finally {
      Math.random = original
    }
  })
})

describe('<ComicStrip />', () => {
  const script: ComicScript = COMIC_TEMPLATES.find(
    (t) => t.id === 'the-lost-sheep',
  )!

  it('renders an accessible SVG strip with its title and panel descriptions', () => {
    const { container } = render(
      <ComicStrip
        script={script}
        caption="go after the one that is lost"
        level="deterministic-script"
      />,
    )
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(4)
    const strip = container.querySelector('svg.db2-comic-strip')
    expect(strip).not.toBeNull()
    expect(strip?.getAttribute('role')).toBe('img')
    expect(strip?.querySelector('title')?.textContent).toBe(script.title)

    const labelledBy = strip?.getAttribute('aria-labelledby')?.split(' ') ?? []
    expect(labelledBy).toHaveLength(2)
    const list = container.querySelector(`[id="${labelledBy[1]}"]`)
    expect(list?.tagName).toBe('OL')
    expect(list?.className).toBe('sr-only')
    for (const panel of script.panels) {
      expect(list?.textContent).toContain(panel.description)
    }
    expect(images[0]).toHaveAccessibleName(
      expect.stringContaining(script.panels[0].description),
    )

    expect(container.querySelectorAll('.db2-comic-stack svg')).toHaveLength(3)
    expect(
      container.querySelector('.db2-comic-caption')?.textContent,
    ).toContain('go after the one that is lost')
    expect(container.innerHTML).not.toMatch(/<script/i)
    expect(container.textContent).not.toContain('From the archive')
  })

  it('shows the archive line for a reprint', () => {
    render(
      <ComicStrip
        script={script}
        caption=""
        level="archive-reprint"
        firstRan="2026-08-01"
      />,
    )
    expect(
      screen.getByText('From the archive — first ran 2026-08-01'),
    ).toBeInTheDocument()
  })
})
