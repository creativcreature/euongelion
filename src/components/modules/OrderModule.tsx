'use client'

import { useState, useCallback } from 'react'

interface OrderModuleProps {
  data: {
    title?: string
    instructions?: string
    items: string[]
  }
}

export default function OrderModule({ data }: OrderModuleProps) {
  // Create shuffled initial order
  const [order, setOrder] = useState<number[]>(() => {
    const indices = data.items.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  })
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...order]
    const [removed] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, removed)
    setOrder(newOrder)
    setIsChecked(false)
  }, [order])

  const checkOrder = () => {
    const correct = order.every((itemIndex, position) => itemIndex === position)
    setIsChecked(true)
    setIsComplete(correct)
  }

  const reset = () => {
    const indices = data.items.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    setOrder(indices)
    setIsChecked(false)
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
        {data.instructions || 'Drag items to arrange them in the correct order.'}
      </p>
      
      <div className="space-y-2">
        {order.map((itemIndex, position) => (
          <div
            key={itemIndex}
            draggable
            onDragStart={() => setDraggingIndex(position)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingIndex !== null) {
                moveItem(draggingIndex, position)
                setDraggingIndex(null)
              }
            }}
            className={`p-4 rounded-lg cursor-move flex items-center gap-3 transition ${
              isChecked && itemIndex === position
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                : isChecked && itemIndex !== position
                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                : 'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700'
            } border border-stone-200 dark:border-stone-600`}
          >
            <span className="text-stone-400 dark:text-stone-500 text-sm font-mono">
              {position + 1}
            </span>
            <span className="text-stone-700 dark:text-stone-200">
              {data.items[itemIndex]}
            </span>
            <span className="ml-auto text-stone-300 dark:text-stone-600">
              ⋮⋮
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={checkOrder}
          disabled={isComplete}
          className="px-4 py-2 bg-[#c19a6b] text-white rounded-lg hover:bg-[#a88756] transition disabled:opacity-50"
        >
          Check Order
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition"
        >
          Reset
        </button>
      </div>
      
      {isComplete && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✓ Perfect! That's the correct order.
          </p>
        </div>
      )}
    </div>
  )
}
