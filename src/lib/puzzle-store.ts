/**
 * Puzzle progress persistence (SA-114 / F-158). Founder: "I filled out the
 * word search early... refreshed the page and my entries were lost."
 *
 * localStorage, keyed by the puzzle's own content — a new day's puzzle has a
 * new key and starts clean; today's remembers. Device-local by design (same
 * model as clippings): no account required, nothing synced.
 */
export function readPuzzleState<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writePuzzleState(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked — the game still plays, it just forgets.
  }
}
