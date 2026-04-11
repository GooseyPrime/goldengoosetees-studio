import { getProductConfig, type ProductConfig, type PrintPlacement } from '@/lib/config/products.config'

/** Printful catalog placement shape from GET /catalog-products/{id} */
export type PrintfulPlacementRow = {
  placement: string
  technique: string
  layers?: unknown[]
}

/**
 * Placements we offer in the studio: prefer local product config (curated subset + pricing);
 * fall back to Printful product placements when local config is missing.
 */
export function resolveStudioPlacements(
  catalogProductId: number,
  printfulPlacements: unknown[] | null
): Array<{ id: string; displayName: string; technique: string }> {
  const local = getProductConfig(catalogProductId)
  if (local?.placements?.length) {
    return local.placements.map((p: PrintPlacement) => ({
      id: p.id,
      displayName: p.displayName,
      technique: defaultTechniqueForPlacement(local, p.id),
    }))
  }
  if (!printfulPlacements?.length) {
    return [{ id: 'front', displayName: 'Front', technique: 'dtg' }]
  }
  return (printfulPlacements as PrintfulPlacementRow[]).map((row) => ({
    id: row.placement,
    displayName: humanizePlacement(row.placement),
    technique: row.technique || 'dtg',
  }))
}

function defaultTechniqueForPlacement(_config: ProductConfig, placementId: string): string {
  if (placementId.includes('embroidery')) return 'embroidery'
  return 'dtg'
}

function humanizePlacement(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
