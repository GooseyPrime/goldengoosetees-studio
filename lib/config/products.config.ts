// lib/config/products.config.ts
// ─────────────────────────────────────────────────────────────────
// Curated storefront: Printful catalog_product_id + local placement hints.
// Default lineup matches PRINTFUL_CURATED_PRODUCT_IDS in lib/offerings.ts
// Run: npm run printful-resolve-launch (with PRINTFUL_API_KEY) to verify IDs.
// ─────────────────────────────────────────────────────────────────

export type PrintPlacement = {
  id: string
  displayName: string
  isDefault: boolean
  additionalPrice: number
  printAreaWidth: number
  printAreaHeight: number
  dpi: number
  canvasExportPx: number
  uiSortOrder: number
}

export type ProductConfig = {
  printfulProductId: number
  displayName: string
  shortName: string
  type: 'tshirt' | 'hoodie' | 'sweatshirt' | 'mug' | 'other'
  description: string
  placements: PrintPlacement[]
  retailPriceBase: number
  retailPriceAdjustments: {
    backPrint?: number
    sizeXL?: number
    size2XL?: number
    size3XL?: number
  }
  defaultColors: string[]
  isActive: boolean
  seoSlug: string
}

const teeSleevePlacements: PrintPlacement[] = [
  {
    id: 'front',
    displayName: 'Front Print',
    isDefault: true,
    additionalPrice: 0,
    printAreaWidth: 12,
    printAreaHeight: 12,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 1,
  },
  {
    id: 'back',
    displayName: 'Back Print',
    isDefault: false,
    additionalPrice: 5.0,
    printAreaWidth: 12,
    printAreaHeight: 15,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 2,
  },
  {
    id: 'sleeve_left',
    displayName: 'Left Sleeve',
    isDefault: false,
    additionalPrice: 5.0,
    printAreaWidth: 3.5,
    printAreaHeight: 4,
    dpi: 150,
    canvasExportPx: 525,
    uiSortOrder: 3,
  },
  {
    id: 'sleeve_right',
    displayName: 'Right Sleeve',
    isDefault: false,
    additionalPrice: 5.0,
    printAreaWidth: 3.5,
    printAreaHeight: 4,
    dpi: 150,
    canvasExportPx: 525,
    uiSortOrder: 4,
  },
]

const frontBackOnly: PrintPlacement[] = [
  {
    id: 'front',
    displayName: 'Front Print',
    isDefault: true,
    additionalPrice: 0,
    printAreaWidth: 12,
    printAreaHeight: 12,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 1,
  },
  {
    id: 'back',
    displayName: 'Back Print',
    isDefault: false,
    additionalPrice: 5.0,
    printAreaWidth: 12,
    printAreaHeight: 15,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 2,
  },
]

const hoodiePlacements: PrintPlacement[] = [
  {
    id: 'front',
    displayName: 'Front Print',
    isDefault: true,
    additionalPrice: 0,
    printAreaWidth: 12,
    printAreaHeight: 12,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 1,
  },
  {
    id: 'back',
    displayName: 'Back Print',
    isDefault: false,
    additionalPrice: 5.0,
    printAreaWidth: 12,
    printAreaHeight: 15,
    dpi: 150,
    canvasExportPx: 1800,
    uiSortOrder: 2,
  },
]

