import { getProducts } from '@/lib/products'
import ProductsPage from '@/components/ProductsPage'
import Footer from '@/components/Footer'
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'
import { generateProductMetadata, generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo'
import { CATEGORIES } from '@/lib/constants'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Generate static params for all products
export async function generateStaticParams() {
  const products = getProducts()
  
  const categoryMap: Record<string, string> = {
    Loader: 'loader',
    Excavator: 'excavator',
    'Motor Grader': 'grader',
    Grader: 'grader',
  }

  return products.map((product) => ({
    category: categoryMap[product.category] || 'loader',
    slug: product.slug,
  }))
}

// Generate metadata for each product
export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string }
}): Promise<Metadata> {
  const products = getProducts()
  const product = products.find((p) => p.slug === params.slug)

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  const productMeta = generateProductMetadata(product)
  const categorySlug = params.category

  return {
    title: productMeta.title,
    description: productMeta.description,
    keywords: productMeta.keywords,
    alternates: {
      canonical: `https://www.mmearthmovers.com/products/${categorySlug}/${params.slug}`,
    },
    openGraph: {
      title: productMeta.title,
      description: productMeta.description,
      url: `https://www.mmearthmovers.com/products/${categorySlug}/${params.slug}`,
      type: 'website',
      images: [
        {
          url: product.image.startsWith('http') 
            ? product.image 
            : `https://www.mmearthmovers.com${product.image}`,
          alt: product.title,
        },
      ],
    },
  }
}

export default function ProductPage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const products = getProducts()
  const product = products.find((p) => p.slug === params.slug)

  if (!product) {
    notFound()
  }

  // Get category details
  const categoryDetails = CATEGORIES.find((cat) => cat.id === params.category)

  // Generate schemas
  const productSchema = generateProductSchema(product)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    {
      name: categoryDetails?.name || 'Products',
      url: `https://www.mmearthmovers.com/products?category=${params.category}`,
    },
    {
      name: product.title,
      url: `https://www.mmearthmovers.com/products/${params.category}/${params.slug}`,
    },
  ])

  return (
    <main className="min-h-screen">
      {/* Product Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ClientHeaderWrapper />
      <ProductsPage
        initialCategory={params.category}
        products={products}
        selectedProductSlug={params.slug}
      />
      <Footer />
    </main>
  )
}
