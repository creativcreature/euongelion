'use client'

import { useState } from 'react'

interface RevealModuleProps {
  data: {
    title?: string
    prompt: string
    hint?: string
    answer: string
    explanation?: string
  }
}

export default function RevealModule({ data }: RevealModuleProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [userGuess, setUserGuess] = useState('')
  const [showHint, setShowHint] = useState(false)

  const handleReveal = () => {
    setIsRevealed(true)
  }

  const isCorrect = userGuess.toLowerCase().trim() === data.answer.toLowerCase().trim()

  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      {data.title && (
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          {data.title}
        </h3>
      )}
      
      <p className="text-stone-700 dark:text-stone-200 mb-4">{data.prompt}</p>
      
      {!isRevealed ? (
        <>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400"
            />
          </div>
          
          {data.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-sm text-[#c19a6b] hover:underline mb-4 block"
            >
              {showHint ? 'Hide hint' : 'Need a hint?'}
            </button>
          )}
          
          {showHint && data.hint && (
            <p className="text-sm text-stone-500 dark:text-stone-400 italic mb-4 p-3 bg-[#c19a6b]/10 rounded-lg">
              💡 {data.hint}
            </p>
          )}
          
          <button
            onClick={handleReveal}
            className="px-6 py-3 bg-[#c19a6b] text-white rounded-lg hover:bg-[#a88756] transition font-medium"
          >
            Reveal Answer
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {userGuess && (
            <div className={`p-4 rounded-lg ${
              isCorrect 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            }`}>
              <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Your answer:</p>
              <p className={`text-lg ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {userGuess} {isCorrect ? '✓' : ''}
              </p>
            </div>
          )}
          
          <div className="p-4 bg-[#c19a6b]/10 rounded-lg border border-[#c19a6b]/30">
            <p className="text-sm font-medium text-[#c19a6b] mb-1">Answer:</p>
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {data.answer}
            </p>
          </div>
          
          {data.explanation && (
            <div className="p-4 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
              <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                {data.explanation}
              </p>
            </div>
          )}
          
          <button
            onClick={() => {
              setIsRevealed(false)
              setUserGuess('')
              setShowHint(false)
            }}
            className="text-sm text-[#c19a6b] hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
