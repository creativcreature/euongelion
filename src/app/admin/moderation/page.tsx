import Link from 'next/link'
import AdminShell from '@/components/AdminShell'

/**
 * SA-114 / F-158: the fabricated queue (PUB-2081 "Identity in Exile"…) and
 * its dead Approve/Reject buttons are gone (Development Rule 6). Nothing
 * feeds a moderation queue — the product has no reader submissions to
 * moderate. This page says so honestly instead of performing a queue.
 */
export const metadata = {
  title: 'Moderation | Euangelion',
  description: 'Reader-submission moderation — not yet wired.',
}

export default function AdminModerationPage() {
  return (
    <AdminShell
      title="Moderation Queue"
      kicker="PUBLICATION REVIEW"
      activeHref="/admin/moderation"
    >
      <div className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-2 text-gold">NOT YET WIRED</p>
        <p className="vw-body mb-2">
          There is no moderation queue because there is nothing to moderate: the
          product takes no reader submissions today.
        </p>
        <p className="vw-small text-secondary">
          The editorial review that does exist — approving or rejecting drafted
          sections of The Daily Bread — lives in the{' '}
          <Link href="/admin/edition" className="link-highlight">
            Edition Queue
          </Link>
          . This page becomes real when a submissions pathway ships.
        </p>
      </div>
    </AdminShell>
  )
}
