'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { submitSoulAuditResponse } from '@/lib/soul-audit/submit-client'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const emptySubscribe = () => () => {}
const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'
const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'

// With ingredient selection (< 1s), 15s is generous headroom.
const SUBMIT_TIMEOUT_MS = 15_000

export function useSoulAuditSubmit() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedSubmission, setLastFailedSubmission] = useState<
    string | null
  >(null)

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

  const submit = useCallback(
    async (raw: string) => {
      if (limitReached) {
        setError('You\u2019ve explored enough. Time to dive in.')
        setLastFailedSubmission(null)
        return
      }

      const trimmed = raw.trim()
      if (trimmed.length === 0) {
        setError('Write what is real for you right now and try again.')
        setLastFailedSubmission(null)
        return
      }

      setIsSubmitting(true)
      setError(null)

      // Persist input before fetch — survives browser crash or timeout
      sessionStorage.setItem(LAST_AUDIT_INPUT_SESSION_KEY, trimmed)

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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something broke. Try again.',
        )
        setLastFailedSubmission(trimmed)
      } finally {
        setIsSubmitting(false)
      }
    },
    [limitReached, recordAudit, router],
  )

  const reset = useCallback(async () => {
    resetAudit()
    setError(null)
    setText('')
    setLastFailedSubmission(null)
    localStorage.removeItem('soul-audit-result')
    localStorage.removeItem('soul-audit-submit-v2')
    localStorage.removeItem('soul-audit-selection-v2')
    localStorage.removeItem(LAST_AUDIT_INPUT_SESSION_KEY)
    localStorage.removeItem(REROLL_USED_SESSION_KEY)

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
  }
}
