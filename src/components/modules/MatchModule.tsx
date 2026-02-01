'use client'

import { useState, useCallback } from 'react'

interface MatchModuleProps {
  data: {
    title?: string
    instructions?: string
    pairs: Array<{
      left: string
      right: string
    }>
  }
}

export default function MatchModule({ data }: MatchModuleProps) {
  const [matches, setMatches] = useState<Record<number, number>>({})
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  
  // Shuffle the right column
  const [shuffledRight] = useState(() => {
    const indices = data.pairs.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  })

  const handleLeftClick = useCallback((index: number) => {
    if (matches[index] !== undefined) return
    setSelectedLeft(index)
  }, [matches])

  const handleRightClick = useCallback((shuffledIndex: number) => {
    if (selectedLeft === null) return
    
    const correctRight = shuffledRight[shuffledIndex]
    
    if (correctRight === selectedLeft) {
      const newMatches = { ...matches, [selectedLeft]: shuffledIndex }
      setMatches(newMatches)
      setSelectedLeft(null)
      
      if (Object.keys(newMatches).length === data.pairs.length) {
        setIsComplete(true)
      }
    } else {
      // Wrong match - brief shake animation handled by CSS
      setSelectedLeft(null)
    }
  }, [selectedLeft, shuffledRight, matches, data.pairs.length])

  const reset = () => {
    setMatches({})
    setSelectedLeft(null)
    setIsComplete(false)
  }

  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      {data.title && (
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
          {data.title}
        </h3>
      )}
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
        {data.instructions || 'Match the items on the left with their corresponding items on the right.'}
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          {data.pairs.map((pair, index) => (
            <button
              key={`left-${index}`}
              onClick={() => handleLeftClick(index)}
              disabled={matches[index] !== undefined}
              className={`w-full p-3 text-left rounded-lg text-sm transition ${
                matches[index] !== undefined
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                  : selectedLeft === index
                  ? 'bg-[#c19a6b] text-white'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
              } border border-stone-200 dark:border-stone-600`}
            >
              {pair.left}
            </button>
          ))}
        </div>
        
        {/* Right column */}
        <div className="space-y-2">
          {shuffledRight.map((originalIndex, shuffledIndex) => (
            <button
              key={`right-${shuffledIndex}`}
              onClick={() => handleRightClick(shuffledIndex)}
              disabled={Object.values(matches).includes(shuffledIndex)}
              className={`w-full p-3 text-left rounded-lg text-sm transition ${
                Object.values(matches).includes(shuffledIndex)
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
              } border border-stone-200 dark:border-stone-600`}
            >
              {data.pairs[originalIndex].right}
            </button>
          ))}
        </div>
      </div>
      
      {isComplete && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✓ All matched correctly!
          </p>
          <button
            onClick={reset}
            className="mt-2 text-sm text-[#c19a6b] hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
