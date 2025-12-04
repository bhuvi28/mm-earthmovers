import { getProducts } from '@/lib/products'
import ProductsPage from '@/components/ProductsPage'
import Footer from '@/components/Footer'
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper'

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const products = getProducts()
  
  // Get category from search params, default to first one or 'loader'
  const category = typeof searchParams.category === 'string' ? searchParams.category : 'loader'
  
  return (
    <main className="min-h-screen">
      <ClientHeaderWrapper />
      <ProductsPage 
        initialCategory={category}
        products={products}
      />
      <Footer />
    </main>
  )
}
