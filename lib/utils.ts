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
 * Extracts numeric priority for sorting products.
 * Unspecified or empty priorities default to 999 (placed at the end).
 */
export function getProductPriority(p: number | string | undefined): number {
  if (p === "" || p == null) return 999;
  if (typeof p === 'string') {
    const num = parseInt(p, 10);
    return isNaN(num) ? 999 : num;
  }
  return typeof p === 'number' ? p : 999;
}

/**
 * Compares products by admin-specified priority (lower numbers first),
 * breaking ties alphabetically by title.
 */
export function compareProductsByPriority(
  a: { priority?: number | string; title: string },
  b: { priority?: number | string; title: string }
): number {
  const priorityA = getProductPriority(a.priority);
  const priorityB = getProductPriority(b.priority);

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return a.title.localeCompare(b.title);
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
