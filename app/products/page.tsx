import { getProducts } from '@/lib/products'
import ProductsPage from '@/components/ProductsPage'
import Footer from '@/components/Footer'
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'
import { generateCategoryMetadata, generateBreadcrumbSchema } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}): Promise<Metadata> {
  const category = typeof searchParams.category === 'string' ? searchParams.category : 'loader'
  const categoryMeta = generateCategoryMetadata(category)

  return {
    title: categoryMeta.title,
    description: categoryMeta.description,
    keywords: categoryMeta.keywords,
    alternates: {
      canonical: `https://www.mmearthmovers.com/products?category=${category}`,
    },
  }
}

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const products = getProducts()
  
  // Get category from search params, default to first one or 'loader'
  const category = typeof searchParams.category === 'string' ? searchParams.category : 'loader'

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Products', url: `https://www.mmearthmovers.com/products?category=${category}` },
  ])
  
  return (
    <main className="min-h-screen">
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ClientHeaderWrapper />
      <ProductsPage 
        initialCategory={category}
        products={products}
      />
      <Footer />
    </main>
  )
}
