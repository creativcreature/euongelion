/**
 * LAB — futures. Admin-gated, noindex, and the ONLY place futures.css is
 * imported, so none of these treatments can reach a reader by accident.
 */
import type { Metadata } from 'next'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import './futures.css'

export const metadata: Metadata = {
  title: 'Lab — the proof | Euangelion',
  robots: { index: false, follow: false },
}

export default async function FuturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await assertAdminOr404()
  return <>{children}</>
}
