'use client'

import type { Bookmark } from '@/types'

const BOOKMARKS_KEY = 'wakeup_bookmarks'

export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().some((b) => b.slug === slug)
}

export function addBookmark(
  slug: string,
  title: string,
  seriesTitle: string,
): void {
  if (typeof window === 'undefined') return
  if (isBookmarked(slug)) return

  const bookmark: Bookmark = {
    slug,
    title,
    seriesTitle,
    createdAt: new Date().toISOString(),
  }

  const updated = [...getBookmarks(), bookmark]
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
  window.dispatchEvent(
    new CustomEvent('bookmarksUpdated', { detail: { bookmark } }),
  )
}

export function removeBookmark(slug: string): void {
  if (typeof window === 'undefined') return
  const updated = getBookmarks().filter((b) => b.slug !== slug)
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
  window.dispatchEvent(
    new CustomEvent('bookmarksUpdated', { detail: { slug } }),
  )
}

export function toggleBookmark(
  slug: string,
  title: string,
  seriesTitle: string,
): boolean {
  if (isBookmarked(slug)) {
    removeBookmark(slug)
    return false
  } else {
    addBookmark(slug, title, seriesTitle)
    return true
  }
}
