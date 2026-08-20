import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * What is playing, and what plays next.
 *
 * SA-096: the founder overruled the draft's anti-binge posture — "its ok that a
 * person binge a series, it means the material is really working for them" — so
 * AUTO-ADVANCE IS ON FOR EVERY QUEUE KIND. There is deliberately no per-source
 * rule about where a queue stops; it stops when it runs out, or when a person
 * stops it.
 *
 * The queue is persisted because a listening session must survive a reload —
 * closing a tab mid-series and coming back to an empty Up Next is the single
 * most obvious way a queue feels broken. Only the shape needed to rebuild the
 * session is stored; nothing here is authored content, so it follows SA-060 and
 * needs no account.
 */

/** Where a queue came from. Drives the label, and nothing else — see above. */
export type QueueSource = 'series' | 'plan' | 'daily' | 'saved' | 'single'

export interface QueueItem {
  slug: string
  title: string
  /** Version-stamped media URL, from `getNarrationTrack`. */
  src: string
  duration: number
  /** Where "go to the reading" navigates. */
  href: string
  /** The series or programme this belongs to, for the bar's second line. */
  context?: string
}

interface AudioState {
  queue: QueueItem[]
  index: number
  source: QueueSource | null
  /** Human label for the queue: "Rekindled", "Your plan", "The Quiet Hour". */
  label: string | null
  /** True while the element is actually playing. Written by the host only. */
  playing: boolean
  /** Set once the reader has pressed play, so nothing appears before that. */
  started: boolean
  /**
   * Whether the audio sidebar is open.
   *
   * Lives here rather than in the sidebar's own state because it must be
   * openable from OUTSIDE the sidebar — the homepage callout opens it with an
   * empty queue, which is the only way discovery is reachable now that audio
   * has been taken off the browse surfaces.
   */
  panelOpen: boolean

  start: (params: {
    items: QueueItem[]
    index?: number
    source: QueueSource
    label?: string | null
  }) => void
  next: () => boolean
  previous: () => boolean
  jumpTo: (index: number) => void
  /** Adds to the end of Up Next. Returns false if it is already queued. */
  enqueue: (item: QueueItem) => boolean
  remove: (slug: string) => void
  reorder: (from: number, to: number) => void
  clear: () => void
  setPlaying: (playing: boolean) => void
  setPanelOpen: (open: boolean) => void
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      source: null,
      label: null,
      playing: false,
      started: false,
      panelOpen: false,

      start: ({ items, index = 0, source, label = null }) =>
        set({
          queue: items,
          index: Math.min(Math.max(index, 0), Math.max(items.length - 1, 0)),
          source,
          label,
          started: true,
        }),

      next: () => {
        const { queue, index } = get()
        if (index >= queue.length - 1) return false
        set({ index: index + 1 })
        return true
      },

      previous: () => {
        const { index } = get()
        if (index <= 0) return false
        set({ index: index - 1 })
        return true
      },

      jumpTo: (index) => {
        const { queue } = get()
        if (index < 0 || index >= queue.length) return
        set({ index, started: true })
      },

      enqueue: (item) => {
        const { queue } = get()
        if (queue.some((q) => q.slug === item.slug)) return false
        set({ queue: [...queue, item] })
        return true
      },

      remove: (slug) => {
        const { queue, index } = get()
        const at = queue.findIndex((q) => q.slug === slug)
        if (at === -1) return
        const nextQueue = queue.filter((q) => q.slug !== slug)
        // Removing something already played must not drag the cursor forward
        // onto a different reading than the one currently sounding.
        const nextIndex =
          at < index
            ? index - 1
            : Math.min(index, Math.max(nextQueue.length - 1, 0))
        set({ queue: nextQueue, index: nextIndex })
      },

      reorder: (from, to) => {
        const { queue, index } = get()
        if (from === to) return
        if (from < 0 || from >= queue.length || to < 0 || to >= queue.length)
          return
        const nextQueue = [...queue]
        const [moved] = nextQueue.splice(from, 1)
        nextQueue.splice(to, 0, moved)
        // Keep the cursor on the SAME reading it was on, wherever it landed.
        const currentSlug = queue[index]?.slug
        const nextIndex = nextQueue.findIndex((q) => q.slug === currentSlug)
        set({ queue: nextQueue, index: nextIndex === -1 ? index : nextIndex })
      },

      clear: () =>
        set({
          queue: [],
          index: 0,
          source: null,
          label: null,
          playing: false,
          started: false,
        }),

      setPlaying: (playing) => set({ playing }),

      setPanelOpen: (panelOpen) => set({ panelOpen }),
    }),
    {
      name: 'euangelion:listening-queue',
      // `playing` is deliberately NOT persisted: restoring it would claim audio
      // is sounding when nothing is, and nothing on this site autoplays on load.
      // `panelOpen` is not persisted either: a sidebar that reopens itself on
      // every load is exactly the intrusion this redesign removed.
      partialize: (s) => ({
        queue: s.queue,
        index: s.index,
        source: s.source,
        label: s.label,
        started: s.started,
      }),
    },
  ),
)

/** The item under the cursor, or null. */
export function currentItem(state: {
  queue: QueueItem[]
  index: number
}): QueueItem | null {
  return state.queue[state.index] ?? null
}