export const PRODUCT_CONFIGS: Record<number, ProductConfig> = {
  // Unisex Staple T-Shirt | Bella + Canvas 3001 (catalog id 71)
  71: {
    printfulProductId: 71,
    displayName: 'Unisex Staple T-Shirt | Bella + Canvas 3001',
    shortName: 'bc-3001',
    type: 'tshirt',
    description: 'Soft cotton staple tee — the everyday canvas for your designs.',
    placements: teeSleevePlacements,
    retailPriceBase: 28.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather'],
    isActive: true,
    seoSlug: 'bella-canvas-3001',
  },

  // Unisex Tri-Blend T-Shirt | Bella + Canvas 3413 (catalog id 162)
  162: {
    printfulProductId: 162,
    displayName: 'Unisex Tri-Blend T-Shirt | Bella + Canvas 3413',
    shortName: 'bc-3413',
    type: 'tshirt',
    description: 'Triblend fabric with a fitted look — durable and soft.',
    placements: teeSleevePlacements,
    retailPriceBase: 32.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Charcoal Black Triblend'],
    isActive: true,
    seoSlug: 'bella-canvas-3413',
  },

  // Men's Staple Tank Top | Bella + Canvas 3480 (catalog id 248)
  248: {
    printfulProductId: 248,
    displayName: "Men's Staple Tank Top | Bella + Canvas 3480",
    shortName: 'bc-3480',
    type: 'tshirt',
    description: 'Soft jersey tank — fitted silhouette for active or casual wear.',
    placements: frontBackOnly,
    retailPriceBase: 26.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Athletic Heather'],
    isActive: true,
    seoSlug: 'bella-canvas-3480',
  },

  // Women's Muscle Tank | Bella + Canvas 8803 (catalog id 271)
  271: {
    printfulProductId: 271,
    displayName: "Women's Muscle Tank | Bella + Canvas 8803",
    shortName: 'bc-8803',
    type: 'tshirt',
    description: 'Flowy muscle tank with low-cut armholes.',
    placements: frontBackOnly,
    retailPriceBase: 30.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Mauve', 'Heather Peach'],
    isActive: true,
    seoSlug: 'bella-canvas-8803',
  },

  // Unisex Pullover Hoodie | Bella + Canvas 3719 (catalog id 294)
  294: {
    printfulProductId: 294,
    displayName: 'Unisex Pullover Hoodie | Bella + Canvas 3719',
    shortName: 'bc-3719',
    type: 'hoodie',
    description: 'Fleece hoodie — retail fit, soft and layerable.',
    placements: hoodiePlacements,
    retailPriceBase: 55.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather'],
    isActive: true,
    seoSlug: 'bella-canvas-3719',
  },

  // Unisex Long Sleeve Tee | Bella + Canvas 3501 (catalog id 356)
  356: {
    printfulProductId: 356,
    displayName: 'Unisex Long Sleeve Tee | Bella + Canvas 3501',
    shortName: 'bc-3501',
    type: 'tshirt',
    description: 'Classic crew long sleeve with tear-away label.',
    placements: teeSleevePlacements,
    retailPriceBase: 32.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather'],
    isActive: true,
    seoSlug: 'bella-canvas-3501',
  },

  // Unisex Muscle Shirt | Bella + Canvas 3483 (catalog id 365)
  365: {
    printfulProductId: 365,
    displayName: 'Unisex Muscle Shirt | Bella + Canvas 3483',
    shortName: 'bc-3483',
    type: 'tshirt',
    description: 'Relaxed sleeveless tank — soft, crowd-friendly muscle cut.',
    placements: frontBackOnly,
    retailPriceBase: 28.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Athletic Heather'],
    isActive: true,
    seoSlug: 'bella-canvas-3483',
  },

  // Men's Premium Tank Top | Cotton Heritage MC1790 (catalog id 537)
  537: {
    printfulProductId: 537,
    displayName: "Men's Premium Tank Top | Cotton Heritage MC1790",
    shortName: 'ch-mc1790',
    type: 'tshirt',
    description: 'Premium cotton tank — smooth hand-feel, bold colors.',
    placements: frontBackOnly,
    retailPriceBase: 28.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Red'],
    isActive: true,
    seoSlug: 'cotton-heritage-mc1790',
  },

  // Men's Fitted T-Shirt | Next Level 3600 (catalog id 108)
  108: {
    printfulProductId: 108,
    displayName: "Men's Fitted T-Shirt | Next Level 3600",
    shortName: 'nl-3600',
    type: 'tshirt',
    description: 'Soft fitted tee — popular retail silhouette.',
    placements: teeSleevePlacements,
    retailPriceBase: 30.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Red'],
    isActive: true,
    seoSlug: 'next-level-3600',
  },

  // Unisex Hooded Long Sleeve Tee | Bella Canvas 3512 (catalog id 688)
  688: {
    printfulProductId: 688,
    displayName: 'Unisex Hooded Long Sleeve Tee | Bella Canvas 3512',
    shortName: 'bc-3512',
    type: 'tshirt',
    description: 'Lightweight long-sleeve hooded tee — no drawstrings, easy layer.',
    placements: hoodiePlacements,
    retailPriceBase: 38.0,
    retailPriceAdjustments: { backPrint: 5.0, size2XL: 2.0, size3XL: 4.0 },
    defaultColors: ['Black', 'White', 'Navy', 'Charcoal Black Triblend'],
    isActive: true,
    seoSlug: 'bella-canvas-3512',
  },
}

/** Default catalog IDs when env PRINTFUL_CURATED_PRODUCT_IDS is unset — keep in sync with offerings */
export const DEFAULT_STOREFRONT_CATALOG_IDS: number[] = [
  71, 162, 248, 271, 294, 356, 365, 537, 108, 688,
]

export function getEnabledProducts(): ProductConfig[] {
  const envIds =
    process.env.PRINTFUL_CURATED_PRODUCT_IDS ||
    process.env.ENABLED_PRODUCT_IDS ||
    process.env.NEXT_PUBLIC_ENABLED_PRODUCT_IDS

  if (envIds?.trim()) {
    const ids = envIds.split(',').map((id) => parseInt(id.trim(), 10))
    return ids
      .map((id) => PRODUCT_CONFIGS[id])
      .filter((p): p is ProductConfig => !!p && p.isActive)
  }

  return DEFAULT_STOREFRONT_CATALOG_IDS.map((id) => PRODUCT_CONFIGS[id]).filter(
    (p): p is ProductConfig => !!p && p.isActive
  )
}

export function getProductConfig(printfulProductId: number): ProductConfig | null {
  return PRODUCT_CONFIGS[printfulProductId] ?? null
}

export function getProductBySlug(slug: string): ProductConfig | null {
  return Object.values(PRODUCT_CONFIGS).find((p) => p.seoSlug === slug) ?? null
}

export function getPlacementConfig(
  printfulProductId: number,
  placementId: string
): PrintPlacement | null {
  const product = PRODUCT_CONFIGS[printfulProductId]
  if (!product) return null
  return product.placements.find((p) => p.id === placementId) ?? null
}

export function calculateRetailPrice(
  printfulProductId: number,
  selectedPlacements: string[],
  size: string
): number {
  const product = PRODUCT_CONFIGS[printfulProductId]
  if (!product) throw new Error(`Unknown product: ${printfulProductId}`)

  let price = product.retailPriceBase

  const adj = product.retailPriceAdjustments
  if (selectedPlacements.includes('back') && adj.backPrint) price += adj.backPrint
  if (['2XL', '2X'].includes(size) && adj.size2XL) price += adj.size2XL
  if (['3XL', '3X'].includes(size) && adj.size3XL) price += adj.size3XL

  return Math.round(price * 100) / 100
}
