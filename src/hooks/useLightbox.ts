'use client'

import { useCallback, useState } from 'react'
import type { ArtworkEntry } from '@/data/artwork-manifest'

interface LightboxState {
  isOpen: boolean
  currentIndex: number
  artworks: ArtworkEntry[]
  open: (artworkSlug: string) => void
  close: () => void
  next: () => void
  prev: () => void
  current: ArtworkEntry | null
  total: number
}

/**
 * useLightbox — manages lightbox gallery state for a set of artworks.
 */
export function useLightbox(artworks: ArtworkEntry[]): LightboxState {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const open = useCallback(
    (artworkSlug: string) => {
      const idx = artworks.findIndex((a) => a.slug === artworkSlug)
      setCurrentIndex(idx >= 0 ? idx : 0)
      setIsOpen(true)
    },
    [artworks],
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % artworks.length)
  }, [artworks.length])

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + artworks.length) % artworks.length)
  }, [artworks.length])

  const current =
    artworks.length > 0 && currentIndex < artworks.length
      ? artworks[currentIndex]
      : null

  return {
    isOpen,
    currentIndex,
    artworks,
    open,
    close,
    next,
    prev,
    current,
    total: artworks.length,
  }
}
