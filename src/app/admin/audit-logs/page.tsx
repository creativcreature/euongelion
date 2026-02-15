import AdminShell from '@/components/AdminShell'

const LOGS = [
  {
    id: 'LOG-9012',
    action: 'Moderation approved',
    actor: 'admin@euangelion.app',
    at: '2026-02-15 09:12 UTC',
  },
  {
    id: 'LOG-9011',
    action: 'YouTube channel added',
    actor: 'admin@euangelion.app',
    at: '2026-02-15 08:57 UTC',
  },
  {
    id: 'LOG-9010',
    action: 'Feed rule updated',
    actor: 'admin@euangelion.app',
    at: '2026-02-15 08:31 UTC',
  },
]

export default function AdminAuditLogsPage() {
  return (
    <AdminShell
      title="Audit Logs"
      kicker="ACTION HISTORY"
      activeHref="/admin/audit-logs"
    >
      <div className="grid gap-2">
        {LOGS.map((entry) => (
          <article
            key={entry.id}
            className="grid gap-1 border border-[var(--color-border)] px-3 py-2 md:grid-cols-[160px_1fr_auto]"
          >
            <p className="text-label vw-small text-gold">{entry.id}</p>
            <p className="vw-small">{entry.action}</p>
            <p className="text-label vw-small text-muted">{entry.at}</p>
            <p className="vw-small text-secondary md:col-span-3">
              Actor: {entry.actor}
            </p>
          </article>
        ))}
      </div>
    </AdminShell>
  )
}
