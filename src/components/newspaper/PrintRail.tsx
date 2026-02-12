'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAnimation } from '@/providers/AnimationProvider'

export interface PrintRailItem {
  id: string
  content: ReactNode
}

interface PrintRailProps {
  items: PrintRailItem[]
  ariaLabel: string
  className?: string
  viewportClassName?: string
  itemClassName?: string
  autoRotate?: boolean
  intervalMs?: number
  showControls?: boolean
}

export default function PrintRail({
  items,
  ariaLabel,
  className = '',
  viewportClassName = '',
  itemClassName = '',
  autoRotate = true,
  intervalMs = 5800,
  showControls = true,
}: PrintRailProps) {
  const viewportRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const { shouldAnimate } = useAnimation()

  const total = items.length

  const normalizedItems = useMemo(() => items, [items])

  const goTo = useCallback(
    (targetIndex: number) => {
      if (!total) return
      const next = (targetIndex + total) % total
      const item = itemRefs.current[next]
      if (!item) return

      item.scrollIntoView({
        behavior: shouldAnimate ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center',
      })
      setActiveIndex(next)
    },
    [shouldAnimate, total],
  )

  useEffect(() => {
    if (!autoRotate || isPaused || !shouldAnimate || total <= 1) return

    const timer = window.setInterval(() => {
      goTo(activeIndex + 1)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [
    activeIndex,
    autoRotate,
    goTo,
    intervalMs,
    isPaused,
    shouldAnimate,
    total,
  ])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateNearest = () => {
      const viewportRect = viewport.getBoundingClientRect()
      const viewportCenter = viewportRect.left + viewportRect.width / 2

      let nearestIndex = 0
      let nearestDistance = Number.POSITIVE_INFINITY

      itemRefs.current.forEach((node, index) => {
        if (!node) return
        const rect = node.getBoundingClientRect()
        const center = rect.left + rect.width / 2
        const distance = Math.abs(center - viewportCenter)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = index
        }
      })

      setActiveIndex(nearestIndex)
    }

    const onScroll = () => window.requestAnimationFrame(updateNearest)
    viewport.addEventListener('scroll', onScroll, { passive: true })
    updateNearest()

    return () => viewport.removeEventListener('scroll', onScroll)
  }, [total])

  if (!total) return null

  return (
    <div
      className={`print-rail ${className}`.trim()}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false)
        }
      }}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {showControls && total > 1 && (
        <div className="print-rail-controls">
          <button
            type="button"
            className="print-rail-control"
            onClick={() => goTo(activeIndex - 1)}
            aria-label={`Previous ${ariaLabel} item`}
          >
            &larr;
          </button>
          <button
            type="button"
            className="print-rail-control"
            onClick={() => goTo(activeIndex + 1)}
            aria-label={`Next ${ariaLabel} item`}
          >
            &rarr;
          </button>
        </div>
      )}

      <ul
        ref={viewportRef}
        className={`print-rail-viewport ${viewportClassName}`.trim()}
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            goTo(activeIndex + 1)
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(activeIndex - 1)
          }
        }}
      >
        {normalizedItems.map((item, index) => (
          <li
            key={item.id}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            className={`print-rail-item ${itemClassName}`.trim()}
            aria-current={index === activeIndex}
          >
            {item.content}
          </li>
        ))}
      </ul>

      {total > 1 && (
        <div className="print-rail-dots" aria-hidden="true">
          {normalizedItems.map((item, index) => (
            <span
              key={`dot-${item.id}`}
              className={`print-rail-dot ${index === activeIndex ? 'is-active' : ''}`.trim()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
