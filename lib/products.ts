import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compareProductsByPriority } from './utils';

const productsDirectory = path.join(process.cwd(), 'content/products');

export interface Product {
  slug: string;
  title: string;
  category: string;
  brand?: string | string[];
  part_number?: string;
  image: string;
  content: string;
  oemRef?: string;
  price?: string;
  availability?: 'In Stock' | 'Limited' | 'Out of Stock';
  condition?: 'New' | 'Refurbished' | 'Used';
  priority?: number | string;
}

interface ProductsCacheEntry {
  dirMtimeMs: number;
  fileMtimes: Map<string, number>;
  products: Product[];
}

let productsCache: ProductsCacheEntry | null = null;
let cacheHits = 0;
let cacheMisses = 0;

export function invalidateProductsCache(): void {
  productsCache = null;
}

export function getProductsCacheStats(): {
  hits: number;
  misses: number;
  cachedCount: number;
} {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    cachedCount: productsCache ? productsCache.products.length : 0,
  };
}

export function getProducts(): Product[] {
  // Create directory if it doesn't exist
  if (!fs.existsSync(productsDirectory)) {
    productsCache = null;
    return [];
  }

  const dirStat = fs.statSync(productsDirectory);
  const fileNames = fs.readdirSync(productsDirectory);

  if (
    productsCache &&
    productsCache.dirMtimeMs === dirStat.mtimeMs &&
    productsCache.fileMtimes.size === fileNames.length
  ) {
    let allUnchanged = true;
    for (const fileName of fileNames) {
      const prevMtime = productsCache.fileMtimes.get(fileName);
      if (prevMtime === undefined) {
        allUnchanged = false;
        break;
      }
      const stat = fs.statSync(path.join(productsDirectory, fileName));
      if (stat.mtimeMs !== prevMtime) {
        allUnchanged = false;
        break;
      }
    }
    if (allUnchanged) {
      cacheHits += 1;
      return productsCache.products;
    }
  }

  cacheMisses += 1;
  const fileMtimes = new Map<string, number>();
  const allProductsData = fileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const slug = fileName.replace(/\.md$/, '');

    // Read markdown file as string
    const fullPath = path.join(productsDirectory, fileName);
    const stat = fs.statSync(fullPath);
    fileMtimes.set(fileName, stat.mtimeMs);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the id
    const data = matterResult.data as any;

    return {
      slug,
      content: matterResult.content,
      ...data,
    } as Product;
  });

  const sortedProducts = allProductsData.sort(compareProductsByPriority);
  productsCache = {
    dirMtimeMs: dirStat.mtimeMs,
    fileMtimes,
    products: sortedProducts,
  };

  return sortedProducts;
}
