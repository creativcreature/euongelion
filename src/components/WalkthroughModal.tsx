'use client'

import { useMemo, useState } from 'react'

type WalkthroughStep = {
  title: string
  body: string
}

export default function WalkthroughModal({
  open,
  steps,
  onClose,
}: {
  open: boolean
  steps: WalkthroughStep[]
  onClose: (completed: boolean) => void
}) {
  const [stepIndex, setStepIndex] = useState(0)

  const total = steps.length
  const activeStep = useMemo(
    () => steps[Math.min(stepIndex, Math.max(0, total - 1))],
    [stepIndex, steps, total],
  )

  if (!open || total === 0 || !activeStep) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Guided walkthrough"
    >
      <section className="w-full max-w-xl border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-5 md:p-6">
        <p className="text-label vw-small text-gold">
          STEP {stepIndex + 1} / {total}
        </p>
        <h2 className="vw-heading-sm mt-2">{activeStep.title}</h2>
        <p className="vw-body mt-3 text-secondary">{activeStep.body}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={() => onClose(false)}
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
              onClick={() => {
                if (stepIndex >= total - 1) {
                  onClose(true)
                  return
                }
                setStepIndex((index) => Math.min(total - 1, index + 1))
              }}
            >
              {stepIndex >= total - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
