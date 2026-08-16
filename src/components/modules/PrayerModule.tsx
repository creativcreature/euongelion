'use client'

import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import FadeIn from '@/components/motion/FadeIn'
import JournalField from '@/components/reader/JournalField'

export default function PrayerModule({
  module,
  moduleIndex,
}: {
  module: Module
  /** Position in the day's modules; enables "add your own prayer" (SA-059). */
  moduleIndex?: number
}) {
  const text = module.prayerText || module.content || ''
  if (!text && !module.breathPrayer) return null

  const paragraphs = text ? text.split('\n\n') : []

  return (
    <FadeIn>
      <div className="my-16 text-center md:my-24">
        {/* `prayerType` ("centering", "intercessory", …) is authoring metadata,
            not reader-facing copy — printing it beside the heading rendered a
            literal "(centering)" on the page. The heading carries the voice. */}
        <div className="mb-6 flex items-baseline justify-center gap-3">
          <p className="text-label vw-small text-gold">
            {module.heading || 'PRAYER'}
          </p>
        </div>
        {module.posture && (
          <p className="mb-6 vw-small italic text-muted">
            Posture: {module.posture}
          </p>
        )}
        <div className="mx-auto space-y-6" style={{ maxWidth: '540px' }}>
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-serif-italic vw-body-lg leading-relaxed"
              style={{ letterSpacing: '0.01em' }}
            >
              {typographer(paragraph)}
            </p>
          ))}
        </div>
        {module.breathPrayer && (
          <div className="mt-10">
            <p className="module-sublabel mb-3">BREATH PRAYER</p>
            <p className="text-serif-italic vw-body-lg text-gold breathe-prayer">
              {typographer(module.breathPrayer)}
            </p>
          </div>
        )}

        {/* NOT an answer field. All 543 prayer modules in the catalog pose no
            question — they are prayers to be prayed, and a box labelled "your
            answer" under one misreads the form. Same storage, different
            framing: writing alongside rather than answering. */}
        {typeof moduleIndex === 'number' && (
          <div
            className="mt-10 mx-auto text-left"
            style={{ maxWidth: '540px' }}
          >
            <p className="module-sublabel mb-3">IN YOUR OWN WORDS</p>
            <JournalField
              kind="prayer"
              anchorKey={`m${moduleIndex}:prayer`}
              label="Your own prayer"
              placeholder="Pray it back, in your words…"
              signedOutLabel="Sign in to keep your prayer"
              showNote
            />
          </div>
        )}
      </div>
    </FadeIn>
  )
}
