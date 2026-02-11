import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Euangelion', template: '%s | Euangelion' },
  description:
    'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
  metadataBase: new URL('https://euangelion.app'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Euangelion',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Euangelion',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  other: {
    'theme-color': '#1a1612',
    'apple-mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="/fonts/InstrumentSerif-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/InstrumentSerif-Italic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="newsprint-site antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
