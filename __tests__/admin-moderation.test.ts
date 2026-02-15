/**
 * Admin and Moderation Panel Test Suite (Phase 17)
 *
 * Covers PLAN-V3 Phase 17:
 * - Protected /admin/* routes with single admin role
 * - YouTube allowlist management
 * - Publication moderation queue
 * - Public feed controls
 * - Transparency metrics admin
 * - Audit logs for moderation and publication actions
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminRole = 'admin'
type UserRole = 'user' | 'admin'

interface AdminUser {
  id: string
  email: string
  role: UserRole
}

interface AdminRoute {
  path: string
  requiredRole: AdminRole
  label: string
}

interface ModerationQueueItem {
  id: string
  contentId: string
  authorId: string
  type: 'testimony' | 'reflection' | 'prayer' | 'note'
  title: string
  body: string
  submittedAt: number
  vettingPassed: boolean
  status: 'pending' | 'approved' | 'rejected'
}

interface AuditLogEntry {
  id: string
  adminId: string
  action: string
  targetId: string
  targetType: string
  details: string
  timestamp: number
  ipAddress: string
}

interface YouTubeChannelAdmin {
  channelId: string
  channelName: string
  verified: boolean
  addedBy: string
  addedAt: number
  reviewedAt: number | null
}

interface FeedControl {
  id: string
  type: 'pin' | 'unpin' | 'feature' | 'unfeature' | 'hide' | 'unhide'
  contentId: string
  adminId: string
  timestamp: number
}

interface TransparencyMetrics {
  totalDonations: number
  totalDonors: number
  monthlyRevenue: number
  activeSubscribers: number
  contentPublished: number
  contentModerated: number
  avgModerationTimeMs: number
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const ADMIN_ROUTES: AdminRoute[] = [
  { path: '/admin', requiredRole: 'admin', label: 'Dashboard' },
  {
    path: '/admin/moderation',
    requiredRole: 'admin',
    label: 'Moderation Queue',
  },
  { path: '/admin/youtube', requiredRole: 'admin', label: 'YouTube Allowlist' },
  { path: '/admin/feed', requiredRole: 'admin', label: 'Feed Controls' },
  {
    path: '/admin/transparency',
    requiredRole: 'admin',
    label: 'Transparency Metrics',
  },
  { path: '/admin/audit-log', requiredRole: 'admin', label: 'Audit Log' },
]

function checkAdminAccess(
  user: AdminUser | null,
  route: AdminRoute,
): { allowed: boolean; reason: string | null } {
  if (!user) return { allowed: false, reason: 'Not authenticated' }
  if (user.role !== route.requiredRole)
    return { allowed: false, reason: 'Insufficient permissions' }
  return { allowed: true, reason: null }
}

function createModerationQueue(
  items: ModerationQueueItem[],
): ModerationQueueItem[] {
  return items
    .filter((i) => i.status === 'pending')
    .sort((a, b) => a.submittedAt - b.submittedAt) // FIFO
}

function approveModeration(
  item: ModerationQueueItem,
  adminId: string,
): { item: ModerationQueueItem; log: AuditLogEntry } {
  if (!item.vettingPassed) throw new Error('Cannot approve: vetting not passed')
  return {
    item: { ...item, status: 'approved' },
    log: {
      id: `log-${Date.now()}`,
      adminId,
      action: 'approve_content',
      targetId: item.contentId,
      targetType: 'publication',
      details: `Approved "${item.title}"`,
      timestamp: Date.now(),
      ipAddress: '127.0.0.1',
    },
  }
}

function rejectModeration(
  item: ModerationQueueItem,
  adminId: string,
  reason: string,
): { item: ModerationQueueItem; log: AuditLogEntry } {
  return {
    item: { ...item, status: 'rejected' },
    log: {
      id: `log-${Date.now()}`,
      adminId,
      action: 'reject_content',
      targetId: item.contentId,
      targetType: 'publication',
      details: `Rejected "${item.title}": ${reason}`,
      timestamp: Date.now(),
      ipAddress: '127.0.0.1',
    },
  }
}

function addYouTubeChannel(
  channelId: string,
  channelName: string,
  adminId: string,
): { channel: YouTubeChannelAdmin; log: AuditLogEntry } {
  return {
    channel: {
      channelId,
      channelName,
      verified: false, // Requires review
      addedBy: adminId,
      addedAt: Date.now(),
      reviewedAt: null,
    },
    log: {
      id: `log-${Date.now()}`,
      adminId,
      action: 'add_youtube_channel',
      targetId: channelId,
      targetType: 'youtube_channel',
      details: `Added channel "${channelName}"`,
      timestamp: Date.now(),
      ipAddress: '127.0.0.1',
    },
  }
}

function verifyYouTubeChannel(
  channel: YouTubeChannelAdmin,
  adminId: string,
): { channel: YouTubeChannelAdmin; log: AuditLogEntry } {
  return {
    channel: { ...channel, verified: true, reviewedAt: Date.now() },
    log: {
      id: `log-${Date.now()}`,
      adminId,
      action: 'verify_youtube_channel',
      targetId: channel.channelId,
      targetType: 'youtube_channel',
      details: `Verified channel "${channel.channelName}"`,
      timestamp: Date.now(),
      ipAddress: '127.0.0.1',
    },
  }
}

function applyFeedControl(
  type: FeedControl['type'],
  contentId: string,
  adminId: string,
): { control: FeedControl; log: AuditLogEntry } {
  return {
    control: {
      id: `fc-${Date.now()}`,
      type,
      contentId,
      adminId,
      timestamp: Date.now(),
    },
    log: {
      id: `log-${Date.now()}`,
      adminId,
      action: `feed_${type}`,
      targetId: contentId,
      targetType: 'feed_content',
      details: `Applied ${type} to content ${contentId}`,
      timestamp: Date.now(),
      ipAddress: '127.0.0.1',
    },
  }
}

function getTransparencyMetrics(): TransparencyMetrics {
  return {
    totalDonations: 5000,
    totalDonors: 150,
    monthlyRevenue: 1200,
    activeSubscribers: 89,
    contentPublished: 42,
    contentModerated: 67,
    avgModerationTimeMs: 45000,
  }
}

function filterAuditLog(
  logs: AuditLogEntry[],
  filters: {
    adminId?: string
    action?: string
    targetType?: string
    after?: number
  },
): AuditLogEntry[] {
  return logs.filter((log) => {
    if (filters.adminId && log.adminId !== filters.adminId) return false
    if (filters.action && log.action !== filters.action) return false
    if (filters.targetType && log.targetType !== filters.targetType)
      return false
    if (filters.after && log.timestamp < filters.after) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Admin route protection', () => {
  const adminUser: AdminUser = {
    id: 'admin-1',
    email: 'admin@euangelion.app',
    role: 'admin',
  }
  const regularUser: AdminUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
  }

  it('has 6 admin routes', () => {
    expect(ADMIN_ROUTES).toHaveLength(6)
  })

  it('all routes require admin role', () => {
    for (const route of ADMIN_ROUTES) {
      expect(route.requiredRole).toBe('admin')
    }
  })

  it('all routes under /admin/* path', () => {
    for (const route of ADMIN_ROUTES) {
      expect(route.path).toMatch(/^\/admin/)
    }
  })

  it('allows admin access', () => {
    for (const route of ADMIN_ROUTES) {
      const result = checkAdminAccess(adminUser, route)
      expect(result.allowed).toBe(true)
    }
  })

  it('denies unauthenticated access', () => {
    const result = checkAdminAccess(null, ADMIN_ROUTES[0])
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Not authenticated')
  })

  it('denies regular user access', () => {
    const result = checkAdminAccess(regularUser, ADMIN_ROUTES[0])
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Insufficient permissions')
  })
})

describe('Moderation queue', () => {
  let queueItems: ModerationQueueItem[]

  beforeEach(() => {
    queueItems = [
      {
        id: 'mq-1',
        contentId: 'c-1',
        authorId: 'u-1',
        type: 'testimony',
        title: 'My Story',
        body: 'Clean content',
        submittedAt: 1000,
        vettingPassed: true,
        status: 'pending',
      },
      {
        id: 'mq-2',
        contentId: 'c-2',
        authorId: 'u-2',
        type: 'reflection',
        title: 'Reflection',
        body: 'Good content',
        submittedAt: 2000,
        vettingPassed: true,
        status: 'pending',
      },
      {
        id: 'mq-3',
        contentId: 'c-3',
        authorId: 'u-3',
        type: 'prayer',
        title: 'Prayer',
        body: 'Prayer text',
        submittedAt: 500,
        vettingPassed: false,
        status: 'pending',
      },
      {
        id: 'mq-4',
        contentId: 'c-4',
        authorId: 'u-4',
        type: 'note',
        title: 'Approved Note',
        body: 'Already done',
        submittedAt: 100,
        vettingPassed: true,
        status: 'approved',
      },
    ]
  })

  it('shows only pending items', () => {
    const queue = createModerationQueue(queueItems)
    expect(queue.every((i) => i.status === 'pending')).toBe(true)
  })

  it('orders by submission time (FIFO)', () => {
    const queue = createModerationQueue(queueItems)
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].submittedAt).toBeGreaterThanOrEqual(
        queue[i - 1].submittedAt,
      )
    }
  })

  it('excludes already-processed items', () => {
    const queue = createModerationQueue(queueItems)
    expect(queue.find((i) => i.id === 'mq-4')).toBeUndefined()
  })

  it('approves item that passed vetting', () => {
    const { item, log } = approveModeration(queueItems[0], 'admin-1')
    expect(item.status).toBe('approved')
    expect(log.action).toBe('approve_content')
    expect(log.adminId).toBe('admin-1')
  })

  it('rejects approval of failed vetting', () => {
    expect(() => approveModeration(queueItems[2], 'admin-1')).toThrow(
      'vetting not passed',
    )
  })

  it('rejects item with reason', () => {
    const { item, log } = rejectModeration(
      queueItems[0],
      'admin-1',
      'Inappropriate content',
    )
    expect(item.status).toBe('rejected')
    expect(log.details).toContain('Inappropriate content')
  })
})

describe('YouTube allowlist management', () => {
  it('adds channel as unverified', () => {
    const { channel, log } = addYouTubeChannel(
      'UC-new',
      'New Channel',
      'admin-1',
    )
    expect(channel.verified).toBe(false)
    expect(channel.reviewedAt).toBeNull()
    expect(log.action).toBe('add_youtube_channel')
  })

  it('verifies channel', () => {
    const { channel: added } = addYouTubeChannel(
      'UC-new',
      'New Channel',
      'admin-1',
    )
    const { channel: verified, log } = verifyYouTubeChannel(added, 'admin-1')
    expect(verified.verified).toBe(true)
    expect(verified.reviewedAt).toBeTruthy()
    expect(log.action).toBe('verify_youtube_channel')
  })

  it('logs all channel operations', () => {
    const { log: addLog } = addYouTubeChannel('UC-test', 'Test', 'admin-1')
    expect(addLog.targetType).toBe('youtube_channel')
    expect(addLog.targetId).toBe('UC-test')
  })
})

describe('Feed controls', () => {
  it('pins content', () => {
    const { control, log } = applyFeedControl('pin', 'content-1', 'admin-1')
    expect(control.type).toBe('pin')
    expect(log.action).toBe('feed_pin')
  })

  it('features content', () => {
    const { control } = applyFeedControl('feature', 'content-2', 'admin-1')
    expect(control.type).toBe('feature')
  })

  it('hides content', () => {
    const { control, log } = applyFeedControl('hide', 'content-3', 'admin-1')
    expect(control.type).toBe('hide')
    expect(log.action).toBe('feed_hide')
  })

  it('all feed controls generate audit logs', () => {
    const types: FeedControl['type'][] = [
      'pin',
      'unpin',
      'feature',
      'unfeature',
      'hide',
      'unhide',
    ]
    for (const type of types) {
      const { log } = applyFeedControl(type, 'content-x', 'admin-1')
      expect(log.targetType).toBe('feed_content')
      expect(log.adminId).toBe('admin-1')
    }
  })
})

describe('Transparency metrics admin', () => {
  it('returns all required metrics', () => {
    const metrics = getTransparencyMetrics()
    expect(metrics.totalDonations).toBeGreaterThanOrEqual(0)
    expect(metrics.totalDonors).toBeGreaterThanOrEqual(0)
    expect(metrics.monthlyRevenue).toBeGreaterThanOrEqual(0)
    expect(metrics.activeSubscribers).toBeGreaterThanOrEqual(0)
    expect(metrics.contentPublished).toBeGreaterThanOrEqual(0)
    expect(metrics.contentModerated).toBeGreaterThanOrEqual(0)
  })

  it('tracks average moderation time', () => {
    const metrics = getTransparencyMetrics()
    expect(metrics.avgModerationTimeMs).toBeGreaterThan(0)
    expect(metrics.avgModerationTimeMs).toBeLessThan(120000) // Under 2 minutes SLA
  })
})

describe('Audit log', () => {
  let logs: AuditLogEntry[]

  beforeEach(() => {
    logs = [
      {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'approve_content',
        targetId: 'c-1',
        targetType: 'publication',
        details: 'Approved',
        timestamp: 1000,
        ipAddress: '127.0.0.1',
      },
      {
        id: 'log-2',
        adminId: 'admin-2',
        action: 'reject_content',
        targetId: 'c-2',
        targetType: 'publication',
        details: 'Rejected',
        timestamp: 2000,
        ipAddress: '127.0.0.1',
      },
      {
        id: 'log-3',
        adminId: 'admin-1',
        action: 'add_youtube_channel',
        targetId: 'UC-1',
        targetType: 'youtube_channel',
        details: 'Added',
        timestamp: 3000,
        ipAddress: '127.0.0.1',
      },
      {
        id: 'log-4',
        adminId: 'admin-1',
        action: 'feed_pin',
        targetId: 'c-3',
        targetType: 'feed_content',
        details: 'Pinned',
        timestamp: 4000,
        ipAddress: '127.0.0.1',
      },
    ]
  })

  it('all entries have required fields', () => {
    for (const log of logs) {
      expect(log.id).toBeTruthy()
      expect(log.adminId).toBeTruthy()
      expect(log.action).toBeTruthy()
      expect(log.targetId).toBeTruthy()
      expect(log.targetType).toBeTruthy()
      expect(log.timestamp).toBeGreaterThan(0)
      expect(log.ipAddress).toBeTruthy()
    }
  })

  it('filters by admin', () => {
    const filtered = filterAuditLog(logs, { adminId: 'admin-1' })
    expect(filtered).toHaveLength(3)
    expect(filtered.every((l) => l.adminId === 'admin-1')).toBe(true)
  })

  it('filters by action', () => {
    const filtered = filterAuditLog(logs, { action: 'approve_content' })
    expect(filtered).toHaveLength(1)
  })

  it('filters by target type', () => {
    const filtered = filterAuditLog(logs, { targetType: 'publication' })
    expect(filtered).toHaveLength(2)
  })

  it('filters by timestamp', () => {
    const filtered = filterAuditLog(logs, { after: 2500 })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((l) => l.timestamp >= 2500)).toBe(true)
  })

  it('combines multiple filters', () => {
    const filtered = filterAuditLog(logs, {
      adminId: 'admin-1',
      targetType: 'publication',
    })
    expect(filtered).toHaveLength(1)
  })

  it('records IP address for security', () => {
    for (const log of logs) {
      expect(log.ipAddress).toMatch(/\d+\.\d+\.\d+\.\d+/)
    }
  })
})
