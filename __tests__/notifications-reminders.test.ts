/**
 * Notifications and Reminders Test Suite (Phase 14)
 *
 * Covers PLAN-V3 Phase 14:
 * - Channels: in-app, email (Resend), push (Firebase/APNs)
 * - Default schedule: 7:00 AM local with quiet hours suppression
 * - Push permission prompt timing: after first devotional completion
 * - Reminder controls per day/series in settings
 * - Notification preferences persistence
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationChannel = 'in_app' | 'email' | 'push'
type NotificationType =
  | 'daily_reminder'
  | 'series_start'
  | 'completion'
  | 'streak'
  | 'system'

interface NotificationPreferences {
  userId: string
  channels: Record<NotificationChannel, boolean>
  dailyReminderTime: string // HH:mm format
  quietHoursStart: string
  quietHoursEnd: string
  perSeriesReminders: Record<string, boolean>
  pushPermissionGranted: boolean
  pushPermissionPromptShown: boolean
}

interface ScheduledNotification {
  id: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  scheduledFor: Date
  title: string
  body: string
  sent: boolean
  suppressed: boolean
  suppressionReason: string | null
}

interface PushPermissionTrigger {
  trigger: string
  condition: string
  promptText: string
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const CHANNELS: NotificationChannel[] = ['in_app', 'email', 'push']
const PROVIDERS: Record<NotificationChannel, string> = {
  in_app: 'internal',
  email: 'Resend',
  push: 'Firebase/APNs',
}

const PUSH_PERMISSION_TRIGGER: PushPermissionTrigger = {
  trigger: 'first_devotional_completion',
  condition: 'User completes their first devotional day',
  promptText: 'Would you like daily reminders for your devotional?',
}

function createDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    channels: { in_app: true, email: false, push: false },
    dailyReminderTime: '07:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    perSeriesReminders: {},
    pushPermissionGranted: false,
    pushPermissionPromptShown: false,
  }
}

function updateChannel(
  prefs: NotificationPreferences,
  channel: NotificationChannel,
  enabled: boolean,
): NotificationPreferences {
  return {
    ...prefs,
    channels: { ...prefs.channels, [channel]: enabled },
  }
}

function setReminderTime(
  prefs: NotificationPreferences,
  time: string,
): NotificationPreferences {
  const [hours] = time.split(':').map(Number)
  if (hours < 0 || hours > 23) throw new Error('Invalid time')
  return { ...prefs, dailyReminderTime: time }
}

function setQuietHours(
  prefs: NotificationPreferences,
  start: string,
  end: string,
): NotificationPreferences {
  return { ...prefs, quietHoursStart: start, quietHoursEnd: end }
}

function setSeriesReminder(
  prefs: NotificationPreferences,
  seriesSlug: string,
  enabled: boolean,
): NotificationPreferences {
  return {
    ...prefs,
    perSeriesReminders: { ...prefs.perSeriesReminders, [seriesSlug]: enabled },
  }
}

function isInQuietHours(
  prefs: NotificationPreferences,
  currentTime: string,
): boolean {
  const [qStartH, qStartM] = prefs.quietHoursStart.split(':').map(Number)
  const [qEndH, qEndM] = prefs.quietHoursEnd.split(':').map(Number)
  const [curH, curM] = currentTime.split(':').map(Number)
  const start = qStartH * 60 + qStartM
  const end = qEndH * 60 + qEndM
  const cur = curH * 60 + curM
  if (start > end) {
    // Wraps midnight: e.g., 22:00 - 07:00
    return cur >= start || cur < end
  }
  return cur >= start && cur < end
}

function scheduleNotification(
  prefs: NotificationPreferences,
  type: NotificationType,
  channel: NotificationChannel,
  scheduledFor: Date,
  title: string,
  body: string,
): ScheduledNotification {
  const timeStr = `${String(scheduledFor.getHours()).padStart(2, '0')}:${String(scheduledFor.getMinutes()).padStart(2, '0')}`
  const inQuiet = isInQuietHours(prefs, timeStr)
  const channelEnabled = prefs.channels[channel]

  return {
    id: `notif-${Date.now()}`,
    userId: prefs.userId,
    type,
    channel,
    scheduledFor,
    title,
    body,
    sent: false,
    suppressed: inQuiet || !channelEnabled,
    suppressionReason: inQuiet
      ? 'quiet_hours'
      : !channelEnabled
        ? 'channel_disabled'
        : null,
  }
}

function shouldPromptPushPermission(
  prefs: NotificationPreferences,
  completedDays: number,
): boolean {
  return completedDays >= 1 && !prefs.pushPermissionPromptShown
}

function grantPushPermission(
  prefs: NotificationPreferences,
): NotificationPreferences {
  return {
    ...prefs,
    pushPermissionGranted: true,
    pushPermissionPromptShown: true,
    channels: { ...prefs.channels, push: true },
  }
}

function denyPushPermission(
  prefs: NotificationPreferences,
): NotificationPreferences {
  return {
    ...prefs,
    pushPermissionGranted: false,
    pushPermissionPromptShown: true,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notification channels', () => {
  it('supports 3 channels: in-app, email, push', () => {
    expect(CHANNELS).toHaveLength(3)
    expect(CHANNELS).toContain('in_app')
    expect(CHANNELS).toContain('email')
    expect(CHANNELS).toContain('push')
  })

  it('uses correct providers', () => {
    expect(PROVIDERS.email).toBe('Resend')
    expect(PROVIDERS.push).toBe('Firebase/APNs')
    expect(PROVIDERS.in_app).toBe('internal')
  })
})

describe('Default preferences', () => {
  it('in-app enabled by default', () => {
    const prefs = createDefaultPreferences('user-1')
    expect(prefs.channels.in_app).toBe(true)
  })

  it('email disabled by default', () => {
    const prefs = createDefaultPreferences('user-1')
    expect(prefs.channels.email).toBe(false)
  })

  it('push disabled by default', () => {
    const prefs = createDefaultPreferences('user-1')
    expect(prefs.channels.push).toBe(false)
  })

  it('default reminder time is 7:00 AM', () => {
    const prefs = createDefaultPreferences('user-1')
    expect(prefs.dailyReminderTime).toBe('07:00')
  })

  it('default quiet hours 10 PM to 7 AM', () => {
    const prefs = createDefaultPreferences('user-1')
    expect(prefs.quietHoursStart).toBe('22:00')
    expect(prefs.quietHoursEnd).toBe('07:00')
  })
})

describe('Preference updates', () => {
  let prefs: NotificationPreferences

  beforeEach(() => {
    prefs = createDefaultPreferences('user-1')
  })

  it('enables email channel', () => {
    prefs = updateChannel(prefs, 'email', true)
    expect(prefs.channels.email).toBe(true)
  })

  it('disables in-app channel', () => {
    prefs = updateChannel(prefs, 'in_app', false)
    expect(prefs.channels.in_app).toBe(false)
  })

  it('changes reminder time', () => {
    prefs = setReminderTime(prefs, '06:30')
    expect(prefs.dailyReminderTime).toBe('06:30')
  })

  it('rejects invalid reminder time', () => {
    expect(() => setReminderTime(prefs, '25:00')).toThrow('Invalid time')
  })

  it('updates quiet hours', () => {
    prefs = setQuietHours(prefs, '21:00', '06:00')
    expect(prefs.quietHoursStart).toBe('21:00')
    expect(prefs.quietHoursEnd).toBe('06:00')
  })

  it('sets per-series reminders', () => {
    prefs = setSeriesReminder(prefs, 'identity', true)
    prefs = setSeriesReminder(prefs, 'peace', false)
    expect(prefs.perSeriesReminders['identity']).toBe(true)
    expect(prefs.perSeriesReminders['peace']).toBe(false)
  })
})

describe('Quiet hours suppression', () => {
  let prefs: NotificationPreferences

  beforeEach(() => {
    prefs = createDefaultPreferences('user-1')
  })

  it('suppresses during quiet hours (11 PM)', () => {
    expect(isInQuietHours(prefs, '23:00')).toBe(true)
  })

  it('suppresses during quiet hours (midnight)', () => {
    expect(isInQuietHours(prefs, '00:00')).toBe(true)
  })

  it('suppresses at 6:59 AM (before end)', () => {
    expect(isInQuietHours(prefs, '06:59')).toBe(true)
  })

  it('does not suppress at 7:00 AM (quiet hours end)', () => {
    expect(isInQuietHours(prefs, '07:00')).toBe(false)
  })

  it('does not suppress at 3 PM', () => {
    expect(isInQuietHours(prefs, '15:00')).toBe(false)
  })

  it('does not suppress at 9:59 PM (before quiet hours start)', () => {
    expect(isInQuietHours(prefs, '21:59')).toBe(false)
  })

  it('suppresses at 10:00 PM (quiet hours start)', () => {
    expect(isInQuietHours(prefs, '22:00')).toBe(true)
  })
})

describe('Notification scheduling', () => {
  let prefs: NotificationPreferences

  beforeEach(() => {
    prefs = createDefaultPreferences('user-1')
    prefs = updateChannel(prefs, 'email', true)
  })

  it('schedules notification during active hours', () => {
    const scheduledFor = new Date(2026, 1, 16, 7, 0, 0) // 7 AM
    const notif = scheduleNotification(
      prefs,
      'daily_reminder',
      'in_app',
      scheduledFor,
      'Daily Bread',
      'Your devotional is ready',
    )
    expect(notif.suppressed).toBe(false)
    expect(notif.suppressionReason).toBeNull()
  })

  it('suppresses notification during quiet hours', () => {
    const scheduledFor = new Date(2026, 1, 16, 23, 0, 0) // 11 PM
    const notif = scheduleNotification(
      prefs,
      'daily_reminder',
      'in_app',
      scheduledFor,
      'Late Reminder',
      'body',
    )
    expect(notif.suppressed).toBe(true)
    expect(notif.suppressionReason).toBe('quiet_hours')
  })

  it('suppresses on disabled channel', () => {
    const scheduledFor = new Date(2026, 1, 16, 10, 0, 0)
    const notif = scheduleNotification(
      prefs,
      'daily_reminder',
      'push',
      scheduledFor,
      'Push',
      'body',
    )
    expect(notif.suppressed).toBe(true)
    expect(notif.suppressionReason).toBe('channel_disabled')
  })
})

describe('Push permission prompt timing', () => {
  let prefs: NotificationPreferences

  beforeEach(() => {
    prefs = createDefaultPreferences('user-1')
  })

  it('triggers after first devotional completion', () => {
    expect(PUSH_PERMISSION_TRIGGER.trigger).toBe('first_devotional_completion')
  })

  it('should not prompt before any completions', () => {
    expect(shouldPromptPushPermission(prefs, 0)).toBe(false)
  })

  it('should prompt after first completion', () => {
    expect(shouldPromptPushPermission(prefs, 1)).toBe(true)
  })

  it('should not prompt if already shown', () => {
    prefs = { ...prefs, pushPermissionPromptShown: true }
    expect(shouldPromptPushPermission(prefs, 5)).toBe(false)
  })

  it('granting permission enables push channel', () => {
    prefs = grantPushPermission(prefs)
    expect(prefs.pushPermissionGranted).toBe(true)
    expect(prefs.channels.push).toBe(true)
    expect(prefs.pushPermissionPromptShown).toBe(true)
  })

  it('denying permission marks prompt as shown', () => {
    prefs = denyPushPermission(prefs)
    expect(prefs.pushPermissionGranted).toBe(false)
    expect(prefs.channels.push).toBe(false)
    expect(prefs.pushPermissionPromptShown).toBe(true)
  })
})
