interface HoldingStateProps {
  theme: string
  startDate: string
}

function formatStartDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function HoldingState({ theme, startDate }: HoldingStateProps) {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="text-label vw-small mb-3 text-gold">DAILY BREAD</p>
      <h1 className="vw-heading-md mb-4">
        Your plan begins {formatStartDate(startDate)}.
      </h1>
      <p className="vw-body mb-6 text-secondary">Prepare your heart.</p>
      <div
        className="mx-auto max-w-sm border px-6 py-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-label vw-small mb-1 text-gold">THEME</p>
        <p className="vw-body text-secondary">{theme}</p>
      </div>
      <p className="vw-small mt-8 text-muted">
        Your 7-day devotional plan is ready and waiting. When the start date
        arrives, Day 1 will unlock automatically.
      </p>
    </div>
  )
}
