'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

const CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CHARS = CHARSET.split('')
const FLIP_DURATION_MS = 84
const STEP_GAP_MS = 10
const SLOT_STAGGER_MS = 46

type FlipSlot = {
  current: string
  next: string
  flipping: boolean
  cycle: number
}

function normalizeMessage(message: string, maxLength: number) {
  return message.toUpperCase().padEnd(maxLength, ' ')
}

function normalizeChar(character: string) {
  return CHARS.includes(character) ? character : ' '
}

function nextCharToward(current: string, target: string) {
  const currentIndex = CHARS.indexOf(normalizeChar(current))
  const targetIndex = CHARS.indexOf(normalizeChar(target))

  if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
    return normalizeChar(target)
  }

  const length = CHARS.length
  const forwardDistance = (targetIndex - currentIndex + length) % length
  const backwardDistance = (currentIndex - targetIndex + length) % length
  const direction = forwardDistance <= backwardDistance ? 1 : -1
  const nextIndex = (currentIndex + direction + length) % length
  return CHARS[nextIndex]
}

export default function FlipTicker({
  messages,
  intervalMs = 3800,
  className = '',
}: {
  messages: string[]
  intervalMs?: number
  className?: string
}) {
  const normalized = useMemo(
    () => messages.map((message) => message.toUpperCase()),
    [messages],
  )

  const maxLength = useMemo(
    () => normalized.reduce((max, message) => Math.max(max, message.length), 0),
    [normalized],
  )

  const padded = useMemo(
    () => normalized.map((message) => normalizeMessage(message, maxLength)),
    [normalized, maxLength],
  )

  const firstMessage = padded[0] ?? ''.padEnd(maxLength, ' ')
  const [activeIndex, setActiveIndex] = useState(0)
  const [slots, setSlots] = useState<FlipSlot[]>(() =>
    firstMessage.split('').map((character) => ({
      current: normalizeChar(character),
      next: normalizeChar(character),
      flipping: false,
      cycle: 0,
    })),
  )
  const slotsRef = useRef(slots)
  const timeoutsRef = useRef<number[]>([])
  const visibleIndex = padded.length > 0 ? activeIndex % padded.length : 0

  const clearQueuedTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutsRef.current = []
  }, [])

  const queue = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay)
    timeoutsRef.current.push(id)
  }, [])

  const setSlot = useCallback(
    (index: number, updater: (slot: FlipSlot) => FlipSlot) => {
      setSlots((previous) => {
        if (!previous[index]) return previous
        const next = previous.slice()
        next[index] = updater(next[index])
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (padded.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % padded.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs, padded.length])

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  useEffect(() => () => clearQueuedTimers(), [clearQueuedTimers])

  const animateToMessage = useCallback(
    (message: string) => {
      const target = message.split('')

      target.forEach((character, slotIndex) => {
        const targetChar = normalizeChar(character)

        const tickSlot = () => {
          const snapshot = slotsRef.current[slotIndex]
          if (!snapshot) return

          const currentChar = normalizeChar(snapshot.current)
          if (currentChar === targetChar) {
            setSlot(slotIndex, (slot) => ({
              ...slot,
              next: slot.current,
              flipping: false,
            }))
            return
          }

          const nextChar = nextCharToward(currentChar, targetChar)

          setSlot(slotIndex, (slot) => ({
            ...slot,
            next: nextChar,
            flipping: true,
            cycle: slot.cycle + 1,
          }))

          queue(() => {
            setSlot(slotIndex, (slot) => ({
              ...slot,
              current: nextChar,
              next: nextChar,
              flipping: false,
            }))

            queue(tickSlot, STEP_GAP_MS)
          }, FLIP_DURATION_MS)
        }

        queue(tickSlot, slotIndex * SLOT_STAGGER_MS)
      })
    },
    [queue, setSlot],
  )

  useEffect(() => {
    if (!padded[visibleIndex]) return
    clearQueuedTimers()
    animateToMessage(padded[visibleIndex])
  }, [animateToMessage, clearQueuedTimers, padded, visibleIndex])

  if (padded.length === 0) return null

  return (
    <span
      className={`masthead-flip ${className}`}
      role="img"
      aria-label={normalized[visibleIndex]}
    >
      {Array.from({ length: maxLength }).map((_, slotIndex) => {
        const slot = slots[slotIndex] ?? {
          current: ' ',
          next: ' ',
          flipping: false,
          cycle: 0,
        }
        const currentChar = slot.current === ' ' ? '\u00A0' : slot.current
        const nextChar = slot.next === ' ' ? '\u00A0' : slot.next

        return (
          <span
            key={slotIndex}
            className={`flip-cell ${slot.current === ' ' ? 'is-space' : ''} ${
              slot.flipping ? 'is-flipping' : ''
            }`}
            style={
              {
                '--flip-duration': `${FLIP_DURATION_MS}ms`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className="flip-static flip-top">{currentChar}</span>
            <span className="flip-static flip-bottom">
              {slot.flipping ? nextChar : currentChar}
            </span>
            {slot.flipping && (
              <>
                <span
                  key={`top-${slotIndex}-${slot.cycle}`}
                  className="flip-dynamic flip-top"
                >
                  {currentChar}
                </span>
                <span
                  key={`bottom-${slotIndex}-${slot.cycle}`}
                  className="flip-dynamic flip-bottom"
                >
                  {nextChar}
                </span>
              </>
            )}
          </span>
        )
      })}
    </span>
  )
}
