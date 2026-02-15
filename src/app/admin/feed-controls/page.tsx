import AdminShell from '@/components/AdminShell'

export default function AdminFeedControlsPage() {
  return (
    <AdminShell
      title="Feed Controls"
      kicker="DISCOVER FEED RULES"
      activeHref="/admin/feed-controls"
    >
      <section className="mb-4 border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">SORT MODE</p>
        <div className="flex flex-wrap gap-2">
          {['Newest', 'Most Saved', 'Editorial Priority'].map((mode) => (
            <button
              key={mode}
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">VISIBILITY WINDOWS</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-label vw-small text-muted">
              Featured shelf (days)
            </span>
            <input
              defaultValue={7}
              className="border border-[var(--color-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-label vw-small text-muted">
              Trending shelf (hours)
            </span>
            <input
              defaultValue={48}
              className="border border-[var(--color-border)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
      </section>
    </AdminShell>
  )
}
