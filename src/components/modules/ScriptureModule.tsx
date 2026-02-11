'use client'

import type { Module } from '@/types'
import { useSettingsStore } from '@/stores/settingsStore'
import { typographer } from '@/lib/typographer'

/**
 * Determine layout variant based on passage length.
 * Short → asymmetric tension (reference + passage side by side)
 * Medium → scale contrast (massive reference, passage below)
 * Long → full-width immersive (passage fills the width)
 */
function getVariant(passage: string): 'asymmetric' | 'scale' | 'fullwidth' {
  const len = passage?.length || 0
  if (len < 150) return 'asymmetric'
  if (len < 400) return 'scale'
  return 'fullwidth'
}

/**
 * Highlight emphasis words within passage text with gold shimmer.
 */
function highlightEmphasis(
  passage: string,
  emphasis?: string[],
): React.ReactNode {
  if (!emphasis || emphasis.length === 0) return typographer(passage)

  const escaped = emphasis.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = passage.split(regex)

  return parts.map((part, i) => {
    const isEmphasis = emphasis.some(
      (e) => e.toLowerCase() === part.toLowerCase(),
    )
    if (isEmphasis) {
      return (
        <span key={i} className="gold-shimmer" style={{ fontWeight: 600 }}>
          {part}
        </span>
      )
    }
    return typographer(part)
  })
}

export default function ScriptureModule({ module }: { module: Module }) {
  const { bibleTranslation } = useSettingsStore()

  if (!module.passage && !module.reference) return null

  const displayTranslation = module.translation || bibleTranslation
  const passage = module.passage || ''
  const variant = getVariant(passage)

  return (
    <div className="my-16 md:my-24">
      {variant === 'asymmetric' && (
        <AsymmetricVariant
          module={module}
          passage={passage}
          translation={displayTranslation}
        />
      )}
      {variant === 'scale' && (
        <ScaleVariant
          module={module}
          passage={passage}
          translation={displayTranslation}
        />
      )}
      {variant === 'fullwidth' && (
        <FullwidthVariant
          module={module}
          passage={passage}
          translation={displayTranslation}
        />
      )}

      {/* Greek/Hebrew original — shared across variants */}
      {module.greekOriginal && (
        <p className="mt-6 text-serif-italic vw-small text-muted">
          {module.greekOriginal}
        </p>
      )}
      {module.hebrewOriginal && (
        <p
          className="mt-4 vw-small text-muted"
          style={{ fontFamily: 'var(--font-hebrew, serif)' }}
        >
          {module.hebrewOriginal}
        </p>
      )}

      {/* Scripture context */}
      {module.scriptureContext && (
        <p className="mt-8 vw-body leading-relaxed text-secondary">
          {typographer(module.scriptureContext)}
        </p>
      )}
    </div>
  )
}

/**
 * Short passage: reference and passage side by side.
 * Asymmetric grid — reference pinned right, passage flows left.
 */
function AsymmetricVariant({
  module,
  passage,
  translation,
}: {
  module: Module
  passage: string
  translation: string
}) {
  return (
    <div className="grid gap-8 md:grid-cols-12">
      <div className="md:col-span-8">
        {module.heading && (
          <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
        )}
        <blockquote>
          <p className="text-serif-italic vw-body-lg leading-relaxed">
            {highlightEmphasis(passage, module.emphasis)}
          </p>
        </blockquote>
      </div>
      <div className="flex items-end md:col-span-4 md:justify-end">
        {module.reference && (
          <p className="text-label vw-small text-muted">
            {module.reference}
            {translation && ` (${translation})`}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Medium passage: massive reference as background element,
 * passage below in comfortable reading size.
 * Scale + Font Pairing — wine-label aesthetic.
 */
function ScaleVariant({
  module,
  passage,
  translation,
}: {
  module: Module
  passage: string
  translation: string
}) {
  // Extract book name for massive display
  const bookName = module.reference?.split(/\s+\d/)?.[0] || ''

  return (
    <div className="relative">
      {/* Massive background reference — decorative */}
      {bookName && (
        <div
          className="pointer-events-none select-none"
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(4rem, 12vw, 10rem)',
            fontWeight: 400,
            lineHeight: 0.85,
            color: 'var(--color-gold)',
            opacity: 0.08,
            marginBottom: '-0.3em',
          }}
        >
          {bookName}
        </div>
      )}

      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}

      {/* Passage — the main event */}
      <blockquote style={{ maxWidth: '680px' }}>
        <p className="text-serif-italic vw-heading-sm leading-relaxed">
          {highlightEmphasis(passage, module.emphasis)}
        </p>
      </blockquote>

      {/* Reference + translation */}
      {module.reference && (
        <p className="mt-6 text-label vw-small text-muted">
          {module.reference}
          {translation && ` (${translation})`}
        </p>
      )}

      {/* Emphasis tags */}
      {module.emphasis && module.emphasis.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {module.emphasis.map((word, i) => (
            <span
              key={i}
              className="vw-small italic"
              style={{
                color: 'var(--color-gold)',
                opacity: 0.7,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Long passage: full-width immersive reading.
 * Surface background, generous padding, large serif.
 */
function FullwidthVariant({
  module,
  passage,
  translation,
}: {
  module: Module
  passage: string
  translation: string
}) {
  return (
    <div
      className="-mx-6 px-6 py-12 md:-mx-16 md:px-16 md:py-16 lg:-mx-24 lg:px-24"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {module.heading && (
        <p className="text-label vw-small mb-8 text-gold">{module.heading}</p>
      )}

      <blockquote style={{ maxWidth: '720px' }}>
        <p className="text-serif-italic vw-body-lg leading-loose">
          {highlightEmphasis(passage, module.emphasis)}
        </p>
      </blockquote>

      {module.reference && (
        <p className="mt-8 text-label vw-small text-muted">
          {module.reference}
          {translation && ` (${translation})`}
        </p>
      )}

      {module.emphasis && module.emphasis.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {module.emphasis.map((word, i) => (
            <span
              key={i}
              className="vw-small italic"
              style={{ color: 'var(--color-gold)', opacity: 0.7 }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
