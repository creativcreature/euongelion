export interface RetentionPolicy {
  anonymousSessionDays: number
  bookmarksDays: number
  notesDays: number
  highlightsDays: number
  chatHistoryDays: number
  archivedArtifactsDays: number
  trashRestoreWindowDays: number
}

export const RETENTION_POLICY: RetentionPolicy = {
  anonymousSessionDays: 30,
  bookmarksDays: 30,
  notesDays: 90,
  highlightsDays: 90,
  chatHistoryDays: 90,
  archivedArtifactsDays: 180,
  trashRestoreWindowDays: 30,
}

export function retentionPolicySummary() {
  return {
    anonymousSession: `Anonymous session data is retained for ${RETENTION_POLICY.anonymousSessionDays} days.`,
    bookmarks: `Bookmarks require sign-in and are kept until you remove them or delete your account; legacy anonymous bookmarks are purged after ${RETENTION_POLICY.bookmarksDays} days.`,
    notesHighlightsChat: `Notes and highlights require sign-in and are kept until you remove them or delete your account; saved chat threads are retained for ${RETENTION_POLICY.chatHistoryDays} days.`,
    archiveAndTrash: `Archived artifacts are retained for ${RETENTION_POLICY.archivedArtifactsDays} days. Trash items can be restored for ${RETENTION_POLICY.trashRestoreWindowDays} days.`,
  }
}

/**
 * Per-artifact retention-clarity labels (F-037: Retention clarity).
 *
 * Each row answers the three questions a privacy-conscious user asks of
 * any stored artifact: WHAT is kept, WHERE it lives, and HOW LONG it is
 * kept. These power the explicit retention table in Settings and the
 * Privacy page so the policy is visible per artifact type, not buried in
 * a wall of prose. Durations read from `RETENTION_POLICY` so the copy can
 * never drift from the enforced numbers.
 */
export interface RetentionClarityRow {
  /** Stable key for React lists + test assertions. */
  id: string
  /** Human label for the artifact type. */
  artifact: string
  /** What is actually stored. */
  what: string
  /** Where it is stored (boundary). */
  where: string
  /** How long it is retained, in plain language. */
  retention: string
}

export function retentionClarityRows(): RetentionClarityRow[] {
  return [
    {
      id: 'anonymous-session',
      artifact: 'Anonymous session',
      what: 'A random session token and your in-progress reading position. No name, email, or account.',
      where:
        'A first-party cookie on this device, plus a session row in our database.',
      retention: `Kept for ${RETENTION_POLICY.anonymousSessionDays} days of inactivity, then deleted.`,
    },
    {
      id: 'bookmarks',
      artifact: 'Bookmarks',
      what: 'The readings you save for later. Saving requires sign-in.',
      where: 'Our database, keyed to your signed-in account.',
      retention: `Kept until you remove them or delete your account. Legacy anonymous bookmarks are purged on the ${RETENTION_POLICY.anonymousSessionDays}-day anonymous-session schedule.`,
    },
    {
      id: 'notes-highlights',
      artifact: 'Notes & highlights',
      what: 'Notes, highlights, sticky notes, and stickers you add to a reading. Saving requires sign-in.',
      where: 'Our database, keyed to your signed-in account.',
      retention: `Kept until you remove them or delete your account. Legacy anonymous rows are purged on the ${RETENTION_POLICY.anonymousSessionDays}-day anonymous-session schedule.`,
    },
    {
      id: 'chat-history',
      artifact: 'Study chat history',
      what: 'Saved study-chat threads (live chat drafts stay in this browser only).',
      where: 'Our database for saved threads; localStorage for unsaved drafts.',
      retention: `Saved threads kept for ${RETENTION_POLICY.chatHistoryDays} days.`,
    },
    {
      id: 'audit-reflections',
      artifact: 'Soul Audit reflections',
      what: 'The text you enter into the Soul Audit and the pathways it generated.',
      where: 'Our database, keyed by session token.',
      retention: `Kept with your anonymous session (${RETENTION_POLICY.anonymousSessionDays} days) or your account.`,
    },
    {
      id: 'archive-trash',
      artifact: 'Archive & trash',
      what: 'Completed plans and artifacts you have archived or sent to trash.',
      where: 'Our database.',
      retention: `Archived artifacts kept for ${RETENTION_POLICY.archivedArtifactsDays} days; trash is restorable for ${RETENTION_POLICY.trashRestoreWindowDays} days, then purged.`,
    },
  ]
}
