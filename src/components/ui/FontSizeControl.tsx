'use client'

import { useFontSize, type FontSize } from '@/lib/use-font-size'

export function FontSizeControl() {
  const { fontSize, setFontSize } = useFontSize()

  const sizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'A' },
    { value: 'medium', label: 'A' },
    { value: 'large', label: 'A' },
    { value: 'xlarge', label: 'A' },
  ]

  return (
    <div className="flex items-center gap-1">
      {sizes.map((size, index) => (
        <button
          key={size.value}
          onClick={() => setFontSize(size.value)}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
            fontSize === size.value
              ? 'bg-[#c19a6b] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-gray-400 hover:text-[#f7f3ed]'
          }`}
          style={{ fontSize: `${12 + index * 2}px` }}
          aria-label={`Set font size to ${size.value}`}
        >
          {size.label}
        </button>
      ))}
    </div>
  )
}

export function FontSizeButtons() {
  const { increase, decrease, fontSize } = useFontSize()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={decrease}
        disabled={fontSize === 'small'}
        className="w-8 h-8 rounded bg-[#1a1a1a] text-gray-400 hover:text-[#f7f3ed] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        aria-label="Decrease font size"
      >
        <span className="text-xs font-bold">A-</span>
      </button>
      <button
        onClick={increase}
        disabled={fontSize === 'xlarge'}
        className="w-8 h-8 rounded bg-[#1a1a1a] text-gray-400 hover:text-[#f7f3ed] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        aria-label="Increase font size"
      >
        <span className="text-lg font-bold">A+</span>
      </button>
    </div>
  )
}
