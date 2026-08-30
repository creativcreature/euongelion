'use client'

import { DIVINE_NAMES } from '@/data/who-is-god-names'
import StickyStepper from './StickyStepper'

/**
 * Room 03 — the names.
 *
 * Apple's `scroll-group` pattern: one thing pinned in the viewport, scroll
 * position deciding which state of it you are looking at. Here the pinned thing
 * is the Hebrew itself, at display scale — the letterform is the visual, so it
 * needs no illustration behind it.
 *
 * The Hebrew is never unpaired with its transliteration (devo-go guardrail), and
 * every name carries the moment it was given rather than a definition, because
 * these are mostly what people called God after he turned up rather than titles
 * theologians invented.
 */
export default function NameStage() {
  const steps = DIVINE_NAMES.map((n) => ({
    key: n.id,
    node: (
      <article className="wig-name-step">
        <p className="wig-name-translit">{n.translit}</p>
        <p className="wig-name-gloss">{n.gloss}</p>
        <p className="wig-name-note">{n.note}</p>
        <figure className="wig-scripture">
          <blockquote>{n.verse.text}</blockquote>
          <figcaption>{n.verse.ref}</figcaption>
        </figure>
      </article>
    ),
  }))

  return (
    <StickyStepper
      className="wig-names-stepper"
      steps={steps}
      stage={(activeKey) => {
        const n =
          DIVINE_NAMES.find((x) => x.id === activeKey) ?? DIVINE_NAMES[0]
        return (
          <div className="wig-name-stage">
            <p className="wig-name-heb" lang="he" dir="rtl">
              {n.hebrew}
            </p>
            <p className="wig-name-stage-translit">{n.translit}</p>
          </div>
        )
      }}
      stageLabel="The name currently being read, in Hebrew"
    />
  )
}
