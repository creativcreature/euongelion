import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OfflineState {
  /** Whether the app is currently offline */
  isOffline: boolean
  /** Queued actions to sync when back online */
  syncQueue: Array<{
    action: string
    payload: Record<string, unknown>
    timestamp: string
  }>

  setOffline: (offline: boolean) => void
  addToQueue: (action: string, payload: Record<string, unknown>) => void
  clearQueue: () => void
}

/**
 * Offline store — tracks connectivity and queues actions for PWA sync.
 * Phase 9 will expand this with service worker integration.
 */
export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOffline: false,
      syncQueue: [],

      setOffline: (isOffline) => set({ isOffline }),

      addToQueue: (action, payload) => {
        set({
          syncQueue: [
            ...get().syncQueue,
            { action, payload, timestamp: new Date().toISOString() },
          ],
        })
      },

      clearQueue: () => set({ syncQueue: [] }),
    }),
    {
      name: 'euangelion-offline',
    },
  ),
)
