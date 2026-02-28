'use client'

import FadeIn from '@/components/motion/FadeIn'
import { typographer } from '@/lib/typographer'
import { clampScriptureSnippet } from '@/lib/scripture-reference'

type SavedOption = {
  id: string
  auditRunId: string
  kind: 'ai_primary' | 'ai_generative' | 'curated_prefab'
  title: string
  question: string
  reasoning: string
  verse?: string
  verseText?: string
  paragraph?: string
  savedAt: string
}

type SavedPathsListProps = {
  savedOptions: SavedOption[]
  hasStaleOptions: boolean
  message: string | null
  onRemove: (id: string) => void
  onClean: () => void
}

function resolveVerseSnippet(
  verseText?: string | null,
  paragraph?: string | null,
): string {
  if (typeof verseText === 'string' && verseText.trim().length > 0) {
    return clampScriptureSnippet(verseText)
  }
  if (typeof paragraph === 'string' && paragraph.trim().length > 0) {
    return clampScriptureSnippet(paragraph)
  }
  return ''
}

export default function SavedPathsList({
  savedOptions,
  hasStaleOptions,
  message,
  onRemove,
  onClean,
}: SavedPathsListProps) {
  if (savedOptions.length === 0) return null

  return (
    <FadeIn>
      <section
        className="mb-7 border p-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label vw-small text-gold">SAVED PATHS</p>
          {hasStaleOptions && (
            <button
              type="button"
              className="text-label vw-small link-highlight"
              onClick={onClean}
            >
              Monthly clean house
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          {savedOptions.slice(0, 6).map((saved) => {
            const verseSnippet = resolveVerseSnippet(
              saved.verseText,
              saved.paragraph,
            )

            return (
              <div
                key={`saved-option-${saved.id}`}
                className="border px-3 py-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {saved.verse && (
                    <p className="audit-option-verse w-full">
                      {typographer(saved.verse)}
                    </p>
                  )}
                  {verseSnippet && (
                    <p className="audit-option-verse-snippet w-full">
                      {typographer(verseSnippet)}
                    </p>
                  )}
                  <p className="audit-option-title text-gold">{saved.title}</p>
                  <button
                    type="button"
                    className="audit-option-meta-link link-highlight"
                    onClick={() => onRemove(saved.id)}
                  >
                    Remove
                  </button>
                </div>
                <p className="audit-option-support mt-1 text-secondary">
                  {typographer(saved.question)}
                </p>
              </div>
            )
          })}
        </div>
        {message && <p className="vw-small mt-2 text-muted">{message}</p>}
      </section>
    </FadeIn>
  )
}
