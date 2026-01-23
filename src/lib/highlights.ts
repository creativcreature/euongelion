'use client';

/**
 * Text Highlighting System
 * Allows users to highlight passages as they read
 */

export interface Highlight {
  id: string;
  devotionalSlug: string;
  text: string;
  color: string;
  createdAt: string;
  panelNumber?: number;
}

const HIGHLIGHTS_KEY = 'wakeup_highlights';

/**
 * Get all highlights from localStorage
 */
export function getHighlights(): Highlight[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HIGHLIGHTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading highlights:', e);
    return [];
  }
}

/**
 * Get highlights for a specific devotional
 */
export function getDevotionalHighlights(devotionalSlug: string): Highlight[] {
  const highlights = getHighlights();
  return highlights.filter((h) => h.devotionalSlug === devotionalSlug);
}

/**
 * Add a new highlight
 */
export function addHighlight(
  devotionalSlug: string,
  text: string,
  color: string = 'yellow',
  panelNumber?: number
): Highlight {
  if (typeof window === 'undefined') throw new Error('Window not available');

  const highlight: Highlight = {
    id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    devotionalSlug,
    text,
    color,
    createdAt: new Date().toISOString(),
    panelNumber,
  };

  const highlights = getHighlights();
  const updated = [...highlights, highlight];
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));

  // Dispatch event
  window.dispatchEvent(new CustomEvent('highlightsUpdated', { detail: { highlight } }));

  return highlight;
}

/**
 * Remove a highlight
 */
export function removeHighlight(highlightId: string): void {
  if (typeof window === 'undefined') return;

  const highlights = getHighlights();
  const updated = highlights.filter((h) => h.id !== highlightId);
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));

  window.dispatchEvent(new CustomEvent('highlightsUpdated', { detail: { highlightId } }));
}

/**
 * Clear all highlights for a devotional
 */
export function clearDevotionalHighlights(devotionalSlug: string): void {
  if (typeof window === 'undefined') return;

  const highlights = getHighlights();
  const updated = highlights.filter((h) => h.devotionalSlug !== devotionalSlug);
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));

  window.dispatchEvent(new CustomEvent('highlightsUpdated', { detail: {} }));
}

/**
 * Check if text is highlighted
 */
export function isTextHighlighted(devotionalSlug: string, text: string): Highlight | null {
  const highlights = getDevotionalHighlights(devotionalSlug);
  return highlights.find((h) => h.text === text) || null;
}
