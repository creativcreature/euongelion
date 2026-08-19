'use client'

/**
 * "Where is this from?" (SA-090 / F-136). Three questions, four references
 * each. Answer locks on first pick; the score line prints when all three are
 * answered. Local state only.
 */
import { useState } from 'react'
import type { QuizPayload } from '@/lib/edition/kinds'

export default function QuizClient({
  questions,
}: {
  questions: QuizPayload[]
}) {
  const [picks, setPicks] = useState<(number | null)[]>(
    questions.map(() => null),
  )

  const answered = picks.filter((p) => p !== null).length
  const correct = picks.filter((p, i) => p === questions[i].answerIndex).length
  const done = answered === questions.length

  function pick(q: number, opt: number) {
    setPicks((prev) => {
      if (prev[q] !== null) return prev
      const next = [...prev]
      next[q] = opt
      return next
    })
  }

  return (
    <div className="puzzle-quiz">
      {questions.map((q, qi) => {
        const picked = picks[qi]
        return (
          <div key={qi} className="puzzle-quiz-q">
            <blockquote className="puzzle-quiz-text">
              &ldquo;{q.text}&rdquo;
            </blockquote>
            <div className="puzzle-quiz-opts">
              {q.options.map((opt, oi) => {
                const isPick = picked === oi
                const isAnswer = oi === q.answerIndex
                const cls = [
                  'puzzle-quiz-opt',
                  picked !== null && isAnswer ? 'puzzle-quiz-right' : '',
                  picked !== null && isPick && !isAnswer
                    ? 'puzzle-quiz-wrong'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={oi}
                    type="button"
                    className={cls}
                    disabled={picked !== null}
                    onClick={() => pick(qi, oi)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {done && (
        <p className="puzzle-score" aria-live="polite">
          {correct} of {questions.length}
          {correct === questions.length
            ? ' — a scribe.'
            : correct === 0
              ? ' — the concordance forgives.'
              : ' — worth a second reading.'}
        </p>
      )}
    </div>
  )
}
