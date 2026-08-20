import Link from 'next/link'
import AdminShell from '@/components/AdminShell'

/**
 * SA-114 / F-158: the dollars-this-cycle figure was invented and the
 * "Publish Snapshot" button had no handler — both gone (Development Rule 6).
 * What is
 * real: the committed default allocation split, which is public policy on
 * /donation-disclosure, and the fact that no donations ledger is wired yet.
 */
export const metadata = {
  title: 'Transparency | Euangelion',
  description: 'Donation allocation reporting — not yet wired.',
}

// The committed default split — policy, not live data. It is published
// verbatim on /donation-disclosure; if it changes there, change it here.
const COMMITTED_SPLIT = [
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
        <p className="text-label vw-small mb-2 text-gold">NOT YET WIRED</p>
        <p className="vw-body mb-2">
          No donations ledger is wired, and no donations have been reported.
          There are no metrics to show here yet.
        </p>
        <p className="vw-small text-secondary">
          The public record is{' '}
          <Link href="/donation-disclosure" className="link-highlight">
            /donation-disclosure
          </Link>
          , which currently — and truthfully — says there is nothing to report.
        </p>
      </section>

      <section className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">
          COMMITTED DEFAULT SPLIT
        </p>
        <p className="vw-small mb-3 text-secondary">
          This is policy, not live data — the allocation committed publicly on
          the disclosure page for when contributions arrive.
        </p>
        <div className="grid gap-2">
          {COMMITTED_SPLIT.map((item) => (
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
    </AdminShell>
  )
}
