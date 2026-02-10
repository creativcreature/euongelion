'use client'

import { useState, useCallback } from 'react'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function OrderModule({ module }: { module: Module }) {
  const items = module.orderItems
  const [userOrder, setUserOrder] = useState<number[]>(() =>
    items ? items.map((_, i) => i) : [],
  )
  const [revealed, setRevealed] = useState(false)

  const moveUp = useCallback(
    (pos: number) => {
      if (pos === 0 || revealed) return
      setUserOrder((prev) => {
        const next = [...prev]
        ;[next[pos - 1], next[pos]] = [next[pos], next[pos - 1]]
        return next
      })
    },
    [revealed],
  )

  const moveDown = useCallback(
    (pos: number) => {
      if (!items || pos === items.length - 1 || revealed) return
      setUserOrder((prev) => {
        const next = [...prev]
        ;[next[pos], next[pos + 1]] = [next[pos + 1], next[pos]]
        return next
      })
    },
    [revealed, items],
  )

  if (!items || items.length === 0) return null

  const isCorrect =
    revealed &&
    userOrder.every((idx, pos) => items[idx].correctPosition === pos)

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'PUT IN ORDER'}
      </p>

      {module.instruction && (
        <p className="vw-body leading-relaxed text-secondary mb-8">
          {typographer(module.instruction)}
        </p>
      )}

      <div className="space-y-2">
        {userOrder.map((itemIdx, pos) => {
          const item = items[itemIdx]
          const isInCorrectPosition = revealed && item.correctPosition === pos

          return (
            <div
              key={itemIdx}
              className="flex items-center gap-4 px-6 py-4 transition-all duration-300"
              style={{
                borderBottom: `1px solid ${
                  revealed
                    ? isInCorrectPosition
                      ? 'var(--color-success)'
                      : 'var(--color-error)'
                    : 'var(--color-border)'
                }`,
              }}
            >
              {!revealed && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(pos)}
                    className="vw-small text-muted hover:text-gold transition-colors"
                    aria-label="Move up"
                  >
                    &uarr;
                  </button>
                  <button
                    onClick={() => moveDown(pos)}
                    className="vw-small text-muted hover:text-gold transition-colors"
                    aria-label="Move down"
                  >
                    &darr;
                  </button>
                </div>
              )}
              <p className="vw-body leading-relaxed">
                {typographer(item.text)}
              </p>
            </div>
          )
        })}
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-8 text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
        >
          Check Order &rarr;
        </button>
      ) : (
        <p className="mt-8 text-serif-italic vw-body text-center">
          {isCorrect ? (
            <span className="text-gold">Correct order.</span>
          ) : (
            <span className="text-secondary">
              {typographer(
                module.explanation ||
                  'Not quite. Try reviewing the passage again.',
              )}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
