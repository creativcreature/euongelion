import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueueItem } from '@/stores/audioStore'

/**
 * Playlists a reader builds and keeps.
 *
 * An earlier draft of the strategy argued against named playlists: Spotify's
 * model exists to make a hundred million tracks navigable and this catalogue is
 * 98 hours, so people would queue rather than curate. The founder overruled it —
 * playlists are kept in the library — and that ruling stands. What follows from
 * it is that a playlist must be cheap to make: saving what is already queued,
 * in one tap, rather than a create-then-fill flow nobody finishes.
 *
 * Stored on the device. A playlist is a list of readings someone assembled, not
 * authored content, so it follows SA-060 and needs no account.
 */
export interface Playlist {
  id: string
  name: string
  items: QueueItem[]
  createdAt: number
}

interface PlaylistsState {
  playlists: Playlist[]

  /** Returns the new playlist, or null when there is nothing to save. */
  save: (name: string, items: QueueItem[]) => Playlist | null
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  /** Appends to an existing playlist, skipping anything already in it. */
  addTo: (id: string, item: QueueItem) => boolean
  removeFrom: (id: string, slug: string) => void
}

function newId(items: QueueItem[], createdAt: number): string {
  // Deterministic from content and time rather than random: Math.random in a
  // store makes hydration mismatches possible, and this only needs to be
  // unique among a reader's own lists.
  return `pl-${createdAt.toString(36)}-${items.length}`
}

export const usePlaylistsStore = create<PlaylistsState>()(
  persist(
    (set, get) => ({
      playlists: [],

      save: (name, items) => {
        if (!items.length) return null
        const createdAt = Date.now()
        const playlist: Playlist = {
          id: newId(items, createdAt),
          name: name.trim() || 'Untitled',
          items,
          createdAt,
        }
        set({ playlists: [playlist, ...get().playlists] })
        return playlist
      },

      rename: (id, name) =>
        set({
          playlists: get().playlists.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        }),

      remove: (id) =>
        set({ playlists: get().playlists.filter((p) => p.id !== id) }),

      addTo: (id, item) => {
        const playlist = get().playlists.find((p) => p.id === id)
        if (!playlist) return false
        if (playlist.items.some((i) => i.slug === item.slug)) return false
        set({
          playlists: get().playlists.map((p) =>
            p.id === id ? { ...p, items: [...p.items, item] } : p,
          ),
        })
        return true
      },

      removeFrom: (id, slug) =>
        set({
          playlists: get().playlists.map((p) =>
            p.id === id
              ? { ...p, items: p.items.filter((i) => i.slug !== slug) }
              : p,
          ),
        }),
    }),
    { name: 'euangelion:playlists' },
  ),
)
