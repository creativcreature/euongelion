import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

type InfoSection = {
  title: string
  body: string[]
}

export default function StaticInfoPage({
  breadcrumb,
  kicker,
  title,
  sections,
}: {
  breadcrumb: string
  kicker: string
  title: string
  sections: InfoSection[]
}) {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-4xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: breadcrumb }]}
          />
          <header className="mb-10">
            <p className="text-label vw-small mb-3 text-gold">{kicker}</p>
            <h1 className="vw-heading-md">{title}</h1>
          </header>
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-label vw-small mb-3 text-gold">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.map((line, index) => (
                    <p key={`${section.title}-${index}`} className="vw-body">
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
