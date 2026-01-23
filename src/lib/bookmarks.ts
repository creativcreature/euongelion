'use client';

/**
 * Bookmarks System
 * Save favorite devotionals for quick access
 */

export interface Bookmark {
  slug: string;
  title: string;
  seriesTitle: string;
  createdAt: string;
}

const BOOKMARKS_KEY = 'wakeup_bookmarks';

/**
 * Get all bookmarks
 */
export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading bookmarks:', e);
    return [];
  }
}

/**
 * Check if devotional is bookmarked
 */
export function isBookmarked(slug: string): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.some((b) => b.slug === slug);
}

/**
 * Add bookmark
 */
export function addBookmark(slug: string, title: string, seriesTitle: string): void {
  if (typeof window === 'undefined') return;

  // Don't duplicate
  if (isBookmarked(slug)) return;

  const bookmark: Bookmark = {
    slug,
    title,
    seriesTitle,
    createdAt: new Date().toISOString(),
  };

  const bookmarks = getBookmarks();
  const updated = [...bookmarks, bookmark];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));

  window.dispatchEvent(new CustomEvent('bookmarksUpdated', { detail: { bookmark } }));
}

/**
 * Remove bookmark
 */
export function removeBookmark(slug: string): void {
  if (typeof window === 'undefined') return;

  const bookmarks = getBookmarks();
  const updated = bookmarks.filter((b) => b.slug !== slug);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));

  window.dispatchEvent(new CustomEvent('bookmarksUpdated', { detail: { slug } }));
}

/**
 * Toggle bookmark
 */
export function toggleBookmark(slug: string, title: string, seriesTitle: string): boolean {
  if (isBookmarked(slug)) {
    removeBookmark(slug);
    return false;
  } else {
    addBookmark(slug, title, seriesTitle);
    return true;
  }
}
