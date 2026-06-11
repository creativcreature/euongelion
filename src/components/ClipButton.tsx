'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  addClipping,
  isClippingsSupported,
  type NewClipping,
} from '@/lib/clippings'

const NOOP_SUBSCRIBE = () => () => {}

/**
 * Reads on-device-storage support without a setState-in-effect.
 * Returns null during SSR + first hydration render, then the boolean.
 */
function useClippingsSupported(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    NOOP_SUBSCRIBE,
    () => isClippingsSupported(),
    () => null,
  )
}

export interface ClipButtonProps {
  /** Source label stored with the clipping. */
  sourceTitle: string
  /** Catalog devotional slug (catalog reader). */
  sourceSlug?: string
  /** Plan token + day (generated plan day). */
  planToken?: string
  day?: number
  /** Deep-link back to the reading. */
  sourceHref?: string
  /**
   * Optional fixed passage. When provided, the button clips this text.
   * When omitted, it clips the reader's current text selection.
   */
  passage?: string
  className?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'empty' | 'error'

/**
 * Unobtrusive "Clip" affordance for the reader.
 *
 * Two modes:
 *  - With `passage`: saves that exact passage.
 *  - Without: saves `window.getSelection()` — i.e. only what the reader
 *    actually highlighted. We never fabricate text.
 *
 * Clippings are stored locally (IndexedDB) and never leave the device.
 */
export default function ClipButton({
  sourceTitle,
  sourceSlug,
  planToken,
  day,
  sourceHref,
  passage,
  className,
}: ClipButtonProps) {
  const supported = useClippingsSupported()
  const [state, setState] = useState<SaveState>('idle')

  // Reset the transient "Saved"/"empty" hint after a beat.
  useEffect(() => {
    if (state === 'saved' || state === 'empty' || state === 'error') {
      const t = setTimeout(() => setState('idle'), 2200)
      return () => clearTimeout(t)
    }
  }, [state])

  const handleClip = useCallback(async () => {
    const text =
      passage?.trim() ||
      (typeof window !== 'undefined'
        ? (window.getSelection()?.toString() ?? '').trim()
        : '')

    if (!text) {
      // Honest: tell the reader to select text first — don't save nothing.
      setState('empty')
      return
    }

    setState('saving')
    try {
      const payload: NewClipping = {
        text,
        sourceTitle,
        sourceSlug,
        planToken,
        day,
        sourceHref,
      }
      await addClipping(payload)
      setState('saved')
      if (typeof window !== 'undefined') {
        window.getSelection()?.removeAllRanges()
      }
    } catch {
      setState('error')
    }
  }, [passage, sourceTitle, sourceSlug, planToken, day, sourceHref])

  if (supported === null) return null

  if (!supported) {
    return (
      <span
        className={`vw-small text-muted ${className ?? ''}`}
        title="Saving clippings needs a browser with local storage."
      >
        CLIP UNAVAILABLE
      </span>
    )
  }

  const label =
    state === 'saving'
      ? 'CLIPPING…'
      : state === 'saved'
        ? 'CLIPPED ✓'
        : state === 'empty'
          ? 'SELECT TEXT FIRST'
          : state === 'error'
            ? 'TRY AGAIN'
            : passage
              ? 'CLIP'
              : 'CLIP SELECTION'

  return (
    <button
      type="button"
      className={`clip-button text-label vw-small link-highlight leading-none ${className ?? ''}`}
      onClick={() => void handleClip()}
      disabled={state === 'saving'}
      aria-label={
        passage
          ? 'Save this passage to your clippings'
          : 'Save the selected text to your clippings'
      }
      style={{
        minHeight: '44px',
        color:
          state === 'empty' || state === 'error'
            ? 'var(--color-crimson, #c4192e)'
            : undefined,
      }}
    >
      {label}
    </button>
  )
}
