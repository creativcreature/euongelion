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
    bookmarks: `Bookmarks are retained for ${RETENTION_POLICY.bookmarksDays} days in anonymous mode.`,
    notesHighlightsChat: `Notes, highlights, and chat history are retained for ${RETENTION_POLICY.notesDays} days in mock account mode.`,
    archiveAndTrash: `Archived artifacts are retained for ${RETENTION_POLICY.archivedArtifactsDays} days. Trash items can be restored for ${RETENTION_POLICY.trashRestoreWindowDays} days.`,
  }
}
