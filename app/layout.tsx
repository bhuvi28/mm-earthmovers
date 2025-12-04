import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mmearthmovers.com'),
  title: {
    default: 'MM Earthmovers - Heavy Equipment Spare Parts | Loader, Excavator & MotorGrader Parts',
    template: '%s | MM Earthmovers',
  },
  description:
    'Premium supplier of heavy earthmoving machinery spare parts in Kolkata, India. Genuine parts for loaders, excavators, motor graders - HM, BEML, L&T, XCMG, Komatsu, and more brands.',
  keywords: [
    'heavy equipment parts',
    'loader spare parts',
    'excavator parts',
    'motor grader parts',
    'earthmoving machinery parts',
    'HM parts',
    'HM 2021 parts',
    'HM 2021 B parts',
    'HM 2021 D parts',
    'HM 2021 E parts',
    'TATA 3036 parts',
    'L&T 9020 parts',
    'JCB 430 parts',
    'JCB 3DX parts',
    'BEML BG 605 parts',
    'BEML BG 511 parts',
    'SLDG parts',
    'XCMG parts',
    'LIUGONG parts',
    'Komatsu parts',
    'construction equipment parts',
    'Kolkata',
    'India',
    'genuine parts',
    'aftermarket parts',
  ],
  authors: [{ name: 'MM Earthmovers' }],
  creator: 'MM Earthmovers',
  publisher: 'MM Earthmovers',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.mmearthmovers.com',
    siteName: 'MM Earthmovers',
    title: 'MM Earthmovers - Heavy Equipment Spare Parts Supplier',
    description:
      'Premium supplier of heavy earthmoving machinery spare parts. Genuine parts for loaders, excavators, motor graders in Kolkata, India.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MM Earthmovers - Heavy Earthmoving Machinery Spare Parts',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'MM Earthmovers - Heavy Equipment Spare Parts',
    description: 'Premium supplier of loader, excavator, and motor grader spare parts in India.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  verification: {
    // Add Google Search Console verification code here when available
    // google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth light">
      <head>
        <link rel="canonical" href="https://www.mmearthmovers.com" />
      </head>
      <body className={`${inter.className} antialiased bg-white`}>
        {children}
      </body>
    </html>
  )
}
