'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface StatusResponse {
  jobId: string
  status: 'pending' | 'generating' | 'complete' | 'error' | 'stalled'
  progress: string | null
  currentDay: number | null
  totalDays: number
  planId: string | null
  route: string | null
  error: string | null
}

interface GenerationProgressProps {
  jobId: string
  pollUrl: string
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 180 // 7.5 minutes before giving up

const BREATHING_MESSAGES = [
  'Searching the reference library...',
  'Gathering scripture and commentary...',
  'Composing your devotional path...',
  'Grounding each day in real theology...',
  'Weaving the chiastic structure...',
  'Almost there...',
]

export default function GenerationProgress({
  jobId,
  pollUrl,
}: GenerationProgressProps) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [breathIndex, setBreathIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(false)

  const poll = useCallback(async () => {
    if (stoppedRef.current) return

    try {
      const separator = pollUrl.includes('?') ? '&' : '?'
      const res = await fetch(`${pollUrl}${separator}jobId=${jobId}`)
      if (!res.ok) {
        setError(`Server returned ${res.status}. Please refresh and try again.`)
        return
      }

      const data: StatusResponse = await res.json()
      setStatus(data)

      if (data.status === 'complete' && data.route) {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        router.push(data.route)
        return
      }

      if (data.status === 'error') {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      if (data.status === 'stalled') {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setError('Generation stalled. Please retry.')
        return
      }

      setPollCount((c) => {
        const next = c + 1
        if (next >= MAX_POLLS) {
          stoppedRef.current = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          setError('Generation is taking longer than expected. Please retry.')
        }
        return next
      })
    } catch (err) {
      console.error('[GenerationProgress] Poll error:', err)
      setError('Network error while checking progress. Please retry.')
    }
  }, [jobId, pollUrl, router])

  useEffect(() => {
    stoppedRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- existing fire-and-poll pattern; behavior preserved, see docs/overnight-followups.md
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    breathRef.current = setInterval(() => {
      setBreathIndex((i) => (i + 1) % BREATHING_MESSAGES.length)
    }, 4000)

    return () => {
      stoppedRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (breathRef.current) clearInterval(breathRef.current)
    }
  }, [poll])

  const handleRetry = () => {
    setError(null)
    setStatus(null)
    setPollCount(0)
    stoppedRef.current = false
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }

  const progressText = status?.progress ?? BREATHING_MESSAGES[breathIndex]
  const currentDay = status?.currentDay ?? 0
  const totalDays = status?.totalDays ?? 7
  const progressPercent =
    totalDays > 0 ? Math.round((currentDay / totalDays) * 100) : 0

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      {error ? (
        <div>
          <p className="text-label vw-small mb-3 text-gold">GENERATION ERROR</p>
          <p className="vw-body mb-6 text-secondary">{error}</p>
          <button type="button" className="cta-major" onClick={handleRetry}>
            RETRY
          </button>
          <p className="vw-small mt-4 text-muted">
            If the problem persists, return to the{' '}
            <a href="/soul-audit" className="link-highlight">
              Soul Audit
            </a>{' '}
            and start fresh.
          </p>
        </div>
      ) : (
        <div>
          <div
            className="generation-breath mx-auto mb-8 h-16 w-16 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <p className="text-label vw-small mb-2 text-gold">
            BUILDING YOUR PLAN
          </p>
          <p className="vw-body mb-6 text-secondary">{progressText}</p>

          {currentDay > 0 && (
            <div className="mb-4">
              <div
                className="mx-auto h-1 max-w-xs overflow-hidden rounded-full"
                style={{ background: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'var(--color-gold)',
                  }}
                />
              </div>
              <p className="vw-small mt-2 text-muted">
                Day {currentDay} of {totalDays}
              </p>
            </div>
          )}

          <p className="vw-small text-muted">
            This usually takes 30 to 90 seconds.
          </p>
        </div>
      )}

      <style>{`
        @keyframes generation-breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
        .generation-breath {
          animation: generation-breathe 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
