import AdminShell from '@/components/AdminShell'

const ALLOCATION = [
  { label: 'Charity', percent: 60 },
  { label: 'Operations', percent: 25 },
  { label: 'Labor', percent: 15 },
]

export default function AdminTransparencyPage() {
  return (
    <AdminShell
      title="Transparency Metrics"
      kicker="DONATION ALLOCATION"
      activeHref="/admin/transparency"
    >
      <section className="mb-4 border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">CURRENT SPLIT</p>
        <div className="grid gap-2">
          {ALLOCATION.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border border-[var(--color-border)] px-3 py-2"
            >
              <p className="vw-small">{item.label}</p>
              <p className="text-label vw-small">{item.percent}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">
          PUBLIC DASHBOARD SYNC
        </p>
        <p className="vw-small mb-4 text-secondary">
          Publish latest allocation snapshots to user-facing transparency pages.
        </p>
        <button
          type="button"
          className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
        >
          Publish Snapshot
        </button>
      </section>
    </AdminShell>
  )
}
