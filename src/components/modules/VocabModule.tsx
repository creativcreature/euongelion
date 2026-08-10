'use client'

import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import GoldHighlight from '@/components/motion/GoldHighlight'

/**
 * Editorial word note.
 *
 * Founder direction 2026-07-28: the reading felt "disjointed" and "school-booky"
 * because of how the vocabulary sat on the page. This module used to render a
 * dictionary entry in the middle of an essay — a GREEK label beside a Strong's
 * catalog number, a 6rem headword, a bracketed pronunciation respelling, then a
 * ruled WORD BY WORD interlinear table and a RELATED list, each under its own
 * shouted sublabel. Six pieces of lexicon furniture between the scripture and
 * the first line of writing.
 *
 * It is now set as a magazine sidenote: hairline rule, the word at reading
 * scale, the gloss as the lead line, and the interlinear and cognates as quiet
 * flowing text rather than tables and labels. Strong's numbers stay in the data
 * (the JSON contract still requires them) but are concordance catalog ids, not
 * reader-facing copy.
 *
 * Project rule preserved: Greek/Hebrew never appears without its transliteration
 * alongside it — both at the headword and in the word-by-word line.
 */
export default function VocabModule({ module }: { module: Module }) {
  if (!module.word && !module.definition) return null

  const languageLabel =
    module.language === 'greek'
      ? 'GREEK'
      : module.language === 'hebrew'
        ? 'HEBREW'
        : 'WORD STUDY'

  return (
    <aside className="word-note" aria-label={`Word note: ${module.word ?? ''}`}>
      <p className="text-label vw-small mb-3 text-gold">{languageLabel}</p>

      {module.word && (
        <p className="word-note-headword">
          <GoldHighlight>{module.word}</GoldHighlight>
          {module.transliteration && (
            <span className="word-note-translit">{module.transliteration}</span>
          )}
        </p>
      )}

      {module.pronunciation && (
        <p className="word-note-pronunciation vw-small text-muted">
          {module.pronunciation}
        </p>
      )}

      {/* The gloss is the lead line — what the word means, said once. */}
      {module.definition && (
        <p className="word-note-gloss text-serif-italic vw-body-lg leading-relaxed">
          {typographer(module.definition)}
        </p>
      )}

      {module.usage && (
        <p className="vw-body mb-6 leading-relaxed text-secondary type-prose">
          {typographer(module.usage)}
        </p>
      )}

      {module.usageNote && (
        <p className="vw-body mb-6 italic leading-relaxed text-muted">
          {typographer(module.usageNote)}
        </p>
      )}

      {/* Interlinear as a flowing line, not a ruled table. */}
      {module.wordByWord && module.wordByWord.length > 0 && (
        <p className="word-note-literal vw-small text-muted">
          {module.wordByWord.map((entry, i) => (
            <span key={i} className="word-note-literal-entry">
              <span className="text-serif-italic">{entry.word}</span>{' '}
              <span className="word-note-translit-inline">
                {entry.transliteration}
              </span>{' '}
              <span className="text-secondary">{entry.meaning}</span>
            </span>
          ))}
        </p>
      )}

      {module.relatedWords && module.relatedWords.length > 0 && (
        <p className="word-note-related vw-small text-muted">
          <span className="word-note-related-lead">See also</span>{' '}
          {module.relatedWords.map((rw, i) => (
            <span key={i} className="word-note-literal-entry">
              <span className="text-serif-italic">{rw.word}</span>
              {rw.meaning && (
                <span className="text-muted"> — {rw.meaning}</span>
              )}
            </span>
          ))}
        </p>
      )}
    </aside>
  )
}
