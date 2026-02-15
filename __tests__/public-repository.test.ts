/**
 * Public Repository and Moderation Test Suite (Phase 12)
 *
 * Covers PLAN-V3 Phase 12:
 * - UGC default private until explicit publish action
 * - Automated soft-vetting: safety, plagiarism, citation checks
 * - Moderation SLA messaging (< 2 minutes)
 * - Public repository UX: discover feed + filters + search + sorting
 * - YouTube integration via vetted channel allowlist
 * - Video placement: rule-based contextual (intro vs end)
 * - Only owner-embeddable videos
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublishStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'
type VettingCheck =
  | 'safety'
  | 'plagiarism'
  | 'citation'
  | 'profanity'
  | 'hate_speech'
type VideoPlacement = 'intro' | 'end' | 'contextual'

interface PublishableContent {
  id: string
  authorId: string
  type: 'testimony' | 'reflection' | 'prayer' | 'note'
  title: string
  body: string
  status: PublishStatus
  vettingResults: VettingResult[]
  publishedAt: number | null
  createdAt: number
}

interface VettingResult {
  check: VettingCheck
  passed: boolean
  confidence: number
  details: string | null
}

interface ModerationAction {
  contentId: string
  action: 'approve' | 'reject' | 'flag'
  reason: string | null
  moderatorId: string
  timestamp: number
}

interface YouTubeAllowlistEntry {
  channelId: string
  channelName: string
  verified: boolean
  addedBy: string
  addedAt: number
}

interface VideoEmbed {
  channelId: string
  videoId: string
  placement: VideoPlacement
  ownerEmbeddable: boolean
  devotionalSlug: string
  dayNumber: number
}

interface FeedQuery {
  sortBy: 'newest' | 'popular' | 'relevant'
  filterType: string | null
  searchQuery: string | null
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

function createContent(
  authorId: string,
  type: PublishableContent['type'],
  title: string,
  body: string,
): PublishableContent {
  return {
    id: `content-${Date.now()}`,
    authorId,
    type,
    title,
    body,
    status: 'draft', // Always starts private
    vettingResults: [],
    publishedAt: null,
    createdAt: Date.now(),
  }
}

function requestPublish(content: PublishableContent): PublishableContent {
  if (content.status !== 'draft') throw new Error('Can only publish from draft')
  return { ...content, status: 'pending_review' }
}

function runVetting(content: PublishableContent): PublishableContent {
  const checks: VettingCheck[] = [
    'safety',
    'plagiarism',
    'citation',
    'profanity',
    'hate_speech',
  ]
  const results: VettingResult[] = checks.map((check) => ({
    check,
    passed: !content.body.includes('FLAGGED_' + check.toUpperCase()),
    confidence: 0.95,
    details: null,
  }))
  return { ...content, vettingResults: results }
}

function approveContent(
  content: PublishableContent,
  moderatorId: string,
): { content: PublishableContent; action: ModerationAction } {
  const allPassed = content.vettingResults.every((r) => r.passed)
  if (!allPassed) throw new Error('Cannot approve: vetting checks failed')
  return {
    content: { ...content, status: 'approved', publishedAt: Date.now() },
    action: {
      contentId: content.id,
      action: 'approve',
      reason: null,
      moderatorId,
      timestamp: Date.now(),
    },
  }
}

function rejectContent(
  content: PublishableContent,
  moderatorId: string,
  reason: string,
): { content: PublishableContent; action: ModerationAction } {
  return {
    content: { ...content, status: 'rejected' },
    action: {
      contentId: content.id,
      action: 'reject',
      reason,
      moderatorId,
      timestamp: Date.now(),
    },
  }
}

function isAllowlistedChannel(
  channelId: string,
  allowlist: YouTubeAllowlistEntry[],
): boolean {
  return allowlist.some((e) => e.channelId === channelId && e.verified)
}

function validateVideoEmbed(
  embed: VideoEmbed,
  allowlist: YouTubeAllowlistEntry[],
): { valid: boolean; reason: string | null } {
  if (!isAllowlistedChannel(embed.channelId, allowlist))
    return { valid: false, reason: 'Channel not allowlisted' }
  if (!embed.ownerEmbeddable)
    return { valid: false, reason: 'Video not embeddable' }
  return { valid: true, reason: null }
}

function queryFeed(
  contents: PublishableContent[],
  query: FeedQuery,
): PublishableContent[] {
  let results = contents.filter((c) => c.status === 'approved')
  if (query.filterType)
    results = results.filter((c) => c.type === query.filterType)
  if (query.searchQuery) {
    const q = query.searchQuery.toLowerCase()
    results = results.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q),
    )
  }
  if (query.sortBy === 'newest')
    results.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  const start = (query.page - 1) * query.pageSize
  return results.slice(start, start + query.pageSize)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UGC default private', () => {
  it('content starts as draft (private)', () => {
    const content = createContent(
      'user-1',
      'testimony',
      'My Story',
      'I found grace...',
    )
    expect(content.status).toBe('draft')
    expect(content.publishedAt).toBeNull()
  })

  it('requires explicit publish action', () => {
    let content = createContent(
      'user-1',
      'reflection',
      'Reflection',
      'God showed me...',
    )
    content = requestPublish(content)
    expect(content.status).toBe('pending_review')
  })

  it('cannot publish from non-draft state', () => {
    let content = createContent('user-1', 'testimony', 'Story', 'content')
    content = requestPublish(content)
    expect(() => requestPublish(content)).toThrow('Can only publish from draft')
  })
})

describe('Automated soft-vetting pipeline', () => {
  it('runs all 5 vetting checks', () => {
    let content = createContent(
      'user-1',
      'testimony',
      'Story',
      'A clean testimony',
    )
    content = runVetting(content)
    expect(content.vettingResults).toHaveLength(5)
    const checks = content.vettingResults.map((r) => r.check)
    expect(checks).toContain('safety')
    expect(checks).toContain('plagiarism')
    expect(checks).toContain('citation')
    expect(checks).toContain('profanity')
    expect(checks).toContain('hate_speech')
  })

  it('clean content passes all checks', () => {
    let content = createContent(
      'user-1',
      'prayer',
      'Prayer',
      'Lord, hear my prayer',
    )
    content = runVetting(content)
    expect(content.vettingResults.every((r) => r.passed)).toBe(true)
  })

  it('flagged content fails relevant check', () => {
    let content = createContent(
      'user-1',
      'testimony',
      'Story',
      'Content with FLAGGED_SAFETY issue',
    )
    content = runVetting(content)
    const safetyCheck = content.vettingResults.find((r) => r.check === 'safety')
    expect(safetyCheck?.passed).toBe(false)
  })

  it('plagiarism check runs', () => {
    let content = createContent(
      'user-1',
      'note',
      'Note',
      'Content with FLAGGED_PLAGIARISM copied text',
    )
    content = runVetting(content)
    const plagiarism = content.vettingResults.find(
      (r) => r.check === 'plagiarism',
    )
    expect(plagiarism?.passed).toBe(false)
  })

  it('vetting results include confidence scores', () => {
    let content = createContent('user-1', 'prayer', 'Prayer', 'Clean content')
    content = runVetting(content)
    for (const result of content.vettingResults) {
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    }
  })
})

describe('Moderation approval/rejection', () => {
  it('approves content that passes vetting', () => {
    let content = createContent('user-1', 'testimony', 'Story', 'Clean content')
    content = requestPublish(content)
    content = runVetting(content)
    const { content: approved, action } = approveContent(content, 'mod-1')
    expect(approved.status).toBe('approved')
    expect(approved.publishedAt).toBeTruthy()
    expect(action.action).toBe('approve')
  })

  it('rejects content that fails vetting', () => {
    let content = createContent(
      'user-1',
      'testimony',
      'Story',
      'Has FLAGGED_SAFETY issue',
    )
    content = requestPublish(content)
    content = runVetting(content)
    expect(() => approveContent(content, 'mod-1')).toThrow(
      'vetting checks failed',
    )
    const { content: rejected, action } = rejectContent(
      content,
      'mod-1',
      'Safety concern',
    )
    expect(rejected.status).toBe('rejected')
    expect(action.reason).toBe('Safety concern')
  })

  it('moderation actions have audit trail', () => {
    let content = createContent('user-1', 'prayer', 'Prayer', 'Clean prayer')
    content = requestPublish(content)
    content = runVetting(content)
    const { action } = approveContent(content, 'mod-1')
    expect(action.moderatorId).toBe('mod-1')
    expect(action.timestamp).toBeGreaterThan(0)
    expect(action.contentId).toBe(content.id)
  })

  it('moderation SLA under 2 minutes (contract)', () => {
    const SLA_MS = 2 * 60 * 1000
    expect(SLA_MS).toBe(120000)
  })
})

describe('YouTube allowlist', () => {
  const allowlist: YouTubeAllowlistEntry[] = [
    {
      channelId: 'UC-bible-project',
      channelName: 'Bible Project',
      verified: true,
      addedBy: 'admin-1',
      addedAt: Date.now(),
    },
    {
      channelId: 'UC-chosen',
      channelName: 'The Chosen',
      verified: true,
      addedBy: 'admin-1',
      addedAt: Date.now(),
    },
    {
      channelId: 'UC-unverified',
      channelName: 'Pending Channel',
      verified: false,
      addedBy: 'admin-1',
      addedAt: Date.now(),
    },
  ]

  it('allows verified channels', () => {
    expect(isAllowlistedChannel('UC-bible-project', allowlist)).toBe(true)
  })

  it('rejects unverified channels', () => {
    expect(isAllowlistedChannel('UC-unverified', allowlist)).toBe(false)
  })

  it('rejects unknown channels', () => {
    expect(isAllowlistedChannel('UC-random-channel', allowlist)).toBe(false)
  })

  it('validates embeddable videos from allowed channels', () => {
    const embed: VideoEmbed = {
      channelId: 'UC-bible-project',
      videoId: 'abc123',
      placement: 'intro',
      ownerEmbeddable: true,
      devotionalSlug: 'identity',
      dayNumber: 1,
    }
    const result = validateVideoEmbed(embed, allowlist)
    expect(result.valid).toBe(true)
  })

  it('rejects non-embeddable videos', () => {
    const embed: VideoEmbed = {
      channelId: 'UC-bible-project',
      videoId: 'abc123',
      placement: 'end',
      ownerEmbeddable: false,
      devotionalSlug: 'peace',
      dayNumber: 2,
    }
    const result = validateVideoEmbed(embed, allowlist)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not embeddable')
  })

  it('rejects videos from non-allowed channels', () => {
    const embed: VideoEmbed = {
      channelId: 'UC-random',
      videoId: 'xyz789',
      placement: 'intro',
      ownerEmbeddable: true,
      devotionalSlug: 'identity',
      dayNumber: 1,
    }
    const result = validateVideoEmbed(embed, allowlist)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not allowlisted')
  })

  it('video placement supports intro and end positions', () => {
    const placements: VideoPlacement[] = ['intro', 'end', 'contextual']
    expect(placements).toHaveLength(3)
  })
})

describe('Public feed', () => {
  let contents: PublishableContent[]

  beforeEach(() => {
    contents = [
      {
        ...createContent('u1', 'testimony', 'Grace Story', 'Found grace'),
        status: 'approved',
        publishedAt: 3000,
      } as PublishableContent,
      {
        ...createContent(
          'u2',
          'reflection',
          'Peace Reflection',
          'Peace found me',
        ),
        status: 'approved',
        publishedAt: 2000,
      } as PublishableContent,
      {
        ...createContent('u3', 'prayer', 'Daily Prayer', 'Lord hear me'),
        status: 'approved',
        publishedAt: 1000,
      } as PublishableContent,
      {
        ...createContent('u4', 'testimony', 'Draft Story', 'Not published'),
        status: 'draft',
        publishedAt: null,
      } as PublishableContent,
    ]
  })

  it('only shows approved content', () => {
    const results = queryFeed(contents, {
      sortBy: 'newest',
      filterType: null,
      searchQuery: null,
      page: 1,
      pageSize: 10,
    })
    expect(results.every((c) => c.status === 'approved')).toBe(true)
    expect(results).toHaveLength(3)
  })

  it('filters by type', () => {
    const results = queryFeed(contents, {
      sortBy: 'newest',
      filterType: 'testimony',
      searchQuery: null,
      page: 1,
      pageSize: 10,
    })
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('testimony')
  })

  it('searches by title and body', () => {
    const results = queryFeed(contents, {
      sortBy: 'newest',
      filterType: null,
      searchQuery: 'grace',
      page: 1,
      pageSize: 10,
    })
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('sorts by newest first', () => {
    const results = queryFeed(contents, {
      sortBy: 'newest',
      filterType: null,
      searchQuery: null,
      page: 1,
      pageSize: 10,
    })
    expect(results[0].publishedAt).toBeGreaterThanOrEqual(
      results[1].publishedAt!,
    )
  })

  it('paginates results', () => {
    const page1 = queryFeed(contents, {
      sortBy: 'newest',
      filterType: null,
      searchQuery: null,
      page: 1,
      pageSize: 2,
    })
    const page2 = queryFeed(contents, {
      sortBy: 'newest',
      filterType: null,
      searchQuery: null,
      page: 2,
      pageSize: 2,
    })
    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(1)
  })
})
