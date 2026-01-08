import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Generates SEO-friendly URL slug for a product
 * Prioritizes part number if available, otherwise uses the file slug
 */
export function getProductUrlSlug(product: { part_number?: string, slug: string }): string {
  if (product.part_number) {
    // Sanitize part number: lowercase, replace slash/backslash/spaces with dash, remove special chars
    return product.part_number
      .toLowerCase()
      .trim()
      .replace(/[\/\\]/g, '-')     // Replace slashes with dashes
      .replace(/\s+/g, '-')        // Replace spaces with dashes
      .replace(/[^a-z0-9-]/g, '')  // Remove other special characters
      .replace(/-+/g, '-')         // Remove duplicate dashes
      .replace(/^-|-$/g, '');      // Trim dashes
  }
  return product.slug;
}

/**
 * Extracts SEO-friendly alt text from an image path
 * Example: /images/uploads/123-axle.jpg -> "123-axle"
 */
export function getAltTextFromPath(imagePath: string): string {
  if (!imagePath) return '';
  // Get filename from path
  const filename = imagePath.split('/').pop() || '';
  // Remove extension
  return filename.split('.').slice(0, -1).join('.');
}
