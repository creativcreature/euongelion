import AdminShell from '@/components/AdminShell'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import EditionQueueClient from './EditionQueueClient'

export const metadata = {
  title: 'Edition Queue | Euangelion',
  description:
    'Review the drafted sections of The Daily Bread before they publish.',
}

export default async function AdminEditionPage() {
  // Page-level gate — the layout gate alone leaks streamed markup (SA-114).
  await assertAdminOr404()

  return (
    <AdminShell
      title="Edition Queue"
      kicker="THE DAILY BREAD"
      activeHref="/admin/edition"
    >
      <EditionQueueClient />
    </AdminShell>
  )
}
