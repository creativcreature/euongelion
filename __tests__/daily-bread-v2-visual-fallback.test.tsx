/**
 * Plan §52 and §55 (SA-142 / F-184): every visual degrades to type, and no
 * public render depends on an image that is not there.
 *   live frame → static poster → CSS texture → typography
 *   stored plate → (checked at build) → typographic fallback at read time
 */
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PlateImage from '@/components/daily-bread/PlateImage'
import ProceduralScene from '@/components/daily-bread/visual/ProceduralScene'
import { offlineSources } from '@/lib/daily-bread/e2e'
import { buildBaseEdition } from '@/lib/daily-bread/modules/build'
import { scenePosterDots } from '@/lib/daily-bread/visual/poster'
import type { ProceduralSceneId } from '@/lib/daily-bread/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => <img {...(props as object)} />,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('stored images degrade to type (plan §55)', () => {
  it('a strip whose image fails to load prints its own words instead of a broken image', () => {
    const { container } = render(
      <PlateImage
        wrapperClassName="edition-strip-plate"
        fallback={<p className="db2-comic-text">Echo: I prayed for the window seat. Dust: You prayed. I got the middle.</p>}
        src="https://example.test/strip/missing.jpg"
        alt="Echo: I prayed for the window seat. Dust: You prayed. I got the middle."
        width={1512}
        height={745}
      />,
    )
    const img = container.querySelector('img')!
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/I prayed for the window seat/)).toHaveClass('db2-comic-text')
  })

  it('a decorative lead plate that fails simply leaves, and the headline carries the lead', () => {
    const { container } = render(
      <div>
        <PlateImage wrapperClassName="edition-lead-plate" fallback={null} src="https://example.test/plate.webp" alt="" fill />
        <h2>What does it look like to seek first the kingdom?</h2>
      </div>,
    )
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('.edition-lead-plate')).toBeNull()
    expect(screen.getByRole('heading')).toHaveTextContent('seek first the kingdom')
  })

  it('the build never freezes a generated lead plate that is not really there', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    const sources = offlineSources()
    sources.generatedLeadArt = async () => ({
      date: '2026-09-14',
      src: 'https://abc.supabase.co/storage/v1/object/public/edition-assets/lead/2026-09-14.webp',
      width: 1536,
      height: 1024,
      alt: 'A field at dawn',
    }) as never
    const checked: string[] = []
    sources.assetAvailable = async (src) => {
      checked.push(src)
      return false
    }
    const base = await buildBaseEdition('2026-09-14', sources)
    expect(checked.some((s) => s.endsWith('/lead/2026-09-14.webp'))).toBe(true)
    expect(base.lead?.plate?.kind).not.toBe('generated-plate')
    expect(base.assetFallbacks).toContain('lead-plate: generated plate not reachable (2026-09-14.webp)')
  }, 60_000)
})

describe('the scene degrades in four tiers (plan §52)', () => {
  it('a scene this renderer version does not know drops to the CSS texture, never a broken drawing', () => {
    expect(() => scenePosterDots('volcano' as ProceduralSceneId, 1)).toThrow(/unknown scene/)
    const { container } = render(
      <ProceduralScene scene={'volcano' as ProceduralSceneId} renderer="riso" seed={1} label="A mountain at night" />,
    )
    expect(container.querySelector('svg.db2-scene-poster')).toBeNull()
    expect(container.querySelector('.db2-scene-texture')).toHaveAttribute('data-fallback', 'texture')
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('.db2-scene-type')).toHaveTextContent('A mountain at night')
  })

  it('a known scene carries its poster and its typography tier', () => {
    const { container } = render(<ProceduralScene scene="grain" renderer="riso" seed={3} label="Wheat under a low sun" />)
    expect(container.querySelector('svg.db2-scene-poster')).not.toBeNull()
    expect(container.querySelector('.db2-scene-texture')).toBeNull()
    expect(container.querySelector('.db2-scene-type')).toHaveTextContent('Wheat under a low sun')
  })

  it('the stylesheet shows the typography tier and hides the art under forced colours and in print', () => {
    const css = readFileSync(`${process.cwd()}/design-system/daily-bread-v2-visual.css`, 'utf8')
    const block = css.slice(css.indexOf('@media (forced-colors: active), print'))
    expect(block).toMatch(/\.db2-scene-poster,\s*\.db2-scene-canvas,\s*\.db2-scene-texture\s*\{\s*display: none;/)
    expect(block).toMatch(/\.db2-scene-type\s*\{\s*display: block;/)
    expect(css).toMatch(/\.db2-scene-type\s*\{\s*display: none;/)
  })
})
