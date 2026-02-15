import AdminShell from '@/components/AdminShell'

const QUEUE = [
  { id: 'PUB-2081', title: 'Identity in Exile', status: 'flagged' },
  { id: 'PUB-2082', title: 'Faith Under Pressure', status: 'pending' },
  { id: 'PUB-2083', title: 'Mercy in Conflict', status: 'pending' },
]

export default function AdminModerationPage() {
  return (
    <AdminShell
      title="Moderation Queue"
      kicker="PUBLICATION REVIEW"
      activeHref="/admin/moderation"
    >
      <div className="grid gap-3">
        {QUEUE.map((entry) => (
          <article
            key={entry.id}
            className="border border-[var(--color-border)] p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-label vw-small text-gold">{entry.id}</p>
              <p className="text-label vw-small text-muted">{entry.status}</p>
            </div>
            <h2 className="vw-body mb-3">{entry.title}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
              >
                Approve
              </button>
              <button
                type="button"
                className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
              >
                Reject
              </button>
              <button
                type="button"
                className="text-label vw-small link-highlight"
              >
                View full report
              </button>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  )
}
