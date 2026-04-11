import { getProductConfig, type ProductConfig, type PrintPlacement } from '@/lib/config/products.config'

/** Printful catalog placement shape from GET /catalog-products/{id} */
export type PrintfulPlacementRow = {
  placement: string
  technique: string
  layers?: unknown[]
}

/**
 * Placements for the studio: intersect local config with Printful product placements when both exist,
 * so we only require art for placements the API actually supports.
 */
export function resolveStudioPlacements(
  catalogProductId: number,
  printfulPlacements: unknown[] | null
): Array<{ id: string; displayName: string; technique: string }> {
  const local = getProductConfig(catalogProductId)
  const localRows =
    local?.placements?.map((p: PrintPlacement) => ({
      id: p.id,
      displayName: p.displayName,
      technique: defaultTechniqueForPlacement(local, p.id),
    })) ?? null

  if (!printfulPlacements?.length) {
    if (localRows?.length) return localRows
    return [{ id: 'front', displayName: 'Front', technique: 'dtg' }]
  }

  const fromPrintful = (printfulPlacements as PrintfulPlacementRow[]).map((row) => ({
    id: row.placement,
    displayName: humanizePlacement(row.placement),
    technique: row.technique || 'dtg',
  }))

  if (!localRows?.length) return fromPrintful

  const pfIds = new Set(fromPrintful.map((p) => p.id))
  const merged = localRows
    .filter((l) => pfIds.has(l.id))
    .map((l) => {
      const match = fromPrintful.find((p) => p.id === l.id)
      return { ...l, technique: match?.technique ?? l.technique }
    })

  return merged.length > 0 ? merged : fromPrintful
}

function defaultTechniqueForPlacement(_config: ProductConfig | null, placementId: string): string {
  if (placementId.includes('embroidery')) return 'embroidery'
  return 'dtg'
}

function humanizePlacement(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
