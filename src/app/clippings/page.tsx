import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import ClippingsList from '@/components/ClippingsList'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Clippings',
  description:
    'Passages you have clipped while reading. Kept entirely on your device.',
}

export default function ClippingsPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <ClippingsList />
        </section>
        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
