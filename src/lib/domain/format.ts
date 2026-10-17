import type { Product } from './types';

/** Placeholder brands that add nothing to a product name. */
const GENERIC_BRANDS: ReadonlySet<string> = new Set(['various', 'local', 'generic']);

/** "Brand Name", without repeating a brand the name already contains. */
export function productLabel(product: Pick<Product, 'brand' | 'name'>): string {
  const brand = product.brand.trim();
  if (!brand || GENERIC_BRANDS.has(brand.toLowerCase())) return product.name;
  const brandWords = brand.toLowerCase().split(/[\s/]+/);
  const name = product.name.toLowerCase();
  return brandWords.some((word) => word.length > 2 && name.includes(word)) ? product.name : `${brand} ${product.name}`;
}
