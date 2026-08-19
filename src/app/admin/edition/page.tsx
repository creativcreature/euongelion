import AdminShell from '@/components/AdminShell'
import EditionQueueClient from './EditionQueueClient'

export const metadata = {
  title: 'Edition Queue | Euangelion',
  description:
    'Review the drafted sections of The Daily Bread before they publish.',
}

export default function AdminEditionPage() {
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
