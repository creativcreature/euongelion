'use client'

import { useState, useEffect, useCallback } from 'react'

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  xlarge: 'text-xl',
}

const fontSizePixels: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium')

  useEffect(() => {
    const stored = localStorage.getItem('fontSize') as FontSize | null
    if (stored && fontSizeClasses[stored]) {
      setFontSizeState(stored)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--reading-font-size', `${fontSizePixels[fontSize]}px`)
  }, [fontSize])

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem('fontSize', size)
  }, [])

  const increase = useCallback(() => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge']
    const currentIndex = sizes.indexOf(fontSize)
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1])
    }
  }, [fontSize, setFontSize])

  const decrease = useCallback(() => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge']
    const currentIndex = sizes.indexOf(fontSize)
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1])
    }
  }, [fontSize, setFontSize])

  return {
    fontSize,
    setFontSize,
    increase,
    decrease,
    className: fontSizeClasses[fontSize],
    pixels: fontSizePixels[fontSize],
  }
}
