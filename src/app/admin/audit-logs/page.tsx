import AdminShell from '@/components/AdminShell'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'

/**
 * SA-114 / F-158: the fabricated entries (LOG-9012 "Moderation approved"…)
 * are gone (Development Rule 6). There is no audit-log store to read. The
 * only admin action that leaves a trace today is an edition verdict, which
 * stamps `approved_by` / `approved_at` on its `edition_items` row — real,
 * but not a browsable log. This page says exactly that.
 */
export const metadata = {
  title: 'Audit Logs | Euangelion',
  description: 'Admin action history — not yet wired.',
}

export default async function AdminAuditLogsPage() {
  // Page-level gate — the layout gate alone leaks streamed markup (SA-114).
  await assertAdminOr404()

  return (
    <AdminShell
      title="Audit Logs"
      kicker="ACTION HISTORY"
      activeHref="/admin/audit-logs"
    >
      <div className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-2 text-gold">NOT YET WIRED</p>
        <p className="vw-body mb-2">
          There is no audit-log store, so there is no history to show here.
        </p>
        <p className="vw-small text-secondary">
          What is recorded today: every Edition Queue verdict stamps who
          approved or rejected the item, and when, on the item&rsquo;s own
          database row. A browsable trail arrives when a real log store exists —
          this page will read from it, not invent entries.
        </p>
      </div>
    </AdminShell>
  )
}
