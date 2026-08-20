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
