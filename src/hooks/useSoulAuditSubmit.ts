'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { submitSoulAuditResponse } from '@/lib/soul-audit/submit-client'
import { detectCrisis } from '@/lib/soul-audit/crisis-gate'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const emptySubscribe = () => () => {}
const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'
const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'

// Keep in sync with submit-client default; avoids false front-end failures
// during transient provider slowness.
const SUBMIT_TIMEOUT_MS = 45_000
// Transparent re-attempts on a slow/failed options compose before surfacing an
// error — the wait is embraced, not raced.
const MAX_SUBMIT_RETRIES = 2

export function useSoulAuditSubmit() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedSubmission, setLastFailedSubmission] = useState<
    string | null
  >(null)
  // Crisis gate state — populated client-side BEFORE any network call.
  // When truthy, the interstitial renders and the network call is suppressed.
  const [crisisText, setCrisisText] = useState<string | null>(null)

  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit, resetAudit } =
    useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()

  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length
  const showLowContextHint = wordCount > 0 && wordCount <= 3

  /**
   * Inner: transmit the reflection text to the API.
   * Only called after crisis check has passed (or been dismissed by user).
   * No analytics/log calls fire here — the caller is responsible for that gate.
   */
  const doNetworkSubmit = useCallback(
    async (trimmed: string) => {
      setIsSubmitting(true)
      setError(null)

      // Persist input before fetch — survives browser crash or timeout
      sessionStorage.setItem(LAST_AUDIT_INPUT_SESSION_KEY, trimmed)

      // Composing options is a real generation that can brush the provider's
      // latency ceiling. Don't punish that with a hard failure — transparently
      // re-attempt a couple of times while the loader keeps running, so a slow
      // press never shows the reader an error it can recover from on its own.
      let attempt = 0
      while (true) {
        try {
          const data = (await submitSoulAuditResponse({
            response: trimmed,
            timeoutMs: SUBMIT_TIMEOUT_MS,
          })) as SoulAuditSubmitResponseV2
          sessionStorage.setItem('soul-audit-submit-v2', JSON.stringify(data))
          sessionStorage.removeItem('soul-audit-selection-v2')
          sessionStorage.removeItem(REROLL_USED_SESSION_KEY)
          recordAudit(trimmed, data)
          setLastFailedSubmission(null)
          router.push('/soul-audit/results')
          break
        } catch (err) {
          if (attempt < MAX_SUBMIT_RETRIES) {
            attempt += 1
            continue
          }
          setError(
            err instanceof Error ? err.message : 'Something broke. Try again.',
          )
          setLastFailedSubmission(trimmed)
          break
        }
      }
      setIsSubmitting(false)
    },
    [recordAudit, router],
  )

  const submit = useCallback(
    async (raw: string) => {
      if (limitReached) {
        setError('You’ve explored enough. Time to dive in.')
        setLastFailedSubmission(null)
        return
      }

      const trimmed = raw.trim()
      if (trimmed.length === 0) {
        setError("Take your time. When you're ready, just write what comes.")
        setLastFailedSubmission(null)
        return
      }

      // ── Crisis safety gate (client-side, deterministic, zero-network) ──
      // Runs BEFORE any fetch. If triggered: show interstitial, stop here.
      // The reflection text is NOT transmitted until/unless the user
      // explicitly dismisses the interstitial and chooses to continue.
      const crisisResult = detectCrisis(trimmed)
      if (crisisResult.triggered) {
        setCrisisText(trimmed)
        return
      }

      await doNetworkSubmit(trimmed)
    },
    [limitReached, doNetworkSubmit],
  )

  /**
   * Called from the interstitial's "Continue to a reading anyway" action.
   * Dismisses the crisis gate and proceeds with the original text.
   * The user has seen the resources; their choice to continue is respected.
   */
  const dismissCrisisAndContinue = useCallback(async () => {
    const saved = crisisText
    setCrisisText(null)
    if (saved !== null) {
      await doNetworkSubmit(saved)
    }
  }, [crisisText, doNetworkSubmit])

  const reset = useCallback(async () => {
    resetAudit()
    setError(null)
    setText('')
    setLastFailedSubmission(null)
    setCrisisText(null)
    sessionStorage.removeItem('soul-audit-result')
    sessionStorage.removeItem('soul-audit-submit-v2')
    sessionStorage.removeItem('soul-audit-selection-v2')
    sessionStorage.removeItem(LAST_AUDIT_INPUT_SESSION_KEY)
    sessionStorage.removeItem(REROLL_USED_SESSION_KEY)

    try {
      const response = await fetch('/api/soul-audit/reset', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Unable to reset server audit state.')
      }
    } catch {
      setError(
        'Local audit state was reset, but server reset failed. Please try once more.',
      )
    }
  }, [resetAudit])

  return {
    text,
    setText,
    isSubmitting,
    error,
    setError,
    lastFailedSubmission,
    submit,
    reset,
    hydrated,
    auditCount,
    limitReached,
    wordCount,
    showLowContextHint,
    /** Non-null when the crisis interstitial should be shown. */
    crisisText,
    dismissCrisisAndContinue,
  }
}
