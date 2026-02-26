'use client'

/**
 * useGenerationStatus — Shared hook for polling generative plan progress.
 *
 * Extracted from the monolithic results page (Phase 6) so both the
 * selection page and the reader page can share generation-polling logic.
 *
 * Responsibilities:
 * - Poll /api/soul-audit/generation-status for progressive delivery
 * - Drive cascading generation via /api/soul-audit/generate-next
 * - Merge newly generated days into the plan days array
 * - Provide generation progress state (completedDays, totalDays, status)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CustomPlanDay,
  GenerationStatusResponse,
} from '@/types/soul-audit'
import { isFullPlanDay } from '@/lib/soul-audit/type-guards'

export interface UseGenerationStatusResult {
  generationProgress: GenerationStatusResponse | null
  loadGenerativePlanStatus: (
    token: string,
  ) => Promise<GenerationStatusResponse | null>
  startCascadeGeneration: (
    token: string,
    onDayGenerated?: (day: CustomPlanDay) => void,
  ) => void
  stopCascadeGeneration: () => void
}

export function useGenerationStatus(): UseGenerationStatusResult {
  const [generationProgress, setGenerationProgress] =
    useState<GenerationStatusResponse | null>(null)
  const cancelledRef = useRef(false)

  const loadGenerativePlanStatus = useCallback(
    async (token: string): Promise<GenerationStatusResponse | null> => {
      try {
        const response = await fetch(
          `/api/soul-audit/generation-status?planToken=${encodeURIComponent(token)}`,
        )
        if (!response.ok) return null
        return (await response.json()) as GenerationStatusResponse
      } catch {
        return null
      }
    },
    [],
  )

  const startCascadeGeneration = useCallback(
    (token: string, onDayGenerated?: (day: CustomPlanDay) => void) => {
      cancelledRef.current = false

      async function cascadeGeneration() {
        // Initial status check
        const initialStatus = await loadGenerativePlanStatus(token)
        if (cancelledRef.current || !initialStatus) return
        setGenerationProgress(initialStatus)
        if (
          initialStatus.status === 'complete' ||
          initialStatus.status === 'partial_failure'
        ) {
          return
        }

        // Keep generating pending days
        while (!cancelledRef.current) {
          const genRes = await fetch('/api/soul-audit/generate-next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planToken: token }),
          })

          if (cancelledRef.current) break
          if (!genRes.ok) {
            const status = await loadGenerativePlanStatus(token)
            if (status) setGenerationProgress(status)
            break
          }

          const genPayload = (await genRes.json()) as {
            generatedDay?: CustomPlanDay
            nextPendingDay?: number | null
            status?: string
          }
          if (cancelledRef.current) break

          // Notify caller of the newly generated day
          if (
            genPayload.generatedDay &&
            isFullPlanDay(genPayload.generatedDay) &&
            onDayGenerated
          ) {
            onDayGenerated(genPayload.generatedDay)
          }

          // Poll status to update progress
          const status = await loadGenerativePlanStatus(token)
          if (cancelledRef.current) break
          if (status) {
            setGenerationProgress(status)
            if (
              status.status === 'complete' ||
              status.status === 'partial_failure'
            ) {
              break
            }
          }

          if (genPayload.nextPendingDay === null) break
        }
      }

      void cascadeGeneration()
    },
    [loadGenerativePlanStatus],
  )

  const stopCascadeGeneration = useCallback(() => {
    cancelledRef.current = true
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  return {
    generationProgress,
    loadGenerativePlanStatus,
    startCascadeGeneration,
    stopCascadeGeneration,
  }
}
