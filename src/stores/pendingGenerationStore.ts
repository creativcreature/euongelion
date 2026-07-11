import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * pendingGenerationStore — holds a generation request that hit the
 * SA-026 entitlement gate so it can RESUME automatically after sign-in
 * or after entitlement arrives, with zero re-typing (Phase 1c).
 *
 * localStorage (not sessionStorage) on purpose: the sign-in emailed
 * link and the Stripe checkout round-trip can both land in a fresh
 * tab, and the held request must survive that. The hold expires after
 * 24 hours — audit runs are short-lived server-side, and a stale
 * runToken should never linger on the device.
 *
 * `lastCheckoutSessionId` rides in the same store: the billing portal
 * endpoint requires the most recent checkout session id, and the
 * management page needs it after the return-leg URL params are gone.
 */

export const HELD_SELECTION_TTL_MS = 24 * 60 * 60 * 1000

export interface HeldGenerationSelection {
  auditRunId: string
  optionId: string
  runToken: string
  /** The chosen direction's title — echoed on the paywall/success room. */
  optionTitle: string | null
  /** Scripture anchor of the chosen direction (specimen rendering). */
  optionVerse: string | null
  optionVerseText: string | null
  crisisAcknowledged: boolean
  analyticsOptIn: boolean
  devotionalDepthPreference: string
  timezone: string
  timezoneOffsetMinutes: number
  /** ISO timestamp of the hold — drives expiry. */
  heldAt: string
}

interface PendingGenerationState {
  held: HeldGenerationSelection | null
  lastCheckoutSessionId: string | null

  holdSelection: (selection: Omit<HeldGenerationSelection, 'heldAt'>) => void
  clearSelection: () => void
  setLastCheckoutSessionId: (sessionId: string | null) => void
  /**
   * The held selection if it is still fresh. An expired hold is
   * cleared and null is returned — callers never see a stale token.
   */
  readFreshSelection: () => HeldGenerationSelection | null
}

export function isHeldSelectionFresh(
  held: HeldGenerationSelection | null,
  now: number = Date.now(),
): held is HeldGenerationSelection {
  if (!held) return false
  const heldAt = new Date(held.heldAt).getTime()
  if (Number.isNaN(heldAt)) return false
  return now - heldAt <= HELD_SELECTION_TTL_MS
}

export const usePendingGenerationStore = create<PendingGenerationState>()(
  persist(
    (set, get) => ({
      held: null,
      lastCheckoutSessionId: null,

      holdSelection: (selection) =>
        set({
          held: { ...selection, heldAt: new Date().toISOString() },
        }),

      clearSelection: () => set({ held: null }),

      setLastCheckoutSessionId: (sessionId) =>
        set({ lastCheckoutSessionId: sessionId }),

      readFreshSelection: () => {
        const { held } = get()
        if (!held) return null
        if (!isHeldSelectionFresh(held)) {
          set({ held: null })
          return null
        }
        return held
      },
    }),
    {
      name: 'euangelion-pending-generation',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
