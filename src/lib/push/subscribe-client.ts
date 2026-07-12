import type { ReminderWindow } from '@/lib/push/reminder-window'

/**
 * subscribe-client — browser-side web-push enrolment shared by the
 * account-onboarding reminders beat (F-065 extension) alongside the
 * Settings ReminderScheduler.
 *
 * HONEST STATES only (Dev Rule #1): a capability is reported exactly as
 * detected, permission is requested ONLY on an explicit yes, and a
 * subscription the server could not store is rolled back — no toggle
 * ever pretends delivery exists.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()

export type ReminderCapability =
  | 'unsupported' // browser has no web-push machinery
  | 'unconfigured' // browser fine, server has no VAPID key — cannot deliver
  | 'denied' // reader blocked notifications for this site
  | 'available' // permission can be asked; delivery is possible

export function detectReminderCapability(): ReminderCapability {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported'
  }
  if (!VAPID_PUBLIC_KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  return 'available'
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export type EnableRemindersResult =
  | { ok: true }
  | { ok: false; reason: 'permission_denied' | 'error'; message: string }

/**
 * Request permission (explicit-yes moment) and enrol this browser for the
 * one-quiet-word reminder in the given window. Mirrors the Settings
 * ReminderScheduler contract: the push_subscriptions row the hourly
 * sender reads is written by /api/push/subscribe.
 */
export async function enableReminders(
  window_: ReminderWindow,
): Promise<EnableRemindersResult> {
  if (!VAPID_PUBLIC_KEY) {
    return {
      ok: false,
      reason: 'error',
      message:
        'Reminder delivery isn’t switched on for this site yet. Your chosen hour is saved and takes effect when it is.',
    }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return {
        ok: false,
        reason: 'permission_denied',
        message:
          'Notifications stay off — you said no, and that stands. You can change it any time in Settings.',
      }
    }

    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      return {
        ok: false,
        reason: 'error',
        message:
          'The app is not fully installed in this browser yet. Reload the page once, then try again.',
      }
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
        window: window_,
        timezone: browserTimezone(),
      }),
    })
    if (!res.ok) {
      // Don't keep a subscription the server couldn't store.
      await subscription.unsubscribe().catch(() => {})
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
      }
      return {
        ok: false,
        reason: 'error',
        message:
          payload.error || 'The server could not save your subscription.',
      }
    }

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message:
        err instanceof Error
          ? err.message
          : 'We couldn’t set up reminders just now. Nothing was saved.',
    }
  }
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
