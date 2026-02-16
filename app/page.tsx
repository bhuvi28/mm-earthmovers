import HomeClient from '@/components/HomeClient'
import { generateOrganizationSchema, generateLocalBusinessSchema, generateWebsiteSchema } from '@/lib/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.mmearthmovers.com',
  },
  description: 'MM Earthmovers — Premium earthmoving equipment spare parts supplier in Kolkata. Loader parts, excavator spares, motor grader spare parts. Coverage includes :  HM, BEML, L&T, XCMG, Komatsu, JCB and many more. Contact for pricing. Global shipping available.',
}

export default function Home() {
  const organizationSchema = generateOrganizationSchema()
  const localBusinessSchema = generateLocalBusinessSchema()
  const websiteSchema = generateWebsiteSchema()

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
      <HomeClient />
    </>
  )
}

