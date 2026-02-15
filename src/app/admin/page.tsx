import AdminShell from '@/components/AdminShell'

export const metadata = {
  title: 'Admin Dashboard | Euangelion',
  description:
    'Operational controls for moderation, feeds, transparency, and logs.',
}

export default function AdminDashboardPage() {
  return (
    <AdminShell
      title="Admin Dashboard"
      kicker="OPS OVERVIEW"
      activeHref="/admin"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <article className="border border-[var(--color-border)] p-4">
          <p className="text-label vw-small text-gold">Moderation Queue</p>
          <p className="vw-body mt-2">12 pending submissions</p>
          <p className="vw-small mt-1 text-secondary">
            Triage flagged devotional publications and approve/reject decisions.
          </p>
        </article>
        <article className="border border-[var(--color-border)] p-4">
          <p className="text-label vw-small text-gold">Feed Health</p>
          <p className="vw-body mt-2">3 channels active</p>
          <p className="vw-small mt-1 text-secondary">
            Validate discover feed ordering, freshness windows, and visibility.
          </p>
        </article>
        <article className="border border-[var(--color-border)] p-4">
          <p className="text-label vw-small text-gold">Transparency Ledger</p>
          <p className="vw-body mt-2">$2,140 this cycle</p>
          <p className="vw-small mt-1 text-secondary">
            Current split: 60% charity, 25% ops, 15% labor.
          </p>
        </article>
        <article className="border border-[var(--color-border)] p-4">
          <p className="text-label vw-small text-gold">Audit Trail</p>
          <p className="vw-body mt-2">247 events in 7 days</p>
          <p className="vw-small mt-1 text-secondary">
            Capture moderation and publication actions for accountability.
          </p>
        </article>
      </div>
    </AdminShell>
  )
}
