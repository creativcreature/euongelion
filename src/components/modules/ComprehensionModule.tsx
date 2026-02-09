'use client'

import { useState } from 'react'
import type { Module } from '@/types'

export default function ComprehensionModule({ module }: { module: Module }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const isQuizMode = !!module.question && !!module.options
  const isReflectionMode =
    !!module.forReflection || !!module.forAccountabilityPartners

  if (!isQuizMode && !isReflectionMode) return null

  const isCorrect = selected === module.answer

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'CHECK YOUR UNDERSTANDING'}
      </p>

      {isQuizMode && (
        <>
          <p className="vw-body mb-8 leading-relaxed">{module.question}</p>
          {module.options && (
            <div className="mb-8 space-y-3">
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
                    borderBottom: `1px solid ${
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
                        ? 'rgba(74, 107, 79, 0.08)'
                        : 'transparent',
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
        </>
      )}

      {isReflectionMode && (
        <>
          {module.forReflection && module.forReflection.length > 0 && (
            <div className="mb-8">
              <p className="module-sublabel mb-4">FOR REFLECTION</p>
              <ul className="space-y-4">
                {module.forReflection.map((q, i) => (
                  <li
                    key={i}
                    className="text-serif-italic vw-body-lg leading-relaxed"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {module.forAccountabilityPartners &&
            module.forAccountabilityPartners.length > 0 && (
              <div>
                <p className="module-sublabel mb-4">
                  FOR ACCOUNTABILITY PARTNERS
                </p>
                <ul className="space-y-3">
                  {module.forAccountabilityPartners.map((q, i) => (
                    <li
                      key={i}
                      className="vw-body leading-relaxed text-secondary"
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </>
      )}
    </div>
  )
}
