import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function DevotionalLoading() {
  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader brandWord="WAKE UP" tone="wake" />
        <section className="mock-section-center" style={{ minHeight: '320px' }}>
          <p className="text-label mock-kicker">READING</p>
          <h1 className="mock-title-center">
            Opening this day&apos;s reading.
          </h1>
          <p className="mock-subcopy-center">One moment.</p>
        </section>
      </main>
    </div>
  )
}
