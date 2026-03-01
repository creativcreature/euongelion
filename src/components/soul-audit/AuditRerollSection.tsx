'use client'

import FadeIn from '@/components/motion/FadeIn'

type AuditRerollSectionProps = {
  rerollsRemaining: number
  rerollUsed: boolean
  isRerolling: boolean
  submitting: boolean
  onReroll: () => void
}

export default function AuditRerollSection({
  rerollsRemaining,
  rerollUsed,
  isRerolling,
  submitting,
  onReroll,
}: AuditRerollSectionProps) {
  return (
    <FadeIn>
      <section
        className="mb-7 border p-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label vw-small text-gold">REROLL</p>
          <p className="vw-small text-muted">{rerollsRemaining}/1 left</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="cta-major text-label vw-small px-4 py-2 disabled:opacity-50"
            onClick={onReroll}
            disabled={rerollUsed || isRerolling || submitting}
            title="Reroll discards the current five options and gives you one new set."
          >
            {isRerolling
              ? 'Rerolling...'
              : rerollUsed
                ? 'Reroll Used'
                : 'Reroll Options'}
          </button>
          <p className="vw-small text-secondary">One reroll per audit run.</p>
        </div>
      </section>
    </FadeIn>
  )
}
