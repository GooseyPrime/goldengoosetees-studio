import { calculateRetailPrice } from '@/lib/config/products.config'

export type CheckoutDraftPayload = {
  catalogProductId: number
  catalogVariantId: number
  /** Printful file library ids per placement */
  placementFileIds: Record<string, string>
  /** Public URLs used for files (audit / support) */
  placementFileUrls: Record<string, string>
  mockupTaskId: string | number | null
  mockupUrls: string[]
  productName: string
  variantLabel: string
}

export function computeRetailCents(
  catalogProductId: number,
  placementIdsWithArt: string[],
  variantSize: string
): number {
  const dollars = calculateRetailPrice(catalogProductId, placementIdsWithArt, variantSize || 'M')
  return Math.max(0, Math.round(dollars * 100))
}
