/**
 * LAB — the scroll hole, in literal context (SA-114 / F-158): today's REAL
 * paper, rendered by the real EditionPage, flowing past the seam into the
 * proposed well. Founder-only.
 */
import type { Metadata } from 'next'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import EditionPage from '@/components/edition/EditionPage'
import LabWell from '@/components/lab/LabWell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lab — the scroll hole | Euangelion',
  robots: { index: false },
}

export default async function ScrollHoleLab() {
  await assertAdminOr404()
  return (
    <div>
      <div className="edition-archive-band">
        <p>
          LAB — today&apos;s REAL paper, continuing into the proposed well.
          Scroll to the very end.
        </p>
      </div>
      <EditionPage date={new Date()} />
      <LabWell />
    </div>
  )
}
