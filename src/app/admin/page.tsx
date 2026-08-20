import Link from 'next/link'
import AdminShell from '@/components/AdminShell'
import { getReviewQueue } from '@/lib/edition/store'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'

/**
 * SA-114 / F-158 — the real admin hub.
 *
 * The previous dashboard was a mockup: a pending-submission count, channel
 * tallies, a dollar figure, an events-per-week number — every one invented
 * (Development Rule 6). This page now shows exactly one number, and it is
 * read from the database at request time: the count of edition drafts
 * awaiting review. Everything else is a link card to a real surface, with
 * copy that says what that surface actually is.
 */

export const metadata = {
  title: 'Admin | Euangelion',
  description: 'The doorway to every real admin surface.',
}

// The count must be read per request — a stale prerendered queue count is a
// fabricated number with extra steps. (The /admin layout already forces
// dynamic rendering for the auth gate; this keeps the page honest on its own.)
export const dynamic = 'force-dynamic'

const READING_GATE_URL =
  'https://github.com/creativcreature/euongelion/pulls?q=is%3Apr+is%3Aopen+label%3A%22reading+gate%22'

function cardClass(strong = false) {
  return `block border p-4 ${
    strong
      ? 'border-[var(--color-border-strong)]'
      : 'border-[var(--color-border)]'
  }`
}

export default async function AdminDashboardPage() {
  // Page-level gate — the layout gate alone leaks streamed markup (SA-114).
  await assertAdminOr404()

  // Real count, or a visible failure — never a plausible zero (Rule 1).
  let draftCount: number | null = null
  let queueReadError: string | null = null
  try {
    draftCount = (await getReviewQueue()).length
  } catch (error) {
    queueReadError = error instanceof Error ? error.message : String(error)
  }

  return (
    <AdminShell title="Admin" kicker="THE BACK OFFICE" activeHref="/admin">
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/edition"
          className={cardClass(true)}
          data-testid="hub-card-edition-queue"
        >
          <p className="text-label vw-small text-gold">Edition Queue</p>
          {queueReadError ? (
            <p className="vw-body mt-2" role="alert">
              Queue count unavailable — {queueReadError}
            </p>
          ) : (
            <p className="vw-body mt-2">
              {draftCount === 1
                ? '1 draft awaiting review'
                : `${draftCount} drafts awaiting review`}
            </p>
          )}
          <p className="vw-small mt-1 text-secondary">
            Every drafted section of The Daily Bread stops here for a verdict
            before it prints.
          </p>
        </Link>

        <Link
          href="/admin/preview/daily-bread"
          className={cardClass(true)}
          data-testid="hub-card-daily-bread-preview"
        >
          <p className="text-label vw-small text-gold">Daily Bread Preview</p>
          <p className="vw-body mt-2">
            Tomorrow&rsquo;s paper, rendered real, with approve/reject in place.
          </p>
          <p className="vw-small mt-1 text-secondary">
            Read the whole edition the way readers will before any of it
            publishes.
          </p>
        </Link>

        <Link
          href="/admin/edition#next-series"
          className={cardClass(true)}
          data-testid="hub-card-next-series"
        >
          <p className="text-label vw-small text-gold">
            Next Week&rsquo;s Series
          </p>
          <p className="vw-body mt-2">The thematic box.</p>
          <p className="vw-small mt-1 text-secondary">
            Drop a one-line thematic and the Wednesday weekly-series run builds
            next week around it. Used once, then archived.
          </p>
        </Link>

        <a
          href={READING_GATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cardClass(true)}
          data-testid="hub-card-reading-gate"
        >
          <p className="text-label vw-small text-gold">Series Reading Gate</p>
          <p className="vw-body mt-2">
            Series approval is merge-on-GitHub, not a button here.
          </p>
          <p className="vw-small mt-1 text-secondary">
            Each drafted series arrives as a pull request labeled &ldquo;reading
            gate&rdquo;. Read it there; merging it is the approval.
          </p>
        </a>
      </div>

      {/* SA-114 / F-158: these three surfaces exist in the nav but have no
          real data source yet. Say so — do not decorate them with numbers. */}
      <h2 className="text-label vw-small mt-8 mb-4 text-muted">
        NOT YET WIRED
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/moderation" className={cardClass()}>
          <p className="text-label vw-small text-gold">Moderation</p>
          <p className="vw-small mt-2 text-secondary">
            No reader submissions exist to moderate. Editorial review happens in
            the Edition Queue.
          </p>
        </Link>
        <Link href="/admin/transparency" className={cardClass()}>
          <p className="text-label vw-small text-gold">Transparency</p>
          <p className="vw-small mt-2 text-secondary">
            No donations ledger is wired. The public record lives at
            /donation-disclosure.
          </p>
        </Link>
        <Link href="/admin/audit-logs" className={cardClass()}>
          <p className="text-label vw-small text-gold">Audit Logs</p>
          <p className="vw-small mt-2 text-secondary">
            No browsable log store yet. Edition verdicts are stamped on their
            rows; nothing else is recorded.
          </p>
        </Link>
      </div>
    </AdminShell>
  )
}
