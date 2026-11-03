import HomeClient from '@/components/HomeClient'
import { generateOrganizationSchema, generateLocalBusinessSchema, generateWebsiteSchema } from '@/lib/seo'
import { generateGlobalFAQSchema } from '@/lib/geo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.mmearthmovers.com',
  },
  description: 'MM Earthmovers — Premium earthmoving equipment spare parts supplier in Kolkata. Loader parts, excavator spares, motor grader spare parts. Coverage includes :  HM, BEML, L&T, XCMG, Komatsu, JCB and many more. Contact for pricing. Global shipping available.',
  keywords: [
    'mm earthmovers',
    'mm earthmovers kolkata',
    'earthmoving machinery spare parts kolkata',
    'heavy equipment spare parts supplier india',
    'wheel loader spare parts dealer',
    'motor grader replacement parts india',
    'hydraulic excavator spares distributor',
    'hm 2021 loader parts kolkata',
    'beml bg 605 grader spare parts',
    'lt 9020 loader parts supplier',
    'liugong wheel loader spare parts india',
    'xcmg sdlg loader spare parts',
    'heavy machinery parts metcalf lane kolkata',
    'earthmoving spares wholesale india',
    'heavy equipment parts exporter nepal bhutan',
    'genuine replacement earthmoving spares',
  ],
}

export default function Home() {
  const organizationSchema = generateOrganizationSchema()
  const localBusinessSchema = generateLocalBusinessSchema()
  const websiteSchema = generateWebsiteSchema()
  const globalFAQSchema = generateGlobalFAQSchema()

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(globalFAQSchema) }}
      />
      <HomeClient />
    </>
  )
}
