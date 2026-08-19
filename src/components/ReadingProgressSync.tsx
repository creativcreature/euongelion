'use client'

import { useEffect, useRef } from 'react'
import {
  getProgress,
  mergeLocalCompletions,
  replaceLocalCompletions,
} from '@/lib/progress'
import { unionCompletions } from '@/lib/reading/completion-merge'
import { reconcileReadingProgress } from '@/lib/reading/reading-progress-sync'
import { useProgressStore } from '@/stores/progressStore'

/**
 * Reconciles this device's reading progress with the reader's account, once
 * per page load. Renders nothing.
 *
 * MOUNTED APP-WIDE (in `app/providers.tsx`) rather than in the reader, because
 * the surfaces that most need account progress are the ones OUTSIDE a
 * devotional — the library rails, the series browser, the resume pill — and a
 * reader who opens straight to `/library` on a new device would otherwise see
 * an empty history until they happened to open something.
 *
 * ONE REQUEST, ON MOUNT. The GET answers 200 for a signed-out reader, so it
 * doubles as the auth probe and there is nothing to schedule: signing in goes
 * through `/auth/callback`, which is a full page load, so the next mount is
 * the sign-in sync.
 *
 * There are two device stores and this reads BOTH — `wakeup_progress`
 * (localStorage, what the reader actually writes) and `euangelion-progress`
 * (the zustand store the library rails read). They have drifted apart
 * historically; feeding their union up and the merged result back down is what
 * stops the account inheriting whichever half a given surface happened to see.
 *
 * THE OWNER STAMP decides which way the reconcile runs. The progress store
 * remembers which account this device last synced with; when the server
 * answers as a DIFFERENT account (a shared device, one reader signing out and
 * another in), the local history belongs to the previous reader and is
 * REPLACED by the account's state instead of merged and pushed. Same account
 * (or a device that has never synced, which claims ownership): merge down,
 * backfill up.
 */
export default function ReadingProgressSync() {
  // A ref, not state: this must run once per load, and a second run while the
  // first is still in flight would double-post the same backfill.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    const store = useProgressStore.getState()
    const local = unionCompletions(getProgress(), store.completions)

    void reconcileReadingProgress(local, {
      ownerId: store.syncOwnerId,
      onMerged: (completions, userId) => {
        if (cancelled) return
        mergeLocalCompletions(completions)
        useProgressStore.getState().mergeRemoteCompletions(completions)
        useProgressStore.getState().stampSyncOwner(userId)
      },
      onReplaced: (completions, userId) => {
        if (cancelled) return
        replaceLocalCompletions(completions)
        useProgressStore.getState().replaceCompletions(completions, userId)
      },
    })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
