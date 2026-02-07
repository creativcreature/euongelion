import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Playfair_Display } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: { default: 'Euangelion', template: '%s | Euangelion' },
  description:
    'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
  metadataBase: new URL('https://euangelion.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Euangelion',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
