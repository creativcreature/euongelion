import type { Metadata } from 'next'

// /settings is a client component and cannot export metadata itself, so the
// page title lives here (otherwise the tab falls back to the bare "Euangelion"
// default). The root template appends " | Euangelion".
export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
