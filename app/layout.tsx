import './globals.css'
import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Golden Goose Tees - Wear Your Truth. Loudly.',
  description: 'Custom apparel design studio - Create unique designs on premium t-shirts, hoodies, and more',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
