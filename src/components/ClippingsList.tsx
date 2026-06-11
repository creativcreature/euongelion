'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  clearClippings,
  isClippingsSupported,
  listClippings,
  removeClipping,
  type Clipping,
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

function formatDate(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function clippingToText(c: Clipping): string {
  const lines = [c.text.trim(), '', `— ${c.sourceTitle}`]
  if (c.day) lines[2] += ` · Day ${c.day}`
  lines.push(formatDate(c.createdAt))
  return lines.join('\n')
}

export default function ClippingsList() {
  const supported = useClippingsSupported()
  const [items, setItems] = useState<Clipping[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await listClippings()
      setItems(list)
      setError(null)
    } catch {
      // Don't collapse a read failure into "empty" — surface it honestly.
      setError('We couldn’t open your clippings. Your saved text is safe.')
    }
  }, [])

  useEffect(() => {
    if (!isClippingsSupported()) return
    void load()
    const onUpdate = () => void load()
    window.addEventListener('clippingsUpdated', onUpdate)
    return () => window.removeEventListener('clippingsUpdated', onUpdate)
  }, [load])

  const remove = useCallback(async (id: string) => {
    setBusyId(id)
    try {
      await removeClipping(id)
      setItems((prev) => (prev ? prev.filter((c) => c.id !== id) : prev))
    } catch {
      setError('Unable to remove that clipping.')
    } finally {
      setBusyId(null)
    }
  }, [])

  const removeAll = useCallback(async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Remove every clipping? This can’t be undone.')
    ) {
      return
    }
    try {
      await clearClippings()
      setItems([])
    } catch {
      setError('Unable to clear your clippings.')
    }
  }, [])

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print()
  }, [])

  const handleCopyAll = useCallback(async () => {
    if (!items || items.length === 0) return
    const text = items.map(clippingToText).join('\n\n———\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copying isn’t available here — try the download instead.')
    }
  }, [items])

  const handleDownload = useCallback(() => {
    if (!items || items.length === 0) return
    const text = items.map(clippingToText).join('\n\n———\n\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'euangelion-clippings.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [items])

  // ── States ───────────────────────────────────────────────────────

  // Pre-hydration: don't assert support either way (avoids SSR/CSR mismatch).
  if (supported === null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="vw-small text-muted">Opening your clippings…</p>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">CLIPPINGS</p>
        <h1 className="vw-heading-md mb-4">Local saving isn’t available.</h1>
        <p className="vw-body text-secondary">
          Your browser blocks the on-device storage clippings use. Clippings
          stay entirely on your device, so they need that storage to work.
        </p>
      </div>
    )
  }

  if (items === null && error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">CLIPPINGS</p>
        <h1 className="vw-heading-md mb-4">We couldn’t open your clippings.</h1>
        <p className="vw-body mb-8 text-secondary">{error}</p>
        <button
          type="button"
          className="cta-major"
          onClick={() => {
            setError(null)
            void load()
          }}
        >
          TRY AGAIN
        </button>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="vw-small text-muted">Opening your clippings…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">CLIPPINGS</p>
        <h1 className="vw-heading-md mb-4">No clippings yet.</h1>
        <p className="vw-body mb-8 text-secondary">
          Highlight a line while you read and tap “Clip.” Saved passages gather
          here — entirely on this device.
        </p>
        <Link href="/series" className="cta-major">
          BROWSE SERIES
        </Link>
      </div>
    )
  }

  return (
    <div className="clippings-list mx-auto max-w-2xl px-5 py-8">
      <header className="clippings-header mb-6">
        <p className="text-label vw-small mb-1 text-gold">CLIPPINGS</p>
        <h1 className="vw-heading-md mb-2">Your commonplace book</h1>
        <p className="vw-small text-muted">
          {items.length} {items.length === 1 ? 'passage' : 'passages'} · kept on
          this device only
        </p>
      </header>

      {/* Export / print row — hidden from the printed sheet itself. */}
      <div className="clippings-actions mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          className="text-label vw-small link-highlight leading-none"
          onClick={handlePrint}
        >
          PRINT
        </button>
        <button
          type="button"
          className="text-label vw-small link-highlight leading-none"
          onClick={() => void handleCopyAll()}
        >
          {copied ? 'COPIED ✓' : 'COPY ALL'}
        </button>
        <button
          type="button"
          className="text-label vw-small link-highlight leading-none"
          onClick={handleDownload}
        >
          DOWNLOAD .TXT
        </button>
        <button
          type="button"
          className="text-label vw-small leading-none text-muted"
          onClick={() => void removeAll()}
        >
          REMOVE ALL
        </button>
      </div>

      {error && (
        <p className="vw-small mb-4 text-gold" role="status">
          {error}
        </p>
      )}

      <ul className="clippings-items list-none space-y-4">
        {items.map((c) => (
          <li
            key={c.id}
            className="clipping-card border px-5 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <blockquote className="vw-body text-serif-italic type-prose">
              {c.text}
            </blockquote>
            <div className="clipping-meta mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                {c.sourceHref ? (
                  <Link
                    href={c.sourceHref}
                    className="link-highlight vw-small text-secondary"
                  >
                    {c.sourceTitle}
                    {c.day ? ` · Day ${c.day}` : ''}
                  </Link>
                ) : (
                  <span className="vw-small text-secondary">
                    {c.sourceTitle}
                    {c.day ? ` · Day ${c.day}` : ''}
                  </span>
                )}
                <span className="vw-small ml-2 text-muted oldstyle-nums">
                  {formatDate(c.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="clippings-remove text-label vw-small text-muted"
                disabled={busyId === c.id}
                onClick={() => void remove(c.id)}
                aria-label="Remove this clipping"
              >
                {busyId === c.id ? 'REMOVING…' : 'REMOVE'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .clippings-remove {
          min-height: 44px;
        }
        @media print {
          .clippings-actions,
          .clippings-remove {
            display: none !important;
          }
          .clipping-card {
            border-color: #ccc !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
