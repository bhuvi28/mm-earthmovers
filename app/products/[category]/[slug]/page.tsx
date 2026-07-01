import { getProducts } from '@/lib/products'
import { generateProductMetadata, generateProductSchema, generateBreadcrumbSchema, formatPartNumbersForDisplay, getAllPartNumbers } from '@/lib/seo'
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
    title: {
      absolute: seoMeta.title,
    },
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
          url: product.image ? (product.image.startsWith('http') ? product.image : `https://www.mmearthmovers.com${product.image}`) : 'https://www.mmearthmovers.com/og-image.jpg',
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
      images: [product.image ? (product.image.startsWith('http') ? product.image : `https://www.mmearthmovers.com${product.image}`) : 'https://www.mmearthmovers.com/og-image.jpg'],
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
              <ProductImageZoom image={product.image} title={`${product.title}${product.part_number ? ` - Part No. ${formatPartNumbersForDisplay(product.part_number)}` : ''}${brandDisplay ? ` for ${brandDisplay}` : ''} | MM Earthmovers`} category={product.category} />
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

              {product.content && (
                <div className="prose prose-gray max-w-none mb-8 text-gray-600 leading-relaxed">
                   <p>{product.content}</p>
                </div>
              )}

              {/* Product Details Accordion — always visible, user-revealable */}
              <div className="mb-8">
                <details className="group border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-semibold text-sm">
                    <span>Product Details</span>
                    <svg className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 py-4 text-sm text-gray-600 space-y-3 border-t border-gray-100">
                    <p>
                      {`Quality replacement ${product.title} (Part No. ${formatPartNumbersForDisplay(product.part_number || product.slug)}) available from MM Earthmovers.`}
                      {brandDisplay ? ` Compatible with ${brandDisplay} ${product.category.toLowerCase()} machines.` : ''}
                    </p>
                    {product.part_number && getAllPartNumbers(product.part_number).length > 1 && (
                      <div>
                        <span className="font-medium text-gray-700">Also known as: </span>
                        {getAllPartNumbers(product.part_number).map((pn, i) => (
                          <span key={pn}>{i > 0 ? ', ' : ''}<code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{pn}</code></span>
                        ))}
                      </div>
                    )}
                    <table className="w-full text-left">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 font-medium text-gray-700 pr-4">Category</td>
                          <td className="py-2">{product.category} Spare Parts</td>
                        </tr>
                        {brandDisplay && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 font-medium text-gray-700 pr-4">Compatible Brands</td>
                            <td className="py-2">{brandDisplay}</td>
                          </tr>
                        )}
                        <tr className="border-b border-gray-100">
                          <td className="py-2 font-medium text-gray-700 pr-4">Supplier</td>
                          <td className="py-2">MM Earthmovers, Kolkata</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-gray-700 pr-4">Shipping</td>
                          <td className="py-2">India &amp; Worldwide</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>

              {/* CTAs */}
              <div className="mt-auto space-y-4">
                 <a
                    href={`https://wa.me/+918334887009?text=${encodeURIComponent(`Hi, I am interested in ${product.title}${product.part_number ? ` (Part #: ${product.part_number})` : ''}. Please provide more details.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                 >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
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
              <div className="mt-20 border-t border-gray-100 pt-12" data-nosnippet>
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
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
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
