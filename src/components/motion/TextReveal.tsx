'use client'

import { useEffect, type ReactNode } from 'react'
import { splitIntoWords } from '@/lib/split-text'
import { useSplitTextReveal } from '@/hooks/useSplitTextReveal'

interface TextRevealProps {
  /** The text to reveal word-by-word */
  text: string
  /** Element tag for the container */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  /** CSS class on the container */
  className?: string
  /** CSS class on each word span */
  wordClassName?: string
  /** Additional children after the split text */
  children?: ReactNode
}

/**
 * Word-by-word text reveal on scroll.
 * Uses React-native splitting (not GSAP SplitText).
 * Accessible: aria-label on container, aria-hidden on word spans.
 */
export default function TextReveal({
  text,
  as: Tag = 'h2',
  className = '',
  wordClassName = '',
  children,
}: TextRevealProps) {
  const { containerRef, onReady } = useSplitTextReveal()

  useEffect(() => {
    onReady()
  }, [onReady])

  const words = splitIntoWords(text, { className: wordClassName })

  return (
    <Tag
      ref={containerRef as React.Ref<HTMLHeadingElement>}
      className={className}
      aria-label={text}
    >
      {words}
      {children}
    </Tag>
  )
}
