'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import ArtworkAttribution from '@/components/ArtworkAttribution'
import type { ArtworkEntry } from '@/data/artwork-manifest'

interface ArtworkLightboxProps {
  artwork: ArtworkEntry | null
  isOpen: boolean
  currentIndex: number
  total: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

/**
 * ArtworkLightbox — full-screen gallery overlay with museum card attribution.
 *
 * Features:
 * - Dark/light image switching via CSS
 * - Full attribution (museum card) below image
 * - Arrow key navigation, Escape to close
 * - Swipe support on touch devices
 * - Focus trap + body scroll lock
 */
export default function ArtworkLightbox({
  artwork,
  isOpen,
  currentIndex,
  total,
  onClose,
  onNext,
  onPrev,
}: ArtworkLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowRight':
          onNext()
          break
        case 'ArrowLeft':
          onPrev()
          break
      }
    },
    [isOpen, onClose, onNext, onPrev],
  )

  // Body scroll lock + keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Focus trap: focus overlay on open
  useEffect(() => {
    if (isOpen && overlayRef.current) {
      overlayRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen || !artwork) return null

  return (
    <div
      ref={overlayRef}
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Gallery: ${artwork.title}`}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const diff = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(diff) > 50) {
          if (diff < 0) onNext()
          else onPrev()
        }
      }}
    >
      {/* Close button */}
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close gallery"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="lightbox-counter">
          {currentIndex + 1} of {total}
        </div>
      )}

      {/* Previous button */}
      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          aria-label="Previous artwork"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div className="lightbox-image-wrap">
        <div className="lightbox-image-container">
          <Image
            src={artwork.rawSrc}
            alt={`${artwork.title} by ${artwork.artist}`}
            fill
            sizes="(max-width: 900px) 90vw, 900px"
            className="lightbox-img"
            priority
          />
        </div>

        {/* Full museum card attribution */}
        <ArtworkAttribution
          artwork={artwork}
          variant="full"
          className="lightbox-attribution"
        />
      </div>

      {/* Next button */}
      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          aria-label="Next artwork"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  )
}
