import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
  },
  title: 'MM Earthmovers - Reliable Parts for Loaders & Motor Graders',
  description: 'Your trusted source for high-quality, genuine earthmover components. Professional heavy equipment parts supplier.',
  keywords: 'earthmovers, heavy equipment, loader parts, motor grader parts, hydraulic parts, wear items, attachments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth light">
      <body className={`${inter.className} antialiased bg-white`}>
        {children}
      </body>
    </html>
  )
}
