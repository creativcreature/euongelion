'use client'

import { useEffect, useMemo, useState } from 'react'

export type ReaderSectionAnchor = {
  id: string
  label: string
}

export default function ReaderTimeline({
  anchors,
  className,
}: {
  anchors: ReaderSectionAnchor[]
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const safeAnchors = useMemo(
    () => anchors.filter((anchor) => anchor.id.trim().length > 0),
    [anchors],
  )

  useEffect(() => {
    if (safeAnchors.length === 0) return
    const observed = safeAnchors
      .map((anchor) => document.getElementById(anchor.id))
      .filter((node): node is HTMLElement => Boolean(node))
    if (observed.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        root: null,
        threshold: [0.2, 0.4, 0.7],
        rootMargin: '-25% 0px -55% 0px',
      },
    )

    for (const node of observed) observer.observe(node)

    return () => observer.disconnect()
  }, [safeAnchors])

  if (safeAnchors.length === 0) return null

  return (
    <div className={`reader-timeline ${className ?? ''}`.trim()}>
      {safeAnchors.map((anchor) => {
        const active = activeId === anchor.id
        return (
          <button
            key={anchor.id}
            type="button"
            className={`reader-timeline-item ${active ? 'is-active' : ''}`}
            onClick={() => {
              const target = document.getElementById(anchor.id)
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <span className="reader-timeline-dot" aria-hidden="true" />
            <span className="reader-timeline-label">{anchor.label}</span>
          </button>
        )
      })}
    </div>
  )
}
