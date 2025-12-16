import { getProducts } from '@/lib/products'
import { generateProductMetadata, generateProductSchema, generateBreadcrumbSchema, formatPartNumbersForDisplay } from '@/lib/seo'
import { getProductUrlSlug } from '@/lib/utils'
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import ProductImageZoom from '@/components/ProductImageZoom'
import ExportInfo from '@/components/ExportInfo'

// Helper to normalize category slugs (matching logic in seo.ts)
const getCategorySlug = (category: string) => {
  const map: Record<string, string> = {
    'Loader': 'loader',
    'Excavator': 'excavator',
    'Motor Grader': 'grader',
    'Grader': 'grader',
  }
  return map[category] || 'loader'
}

// Helper to find product by URL slug (matches part number OR file slug)
const findProductBySlug = (slug: string, products: ReturnType<typeof getProducts>) => {
  // Try by canonical URL (part number) - Priority
  const canonicalMatch = products.find(p => getProductUrlSlug(p) === slug)
  if (canonicalMatch) return canonicalMatch

  // Try by File Slug (Legacy URL support)
  const legacyMatch = products.find(p => p.slug === slug)
  if (legacyMatch) return legacyMatch
  
  return undefined
}

export async function generateStaticParams() {
  const products = getProducts()
  return products.map((product) => ({
    category: getCategorySlug(product.category),
    slug: getProductUrlSlug(product),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string }
}): Promise<Metadata> {
  const products = getProducts()
  const product = findProductBySlug(params.slug, products)

  if (!product) {
    return {}
  }

  const seoMeta = generateProductMetadata(product)
  
  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    alternates: {
      canonical: `https://www.mmearthmovers.com/products/${params.category}/${params.slug}`,
    },
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: `https://www.mmearthmovers.com/products/${params.category}/${params.slug}`,
      siteName: 'MM Earthmovers',
      images: [
        {
          url: product.image.startsWith('http') ? product.image : `https://www.mmearthmovers.com${product.image}`,
          width: 800,
          height: 600,
          alt: product.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: seoMeta.title,
      description: seoMeta.description,
      images: [product.image.startsWith('http') ? product.image : `https://www.mmearthmovers.com${product.image}`],
    },
  }
}

export default function ProductPage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const products = getProducts()
  const product = findProductBySlug(params.slug, products)

  if (!product) {
    notFound()
  }

  // Check for Redirect: If the current URL slug doesn't match the canonical one
  const canonicalSlug = getProductUrlSlug(product)
  if (params.slug !== canonicalSlug) {
      permanentRedirect(`/products/${params.category}/${canonicalSlug}`)
  }

  const jsonLd = generateProductSchema(product)
  
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.mmearthmovers.com' },
    { name: 'Products', url: `https://www.mmearthmovers.com/products?category=${params.category}` },
    { name: product.title, url: `https://www.mmearthmovers.com/products/${params.category}/${params.slug}` },
  ])

  // Format brand
  const brandDisplay = Array.isArray(product.brand) ? product.brand.join(', ') : product.brand

  return (
    <main className="min-h-screen bg-white flex flex-col">
       {/* Schema */}
       <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <ClientHeaderWrapper />

      <div className="flex-grow py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          
          {/* Breadcrumbs */}
          <nav className="flex mb-8 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2">
            <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href={`/products?category=${params.category}`} className="hover:text-amber-600 transition-colors capitalize">
              {params.category === 'grader' ? 'Motor Grader' : params.category} Parts
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{product.title}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            


            {/* Image Section */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex items-center justify-center min-h-[400px]">
              <ProductImageZoom image={product.image} title={product.title} />
            </div>

            {/* Content Section */}
            <div className="flex flex-col">
              {brandDisplay && (
                <div className="text-amber-600 font-bold tracking-wider uppercase text-sm mb-2">
                  {brandDisplay}
                </div>
              )}
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {product.title}
              </h1>



              {product.part_number && (
                <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-lg w-fit border border-gray-100">
                    <span className="font-semibold text-gray-700">Part Number:</span>
                    <span className="text-lg font-mono text-gray-900">{formatPartNumbersForDisplay(product.part_number)}</span>
                </div>
              )}

              {/* International Export Info (Client Component) */}
              <ExportInfo />


              <div className="prose prose-gray max-w-none mb-8 text-gray-600 leading-relaxed">
                 <p>{product.content}</p>
              </div>

              {/* CTAs */}
              <div className="mt-auto space-y-4">
                 <a
                    href={`https://wa.me/+918334887009?text=${encodeURIComponent(`Hi, I am interested in ${product.title}${product.part_number ? ` (Part #: ${product.part_number})` : ''}. Please provide more details.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                 >
                    <span>Enquire Now</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                 </a>

                 <div className="pt-4">
                    <Link 
                        href={`/products?category=${params.category}`}
                        className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to all products
                    </Link>
                 </div>
              </div>

            </div>
          </div>

          {/* Similar Products Widget */}
          {(() => {
            const similarProducts = products
              .filter(p => p.category === product.category && getProductUrlSlug(p) !== getProductUrlSlug(product))
              .slice(0, 4);

            if (similarProducts.length === 0) return null;

            return (
              <div className="mt-20 border-t border-gray-100 pt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Similar Products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {similarProducts.map((simProduct) => (
                    <div key={getProductUrlSlug(simProduct)} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                      {/* Similar Product Image */}
                      <Link 
                        href={`/products/${params.category}/${getProductUrlSlug(simProduct)}`}
                        className="block relative aspect-square bg-gray-50 overflow-hidden"
                      >
                         {simProduct.image ? (
                           <img 
                             src={simProduct.image} 
                             alt={simProduct.title}
                             className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-300">
                             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                           </div>
                         )}
                      </Link>
                      
                      {/* Similar Product Content */}
                      <div className="p-4 flex flex-col flex-grow">
                        <Link 
                           href={`/products/${params.category}/${getProductUrlSlug(simProduct)}`}
                           className="hover:text-amber-600 transition-colors"
                        >
                            {simProduct.brand && (
                                <div className="text-amber-600 font-bold tracking-wider uppercase text-xs mb-1">
                                    {Array.isArray(simProduct.brand) ? simProduct.brand.join(', ') : simProduct.brand}
                                </div>
                            )}
                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2" title={simProduct.title}>
                                {simProduct.title}
                            </h3>
                        </Link>
                        
                        {simProduct.part_number && (
                            <div className="text-sm font-mono text-gray-500 mb-3">
                                Part: {formatPartNumbersForDisplay(simProduct.part_number)}
                            </div>
                        )}

                        <div className="mt-auto">
                           <a
                              href={`https://wa.me/+918334887009?text=${encodeURIComponent(`Hi, I am interested in ${simProduct.title}${simProduct.part_number ? ` (Part #: ${simProduct.part_number})` : ''}. Please provide more details.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 bg-gray-50 hover:bg-amber-600 hover:text-white text-gray-700 font-medium rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
                           >
                              Enquire
                           </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      <Footer />
    </main>
  )
}
