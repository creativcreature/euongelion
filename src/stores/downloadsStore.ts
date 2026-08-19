import { create } from 'zustand'

/**
 * Readings kept for offline.
 *
 * The bytes live in a Cache Storage bucket the service worker owns
 * (`euangelion-downloads`); this store is only the index the UI reads, kept in
 * step by asking the worker rather than by guessing. It is intentionally NOT
 * persisted: the cache is the truth, and a persisted list would drift from it
 * the moment a browser evicted something under storage pressure — showing a
 * reading as saved that is no longer there is worse than showing nothing.
 */
export type DownloadState = 'idle' | 'downloading' | 'done' | 'failed'

interface DownloadsState {
  /** Track src -> state. Keyed by src because that is what the cache stores. */
  states: Record<string, DownloadState>
  /** True once the worker has answered a LIST_AUDIO. */
  hydrated: boolean

  setState: (src: string, state: DownloadState) => void
  setAll: (srcs: string[]) => void
  remove: (src: string) => void
}

export const useDownloadsStore = create<DownloadsState>()((set, get) => ({
  states: {},
  hydrated: false,

  setState: (src, state) => set({ states: { ...get().states, [src]: state } }),

  setAll: (srcs) =>
    set({
      states: Object.fromEntries(srcs.map((src) => [src, 'done' as const])),
      hydrated: true,
    }),

  remove: (src) => {
    const next = { ...get().states }
    delete next[src]
    set({ states: next })
  },
}))
