'use client'

/**
 * The verse unscramble (SA-090 / F-136). Tap words in order to rebuild the
 * verse; a wrong pick shakes and stays. Everything is local state — no
 * network, no persistence, finishable in a minute. The reference is the
 * reveal: it prints only when the verse is complete.
 */
import { useMemo, useState } from 'react'
import type { UnscramblePayload } from '@/lib/edition/kinds'

export default function UnscrambleClient({
  puzzle,
}: {
  puzzle: UnscramblePayload
}) {
  // The bank, in shuffled order. Each entry remembers its true index.
  const bank = useMemo(
    () =>
      puzzle.shuffled.map((trueIdx) => ({
        trueIdx,
        word: puzzle.words[trueIdx],
      })),
    [puzzle],
  )
  const [placed, setPlaced] = useState<number[]>([]) // trueIdx sequence
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)

  const nextNeeded = placed.length
  const done = placed.length === puzzle.words.length

  function pick(bankPos: number) {
    const { trueIdx } = bank[bankPos]
    if (placed.includes(trueIdx)) return
    if (trueIdx === nextNeeded) {
      setPlaced((prev) => [...prev, trueIdx])
      setWrongIdx(null)
    } else {
      setWrongIdx(bankPos)
      // The shake clears itself; state, not setTimeout churn on unmount.
      window.setTimeout(
        () => setWrongIdx((w) => (w === bankPos ? null : w)),
        400,
      )
    }
  }

  return (
    <div className="puzzle-unscramble">
      <p className="puzzle-built" aria-live="polite">
        {placed.length === 0 ? (
          <span className="puzzle-built-empty">
            Tap the words in order to rebuild the verse.
          </span>
        ) : (
          placed.map((i) => (
            <span key={i} className="puzzle-built-word">
              {puzzle.words[i]}
            </span>
          ))
        )}
      </p>

      {!done && (
        <div className="puzzle-bank">
          {bank.map(({ trueIdx, word }, bankPos) =>
            placed.includes(trueIdx) ? null : (
              <button
                key={bankPos}
                type="button"
                className={`puzzle-word-btn${wrongIdx === bankPos ? ' puzzle-word-wrong' : ''}`}
                onClick={() => pick(bankPos)}
              >
                {word}
              </button>
            ),
          )}
        </div>
      )}

      {done && (
        <p className="puzzle-reveal">
          {puzzle.reference} ({puzzle.translation})
        </p>
      )}
    </div>
  )
}
