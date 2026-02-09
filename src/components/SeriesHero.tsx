'use client'

import Image from 'next/image'
import { SERIES_DATA } from '@/data/series'

type HeroSize = 'hero' | 'card' | 'thumbnail'

// Visual direction mapping based on pathway
// Direction A (Sacred Chiaroscuro): Tehom → Gold gradient — Sleep pathway
// Direction B (Textured Minimalism): Muted earth tones — Shepherd pathway
// Direction C (Risograph Sacred): Bold geometric — Awake pathway
const GRADIENT_MAP: Record<
  string,
  { bg: string; accent: string; pattern: string }
> = {
  // Wake-Up 7
  identity: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #2a1f1a 40%, #3d2b1f 100%)',
    accent: '#c19a6b',
    pattern: 'radial',
  },
  peace: {
    bg: 'linear-gradient(180deg, #1a1612 0%, #1a2028 50%, #1a1612 100%)',
    accent: '#4a5f6b',
    pattern: 'wave',
  },
  community: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #2a2018 50%, #3d3020 100%)',
    accent: '#6b5a4a',
    pattern: 'grid',
  },
  kingdom: {
    bg: 'linear-gradient(180deg, #1a1612 0%, #2d1f14 50%, #c19a6b 100%)',
    accent: '#c19a6b',
    pattern: 'radial',
  },
  provision: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #2a2418 50%, #3d3520 100%)',
    accent: '#6b6b4f',
    pattern: 'grid',
  },
  truth: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #1e1a28 50%, #2a1f3d 100%)',
    accent: '#6b4a6b',
    pattern: 'radial',
  },
  hope: {
    bg: 'linear-gradient(180deg, #1a1612 0%, #1a1a20 30%, #c19a6b 100%)',
    accent: '#c19a6b',
    pattern: 'wave',
  },
}

// Pathway-based gradients for Substack series
const PATHWAY_GRADIENTS: Record<
  string,
  { bg: string; accent: string; pattern: string }
> = {
  Sleep: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #1a1820 50%, #2a2030 100%)',
    accent: '#4a5f6b',
    pattern: 'wave',
  },
  Awake: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #2d1f14 50%, #3d2b1f 100%)',
    accent: '#c19a6b',
    pattern: 'radial',
  },
  Shepherd: {
    bg: 'linear-gradient(135deg, #1a1612 0%, #2a2418 50%, #3d3520 100%)',
    accent: '#6b6b4f',
    pattern: 'grid',
  },
}

function getGradient(slug: string): {
  bg: string
  accent: string
  pattern: string
} {
  if (GRADIENT_MAP[slug]) return GRADIENT_MAP[slug]

  const series = SERIES_DATA[slug]
  if (series) {
    return PATHWAY_GRADIENTS[series.pathway] || PATHWAY_GRADIENTS['Awake']
  }

  return PATHWAY_GRADIENTS['Awake']
}

const SIZE_CLASSES: Record<HeroSize, string> = {
  hero: 'h-[300px] md:h-[400px]',
  card: 'h-[200px] md:h-[240px]',
  thumbnail: 'h-[120px] md:h-[160px]',
}

export default function SeriesHero({
  seriesSlug,
  size = 'card',
  overlay = false,
  className = '',
}: {
  seriesSlug: string
  size?: HeroSize
  overlay?: boolean
  className?: string
}) {
  const gradient = getGradient(seriesSlug)
  const series = SERIES_DATA[seriesSlug]
  const heroImage = series?.heroImage

  return (
    <div
      className={`relative w-full overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
      style={{ background: gradient.bg }}
    >
      {/* Real image if available */}
      {heroImage && (
        <Image
          src={heroImage}
          alt={series?.title || ''}
          fill
          className="object-cover"
          sizes={
            size === 'hero'
              ? '100vw'
              : size === 'card'
                ? '(max-width: 768px) 100vw, 50vw'
                : '(max-width: 768px) 100vw, 33vw'
          }
        />
      )}

      {/* Pattern overlay (shown behind image as fallback, or alone) */}
      {!heroImage && (
        <>
          {gradient.pattern === 'radial' && (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 70% 30%, ${gradient.accent}15 0%, transparent 60%)`,
              }}
            />
          )}
          {gradient.pattern === 'wave' && (
            <div
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(180deg, transparent 0%, ${gradient.accent}08 50%, transparent 100%),
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 40px,
                    ${gradient.accent}05 40px,
                    ${gradient.accent}05 41px
                  )
                `,
              }}
            />
          )}
          {gradient.pattern === 'grid' && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(${gradient.accent}08 1px, transparent 1px),
                  linear-gradient(90deg, ${gradient.accent}08 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />
          )}

          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />
        </>
      )}

      {/* Readability overlay for text */}
      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            background: heroImage
              ? 'linear-gradient(180deg, rgba(26, 22, 18, 0.3) 0%, rgba(26, 22, 18, 0.7) 100%)'
              : 'linear-gradient(180deg, transparent 30%, rgba(26, 22, 18, 0.6) 100%)',
          }}
        />
      )}
    </div>
  )
}
