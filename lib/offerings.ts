import { getEnabledProducts } from '@/lib/config/products.config'

/**
 * Canonical curated Printful catalog product IDs for the storefront.
 * Order of precedence matches PRINTFUL_SETUP.md and .env.example.
 */
export function getCuratedCatalogProductIds(): number[] {
  const raw =
    process.env.PRINTFUL_CURATED_PRODUCT_IDS ||
    process.env.ENABLED_PRODUCT_IDS ||
    process.env.NEXT_PUBLIC_ENABLED_PRODUCT_IDS

  if (raw?.trim()) {
    return raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  }

  return getEnabledProducts().map((p) => p.printfulProductId)
}
