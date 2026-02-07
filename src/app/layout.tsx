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
  title: 'Euangelion',
  description: 'Daily bread for the cluttered, hungry soul.',
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
