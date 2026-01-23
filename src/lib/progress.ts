'use client';

/**
 * Progress Tracking System
 * Tracks which devotionals have been read using localStorage
 */

export interface DevotionalProgress {
  slug: string;
  completedAt: string; // ISO date string
  timeSpent?: number; // seconds
}

const PROGRESS_KEY = 'wakeup_progress';

/**
 * Get all progress from localStorage
 */
export function getProgress(): DevotionalProgress[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading progress:', e);
    return [];
  }
}

/**
 * Check if a specific devotional has been read
 */
export function isDevotionalRead(slug: string): boolean {
  const progress = getProgress();
  return progress.some((p) => p.slug === slug);
}

/**
 * Mark a devotional as complete
 */
export function markDevotionalComplete(slug: string, timeSpent?: number): void {
  if (typeof window === 'undefined') return;

  try {
    const progress = getProgress();

    // Don't duplicate if already marked complete
    if (progress.some((p) => p.slug === slug)) {
      return;
    }

    const newProgress: DevotionalProgress = {
      slug,
      completedAt: new Date().toISOString(),
      timeSpent,
    };

    const updated = [...progress, newProgress];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));

    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { slug } }));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
}

/**
 * Get progress for a specific series
 */
export function getSeriesProgress(seriesSlug: string): {
  completed: number;
  total: number;
  percentage: number;
} {
  const progress = getProgress();
  const seriesDevotionals = getSeries Devotionals(seriesSlug);

  const completed = seriesDevotionals.filter((slug) =>
    progress.some((p) => p.slug === slug)
  ).length;

  return {
    completed,
    total: seriesDevotionals.length,
    percentage: seriesDevotionals.length > 0 ? Math.round((completed / seriesDevotionals.length) * 100) : 0,
  };
}

/**
 * Get overall progress across all series
 */
export function getOverallProgress(): {
  completed: number;
  total: number;
  percentage: number;
} {
  const progress = getProgress();
  const total = 35; // 7 series × 5 days

  return {
    completed: progress.length,
    total,
    percentage: Math.round((progress.length / total) * 100),
  };
}

/**
 * Check if previous devotional in series has been read
 * Used to enforce ordered reading
 */
export function canReadDevotional(slug: string): {
  canRead: boolean;
  reason?: string;
  nextToRead?: string;
} {
  const progress = getProgress();
  const allDevotionals = getAllDevotionalsInOrder();

  const currentIndex = allDevotionals.findIndex((d) => d === slug);

  if (currentIndex === -1) {
    return { canRead: false, reason: 'Devotional not found' };
  }

  // First devotional is always readable
  if (currentIndex === 0) {
    return { canRead: true };
  }

  // Check if all previous devotionals have been read
  const previousDevotionals = allDevotionals.slice(0, currentIndex);
  const unreadPrevious = previousDevotionals.filter((d) => !isDevotionalRead(d));

  if (unreadPrevious.length > 0) {
    return {
      canRead: false,
      reason: 'Please complete previous devotionals first',
      nextToRead: unreadPrevious[0],
    };
  }

  return { canRead: true };
}

/**
 * Clear all progress (for testing)
 */
export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROGRESS_KEY);
  window.dispatchEvent(new CustomEvent('progressUpdated', { detail: {} }));
}

// Helper: Get devotionals for a specific series
function getSeriesDevotionals(seriesSlug: string): string[] {
  const seriesMap: Record<string, string[]> = {
    identity: ['identity-crisis-day-1', 'identity-crisis-day-2', 'identity-crisis-day-3', 'identity-crisis-day-4', 'identity-crisis-day-5'],
    peace: ['peace-day-1', 'peace-day-2', 'peace-day-3', 'peace-day-4', 'peace-day-5'],
    community: ['community-day-1', 'community-day-2', 'community-day-3', 'community-day-4', 'community-day-5'],
    kingdom: ['kingdom-day-1', 'kingdom-day-2', 'kingdom-day-3', 'kingdom-day-4', 'kingdom-day-5'],
    provision: ['provision-day-1', 'provision-day-2', 'provision-day-3', 'provision-day-4', 'provision-day-5'],
    truth: ['truth-day-1', 'truth-day-2', 'truth-day-3', 'truth-day-4', 'truth-day-5'],
    hope: ['hope-day-1', 'hope-day-2', 'hope-day-3', 'hope-day-4', 'hope-day-5'],
  };

  return seriesMap[seriesSlug] || [];
}

// Helper: Get all devotionals in recommended reading order
function getAllDevotionalsInOrder(): string[] {
  return [
    ...getSeriesDevotionals('identity'),
    ...getSeriesDevotionals('peace'),
    ...getSeriesDevotionals('community'),
    ...getSeriesDevotionals('kingdom'),
    ...getSeriesDevotionals('provision'),
    ...getSeriesDevotionals('truth'),
    ...getSeriesDevotionals('hope'),
  ];
}
