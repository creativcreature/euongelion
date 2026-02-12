'use client'

import { useState } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'
import { typographer } from '@/lib/typographer'

interface FaqHoverCardProps {
  question: string
  answer: string
  className?: string
}

export default function FaqHoverCard({
  question,
  answer,
  className = '',
}: FaqHoverCardProps) {
  const [hoverOpen, setHoverOpen] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const { isMobile } = useAnimation()

  const isOpen = isMobile ? tapOpen : hoverOpen

  return (
    <article
      className={`faq-hover-card ${isOpen ? 'is-open' : ''} ${className}`.trim()}
      onMouseEnter={() => {
        if (!isMobile) setHoverOpen(true)
      }}
      onMouseLeave={() => {
        if (!isMobile) setHoverOpen(false)
      }}
      onFocusCapture={() => {
        if (!isMobile) setHoverOpen(true)
      }}
      onBlurCapture={(event) => {
        if (!isMobile && !event.currentTarget.contains(event.relatedTarget)) {
          setHoverOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="faq-hover-trigger"
        aria-expanded={isOpen}
        onClick={() => {
          if (isMobile) setTapOpen((prev) => !prev)
        }}
      >
        <h3 className="vw-body faq-question">{typographer(question)}</h3>
        <p className="vw-small faq-answer type-prose">{typographer(answer)}</p>
      </button>
    </article>
  )
}
