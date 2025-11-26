import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const productsDirectory = path.join(process.cwd(), 'content/products');

export interface Product {
  slug: string;
  title: string;
  category: string;
  brand?: string;
  sizes?: string[];
  image: string;
  content: string;
}

export function getProducts(): Product[] {
  // Create directory if it doesn't exist
  if (!fs.existsSync(productsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(productsDirectory);
  const allProductsData = fileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const slug = fileName.replace(/\.md$/, '');

    // Read markdown file as string
    const fullPath = path.join(productsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the id
    const data = matterResult.data as any
    const sizes = typeof data.sizes === 'string'
      ? data.sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
      : data.sizes

    // Coalesce brand fields
    const brand = data.brand || data.brand_loader || data.brand_grader || data.brand_excavator

    return {
      slug,
      content: matterResult.content,
      ...data,
      brand,
      sizes,
    } as Product;
  });

  return allProductsData;
}
