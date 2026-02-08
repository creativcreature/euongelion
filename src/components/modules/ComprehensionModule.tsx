'use client'

import { useState } from 'react'
import type { Module } from '@/types'

export default function ComprehensionModule({ module }: { module: Module }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const isCorrect = selected === module.answer

  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'CHECK YOUR UNDERSTANDING'}
      </p>
      <p className="vw-body-lg mb-8 leading-relaxed">{module.question}</p>

      {module.options && (
        <div className="mb-6 space-y-3">
          {module.options.map((option, i) => (
            <button
              key={i}
              onClick={() => {
                if (!revealed) {
                  setSelected(i)
                  setRevealed(true)
                }
              }}
              disabled={revealed}
              className="block w-full px-6 py-4 text-left vw-body transition-all duration-300"
              style={{
                border: `1px solid ${
                  revealed && i === module.answer
                    ? 'var(--color-success)'
                    : revealed && i === selected && !isCorrect
                      ? 'var(--color-error)'
                      : selected === i
                        ? 'var(--color-gold)'
                        : 'var(--color-border)'
                }`,
                backgroundColor:
                  revealed && i === module.answer
                    ? 'rgba(74, 107, 79, 0.1)'
                    : 'transparent',
                transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {revealed && module.explanation && (
        <p className="vw-body leading-relaxed text-secondary">
          {module.explanation}
        </p>
      )}
    </div>
  )
}
