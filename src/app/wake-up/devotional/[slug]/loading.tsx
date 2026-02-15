import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function DevotionalLoading() {
  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader brandWord="WAKE UP" tone="wake" />
        <section className="mock-section-center" style={{ minHeight: '320px' }}>
          <p className="text-label mock-kicker">LOADING</p>
          <h1 className="mock-title-center">Preparing your devotional.</h1>
          <p className="mock-subcopy-center">
            Bringing today&apos;s reading into view.
          </p>
        </section>
      </main>
    </div>
  )
}
