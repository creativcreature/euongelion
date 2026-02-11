import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import Providers from './providers'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
})

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
    <html
      lang="en"
      className={`dark ${inter.variable} ${instrumentSerif.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
