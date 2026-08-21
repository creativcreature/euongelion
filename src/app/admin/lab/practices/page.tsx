/**
 * LAB — round-two mechanics as REAL compartments (SA-114 / F-158),
 * rendered in the paper's own grammar for review in literal context.
 * Founder-only.
 */
import type { Metadata } from 'next'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import LabPractices from '@/components/lab/LabPractices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lab — the practices | Euangelion',
  robots: { index: false },
}

export default async function PracticesLab() {
  await assertAdminOr404()
  return (
    <div className="mock-paper newspaper-reading">
      <div className="edition-archive-band">
        <p>
          LAB — round-two mechanics, in the paper&apos;s own compartments.
          Everything works.
        </p>
      </div>
      <EuangelionShellHeader />
      <main id="main-content" className="lab-main">
        <h1 className="edition-archive-title">The practices</h1>
        <p className="edition-archive-stand">
          Not retention mechanics — things to do that are themselves formation.
          Resize the window for mobile; these are the real responsive
          compartments.
        </p>
        <LabPractices />
      </main>
      <SiteBottom />
    </div>
  )
}
