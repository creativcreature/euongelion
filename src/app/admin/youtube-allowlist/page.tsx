import AdminShell from '@/components/AdminShell'

const CHANNELS = [
  { name: 'Bible Project', channelId: 'UCVfwlh9XpX2Y_tQfjeln9QA' },
  { name: 'The Bible Recap', channelId: 'UC_j4jYQ5v_2X8YB3j8j9z8w' },
  { name: 'Crossway', channelId: 'UCf4P4xI2yVmL0zFyrM0Q0tQ' },
]

export default function AdminYoutubeAllowlistPage() {
  return (
    <AdminShell
      title="YouTube Allowlist"
      kicker="CONTENT SOURCE CONTROL"
      activeHref="/admin/youtube-allowlist"
    >
      <section className="mb-6 border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">ADD CHANNEL</p>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="border border-[var(--color-border)] bg-transparent px-3 py-2"
            placeholder="Channel name"
            aria-label="Channel name"
          />
          <input
            className="border border-[var(--color-border)] bg-transparent px-3 py-2"
            placeholder="YouTube channel id"
            aria-label="YouTube channel id"
          />
          <button
            type="button"
            className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
          >
            ADD
          </button>
        </form>
      </section>

      <section className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-3 text-gold">ACTIVE CHANNELS</p>
        <div className="grid gap-2">
          {CHANNELS.map((channel) => (
            <article
              key={channel.channelId}
              className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border)] px-3 py-2"
            >
              <div>
                <p className="vw-small">{channel.name}</p>
                <p className="text-label vw-small text-muted">
                  {channel.channelId}
                </p>
              </div>
              <button
                type="button"
                className="text-label vw-small link-highlight"
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  )
}
