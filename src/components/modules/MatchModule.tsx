'use client'

import { useState } from 'react'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function MatchModule({ module }: { module: Module }) {
  const pairs = module.pairs
  const [selected, setSelected] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrongPair, setWrongPair] = useState<number | null>(null)

  if (!pairs || pairs.length === 0) return null

  const allMatched = matched.size === pairs.length

  function handleSelect(index: number) {
    if (matched.has(index)) return

    if (selected === null) {
      setSelected(index)
      setWrongPair(null)
    } else if (selected === index) {
      setSelected(null)
    } else {
      // Check if these two form a correct pair
      const a = pairs![selected]
      const b = pairs![index]
      if (a.matchId === b.matchId) {
        setMatched((prev) => new Set([...prev, selected, index]))
        setSelected(null)
      } else {
        setWrongPair(index)
        setTimeout(() => {
          setSelected(null)
          setWrongPair(null)
        }, 800)
      }
    }
  }

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'MATCH'}
      </p>

      {module.instruction && (
        <p className="vw-body leading-relaxed text-secondary mb-8">
          {typographer(module.instruction)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {pairs.map((item, i) => {
          const isMatched = matched.has(i)
          const isSelected = selected === i
          const isWrong = wrongPair === i

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isMatched}
              className="px-6 py-4 text-left vw-body transition-all duration-300"
              style={{
                borderBottom: `1px solid ${
                  isMatched
                    ? 'var(--color-success)'
                    : isWrong
                      ? 'var(--color-error)'
                      : isSelected
                        ? 'var(--color-gold)'
                        : 'var(--color-border)'
                }`,
                opacity: isMatched ? 0.5 : 1,
              }}
            >
              {typographer(item.text)}
            </button>
          )
        })}
      </div>

      {allMatched && (
        <p className="mt-8 text-serif-italic vw-body text-gold text-center">
          All matched.
        </p>
      )}
    </div>
  )
}
