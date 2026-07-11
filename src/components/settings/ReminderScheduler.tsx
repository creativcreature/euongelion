'use client'

import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  DEFAULT_REMINDER_WINDOW,
  REMINDER_WINDOW_CODES,
  REMINDER_WINDOWS,
  type ReminderWindow,
} from '@/lib/push/reminder-window'

/**
 * ReminderScheduler — the REMINDERS card on /settings (F-070).
 *
 * One quiet word each day, in ONE reader-chosen window (Waking Up "Moment"
 * model): Early morning 5–7 · Morning 7–9 · Midday 12–14 · Evening 19–21.
 *
 * HONEST STATES, by design:
 *  - Browser can't do web push (e.g. iOS Safari outside an installed PWA):
 *    say so, and say what works instead. The picker still saves the choice
 *    on this device for when the reader is somewhere notifications work.
 *  - Server not configured (no NEXT_PUBLIC_VAPID_PUBLIC_KEY): no enable
 *    button is offered — nothing could deliver. The picker saves locally and
 *    the copy says delivery begins when notifications are switched on.
 *  - Permission denied: say so, with how to fix it in the browser.
 *  - Subscribed: the picker persists server-side (push_subscriptions row) via
 *    /api/push/preferences — that row is what the hourly sender reads.
 * There is NO toggle that pretends. Every state tells the truth about
 * whether anything will actually arrive.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()

type DeliveryState =
  | 'checking' // still detecting browser capability / existing subscription
  | 'unsupported' // browser has no web-push machinery
  | 'unconfigured' // browser fine, server has no VAPID key — cannot deliver
  | 'denied' // reader blocked notifications for this site
  | 'off' // deliverable, not subscribed yet
  | 'on' // subscribed — server-side window persistence active

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export default function ReminderScheduler() {
  const reminderWindow = useSettingsStore((s) => s.reminderWindow)
  const setReminderWindow = useSettingsStore((s) => s.setReminderWindow)

  const [delivery, setDelivery] = useState<DeliveryState>('checking')
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const checkedRef = useRef(false)

  // The window shown as active: the reader's explicit choice, else the
  // morning default (which is also the database default for legacy rows).
  const effectiveWindow: ReminderWindow =
    reminderWindow ?? DEFAULT_REMINDER_WINDOW

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    if (!pushSupported()) {
      setDelivery('unsupported')
      return
    }
    if (!VAPID_PUBLIC_KEY) {
      setDelivery('unconfigured')
      return
    }
    if (Notification.permission === 'denied') {
      setDelivery('denied')
      return
    }

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = (await reg?.pushManager.getSubscription()) ?? null
        if (!sub) {
          setDelivery('off')
          return
        }
        setEndpoint(sub.endpoint)
        setDelivery('on')

        // Hydrate the server-stored window; the subscription row is what the
        // sender reads, so it wins over the device-local copy.
        const res = await fetch('/api/push/preferences', {
          cache: 'no-store',
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setError(
            payload.error ||
              'Unable to read your reminder preference from the server.',
          )
          return
        }
        const payload = (await res.json()) as {
          window?: ReminderWindow | null
        }
        if (payload.window && payload.window !== reminderWindow) {
          setReminderWindow(payload.window)
        }
      } catch {
        setDelivery('off')
      }
    })()
    // Deliberately mount-only: capability detection + server hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function chooseWindow(next: ReminderWindow) {
    setError(null)
    setNotice(null)
    setReminderWindow(next)

    if (delivery !== 'on') {
      setNotice('Saved on this device.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/push/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window: next, timezone: browserTimezone() }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        subscribed?: boolean
      }
      if (!res.ok) {
        throw new Error(payload.error || 'Unable to save your reminder window.')
      }
      setNotice(
        `Set. ${REMINDER_WINDOWS[next].label}, ${REMINDER_WINDOWS[next].hoursLabel} in your local time.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your reminder window.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function turnOn() {
    if (!VAPID_PUBLIC_KEY) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setDelivery('denied')
        return
      }

      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        throw new Error(
          'The app is not fully installed in this browser yet. Reload the page once, then try again.',
        )
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          window: effectiveWindow,
          timezone: browserTimezone(),
        }),
      })
      if (!res.ok) {
        // Don't keep a subscription the server couldn't store.
        await subscription.unsubscribe().catch(() => {})
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(
          payload.error || 'The server could not save your subscription.',
        )
      }

      setEndpoint(subscription.endpoint)
      setDelivery('on')
      setNotice(
        `It’s set. ${REMINDER_WINDOWS[effectiveWindow].label}, ${REMINDER_WINDOWS[effectiveWindow].hoursLabel} in your local time.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We couldn’t set up reminders just now. Nothing was saved.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      const deadEndpoint = sub?.endpoint ?? endpoint
      if (sub) await sub.unsubscribe()

      if (deadEndpoint) {
        // Best-effort immediate server cleanup; if it fails the hourly sender
        // prunes the dead endpoint on its next 404/410 anyway.
        await fetch('/api/push/preferences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: deadEndpoint }),
        }).catch(() => {})
      }

      setEndpoint(null)
      setDelivery('off')
      setNotice('Reminders are off.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to turn reminders off just now.',
      )
    } finally {
      setBusy(false)
    }
  }

  const serif = { fontFamily: 'var(--font-family-serif, Georgia, serif)' }

  return (
    <div>
      <p
        className="mb-2 text-gold"
        style={{
          ...serif,
          fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
          lineHeight: 1.2,
        }}
      >
        One quiet word each morning.
      </p>
      <p className="vw-small mb-6 text-secondary">
        No streaks, no badges — a single line at the hour you choose, once a
        day, and you can turn it off any time.
      </p>

      <p className="text-label vw-small mb-3 text-gold">CHOOSE YOUR HOUR</p>
      <div className="mb-5 flex flex-wrap gap-3">
        {REMINDER_WINDOW_CODES.map((code) => {
          const meta = REMINDER_WINDOWS[code]
          const active = effectiveWindow === code
          return (
            <button
              type="button"
              key={code}
              onClick={() => void chooseWindow(code)}
              disabled={busy || delivery === 'checking'}
              aria-pressed={active}
              className="px-4 py-3 text-label vw-small transition-theme disabled:opacity-40"
              style={{
                backgroundColor: active
                  ? 'var(--color-fg)'
                  : 'var(--color-surface)',
                color: active
                  ? 'var(--color-bg)'
                  : 'var(--color-text-secondary)',
                border: `1px solid ${
                  active ? 'var(--color-fg)' : 'var(--color-border)'
                }`,
              }}
            >
              {meta.label} {meta.hoursLabel}
            </button>
          )
        })}
      </div>
      <p className="vw-small mb-6 text-muted">
        Hours are your local time. Morning is the default.
      </p>

      {delivery === 'unsupported' && (
        <p className="vw-small text-secondary">
          This browser can&rsquo;t receive web notifications. On iPhone or iPad,
          add Euangelion to your Home Screen (Share &rarr; Add to Home Screen) —
          reminders work from the installed app. Your chosen hour is saved on
          this device.
        </p>
      )}

      {delivery === 'unconfigured' && (
        <p className="vw-small text-secondary">
          Reminder delivery isn&rsquo;t switched on for this site yet. Your
          chosen hour is saved on this device and takes effect the moment
          notifications are enabled — nothing arrives until then.
        </p>
      )}

      {delivery === 'denied' && (
        <p className="vw-small text-secondary">
          Notifications are blocked for this site. To receive the quiet word,
          allow notifications for euangelion.app in your browser&rsquo;s site
          settings, then return here. Your chosen hour is saved on this device.
        </p>
      )}

      {delivery === 'off' && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void turnOn()}
            disabled={busy}
            className="cta-major text-label vw-small px-5 py-3 disabled:opacity-40"
            aria-busy={busy}
          >
            {busy ? 'One moment…' : 'Turn on reminders'}
          </button>
          <p className="vw-small text-muted">
            Your browser will ask for permission once.
          </p>
        </div>
      )}

      {delivery === 'on' && (
        <div className="flex flex-wrap items-center gap-4">
          <p className="vw-small text-secondary">
            Reminders are on —{' '}
            {REMINDER_WINDOWS[effectiveWindow].label.toLowerCase()},{' '}
            {REMINDER_WINDOWS[effectiveWindow].hoursLabel} in your local time.
          </p>
          <button
            type="button"
            onClick={() => void turnOff()}
            disabled={busy}
            className="text-label vw-small border px-4 py-2 disabled:opacity-40"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Turn off
          </button>
        </div>
      )}

      {error && (
        <p
          className="vw-small mt-4"
          style={{ color: 'var(--color-error)' }}
          aria-live="assertive"
        >
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="vw-small mt-4 text-gold" aria-live="polite">
          {notice}
        </p>
      )}
    </div>
  )
}

/** Convert a base64url VAPID key into the Uint8Array the PushManager needs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}
