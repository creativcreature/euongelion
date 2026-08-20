import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Every class the sidebar renders must actually be styled.
 *
 * Found 2026-08-20 on the live site: `lsn-seek`, `lsn-seek-label`, `lsn-times`,
 * `lsn-extras` and `lsn-chip` were in the markup and in NO rule, so the player
 * rendered "0:0011:18 left" and "1x speedSleep timerChaptersShare" — the times
 * and the chips with no spacing at all, because the elements were still
 * `display: block`. Every one of them was a control added the night before to
 * make the sidebar the full player.
 *
 * Unit tests could not catch it: they query by role and accessible name, and an
 * unstyled button is perfectly findable. Nothing in the type system or the lint
 * rules looks at whether a className has a matching rule either. This does.
 */
describe('the sidebar styles every class it renders', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/audio/AudioDrawer.tsx'),
    'utf8',
  )

  // Everything before the styled-jsx block is markup; everything after is CSS.
  const marker = '<style jsx>'
  const split = source.indexOf(marker)

  it('has a styled-jsx block to check against', () => {
    expect(split).toBeGreaterThan(0)
  })

  it('declares a rule for every lsn- class in the markup', () => {
    const markup = source.slice(0, split)
    const css = source.slice(split)

    const classes = (name: string) =>
      new Set(name.match(/lsn-[a-z0-9-]+/g) ?? [])

    const used = classes(markup)
    const styled = classes(css)

    const unstyled = [...used].filter((c) => !styled.has(c)).sort()
    expect(unstyled).toEqual([])
  })
})

/**
 * styled-jsx does not scope child COMPONENTS, only DOM elements.
 *
 * Found 2026-08-20 in production: the queue rows rendered
 * "ABIDING IN HIS PRESENCEDay 2" on one line, because `.lsn-text` is a
 * `next/link` <Link>. styled-jsx appends its `jsx-<hash>` class to elements it
 * emits itself; it cannot know that <Link> forwards `className`, so the anchor
 * ships as `class="lsn-text"` with no scope class and the rule
 * `.lsn-text.jsx-<hash>` never matches. The declaration is right there in the
 * file and does nothing.
 *
 * The class-presence test above cannot catch this — the class IS styled, the
 * rule just cannot match. Styling a component through styled-jsx requires
 * `:global(...)`, ideally under a scoped ancestor so it does not leak.
 */
describe('classes on child components are reachable', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/audio/AudioDrawer.tsx'),
    'utf8',
  )
  const split = source.indexOf('<style jsx>')
  const markup = source.slice(0, split)
  const css = source.slice(split)

  it('styles every component-borne lsn- class through :global()', () => {
    // className on a capitalised JSX tag — a component, not a DOM element.
    const onComponents = [
      ...markup.matchAll(/<[A-Z][A-Za-z]*[^>]*className="([^"]*)"/g),
    ].flatMap((m) => m[1].match(/lsn-[a-z0-9-]+/g) ?? [])

    const globals = new Set(
      [...css.matchAll(/:global\(([^)]*)\)/g)].flatMap(
        (m) => m[1].match(/lsn-[a-z0-9-]+/g) ?? [],
      ),
    )

    const unreachable = [...new Set(onComponents)]
      .filter((c) => !globals.has(c))
      .sort()
    expect(unreachable).toEqual([])
  })
})
