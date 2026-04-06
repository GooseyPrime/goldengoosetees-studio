// lib/config/products.config.ts
// ─────────────────────────────────────────────────────────────────
// PRODUCT CATALOG CONFIGURATION
// To add/remove products: edit ENABLED_PRODUCT_IDS in .env
// ENABLED_PRODUCT_IDS=71,378,380,19
//
// To add a new product: add its Printful catalog_product_id to
// ENABLED_PRODUCT_IDS and add its config entry below.
// The app will auto-load variants, placements, and pricing from
// Printful API on startup and cache in products_catalog DB table.
// ─────────────────────────────────────────────────────────────────

export type PrintPlacement = {
  id: string               // Printful placement key e.g. 'front', 'back'
  displayName: string      // e.g. 'Front Print'
  isDefault: boolean       // auto-selected on session start
  additionalPrice: number  // USD added to base price (0 for included)
  printAreaWidth: number   // inches
  printAreaHeight: number  // inches
  dpi: number              // minimum DPI required (usually 150)
  canvasExportPx: number   // pixel size to export canvas at this placement
  uiSortOrder: number      // display order in placement selector
}

export type ProductConfig = {
  printfulProductId: number
  displayName: string
  shortName: string          // used in URLs e.g. 'bella-3001'
  type: 'tshirt' | 'hoodie' | 'sweatshirt' | 'mug' | 'other'
  description: string
  placements: PrintPlacement[]
  retailPriceBase: number    // USD — cheapest variant (front only)
  retailPriceAdjustments: {  // added on top of base per condition
    backPrint?: number
    sizeXL?: number
    size2XL?: number
    size3XL?: number
  }
  defaultColors: string[]    // color names to show by default (subset of Printful colors)
  isActive: boolean
  seoSlug: string
}

// ─────────────────────────────────────────────────────────────────
// PRODUCT DEFINITIONS
// ─────────────────────────────────────────────────────────────────

export const PRODUCT_CONFIGS: Record<number, ProductConfig> = {

  // Bella + Canvas 3001 Unisex T-Shirt
  71: {
    printfulProductId: 71,
    displayName: 'Unisex T-Shirt',
    shortName: 'bella-3001',
    type: 'tshirt',
    description: 'The go-to tee. Soft, comfortable, and perfect for making a statement.',
    placements: [
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
        additionalPrice: 5.00,
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
        additionalPrice: 5.00,
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
        additionalPrice: 5.00,
        printAreaWidth: 3.5,
        printAreaHeight: 4,
        dpi: 150,
        canvasExportPx: 525,
        uiSortOrder: 4,
      },
    ],
    retailPriceBase: 28.00,
    retailPriceAdjustments: {
      backPrint: 5.00,
      size2XL: 2.00,
      size3XL: 4.00,
    },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather', 'Red', 'Forest Green', 'Maroon'],
    isActive: true,
    seoSlug: 'unisex-t-shirt',
  },

  // Gildan 18000 Heavy Blend Crewneck Sweatshirt
  378: {
    printfulProductId: 378,
    displayName: 'Crewneck Sweatshirt',
    shortName: 'gildan-18000',
    type: 'sweatshirt',
    description: 'Heavy blend fleece. Perfect for when it\'s too cold to be funny in just a tee.',
    placements: [
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
        additionalPrice: 5.00,
        printAreaWidth: 12,
        printAreaHeight: 15,
        dpi: 150,
        canvasExportPx: 1800,
        uiSortOrder: 2,
      },
    ],
    retailPriceBase: 38.00,
    retailPriceAdjustments: {
      backPrint: 5.00,
      size2XL: 2.00,
      size3XL: 4.00,
    },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather', 'Sport Grey'],
    isActive: true,
    seoSlug: 'crewneck-sweatshirt',
  },

  // Bella + Canvas 3719 Unisex Pullover Hoodie
  380: {
    printfulProductId: 380,
    displayName: 'Pullover Hoodie',
    shortName: 'bc-3719-hoodie',
    type: 'hoodie',
    description: 'The sacred garment of the chronically online and proudly inappropriate.',
    placements: [
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
        additionalPrice: 5.00,
        printAreaWidth: 12,
        printAreaHeight: 15,
        dpi: 150,
        canvasExportPx: 1800,
        uiSortOrder: 2,
      },
    ],
    retailPriceBase: 55.00,
    retailPriceAdjustments: {
      backPrint: 5.00,
      size2XL: 2.00,
      size3XL: 4.00,
    },
    defaultColors: ['Black', 'White', 'Navy', 'Dark Heather'],
    isActive: true,
    seoSlug: 'pullover-hoodie',
  },

  // Printful 11oz White Mug
  19: {
    printfulProductId: 19,
    displayName: '11oz Coffee Mug',
    shortName: 'mug-11oz',
    type: 'mug',
    description: 'Start every morning with something offensive. You\'re welcome.',
    placements: [
      {
        id: 'default',
        displayName: 'Wrap Print',
        isDefault: true,
        additionalPrice: 0,
        printAreaWidth: 8.5,
        printAreaHeight: 3.5,
        dpi: 150,
        canvasExportPx: 1275,
        uiSortOrder: 1,
      },
    ],
    retailPriceBase: 22.00,
    retailPriceAdjustments: {},
    defaultColors: ['White'],
    isActive: true,
    seoSlug: 'coffee-mug',
  },
}

// ─────────────────────────────────────────────────────────────────
// RUNTIME: get active products from env variable filter
// ENABLED_PRODUCT_IDS=71,378,380,19  (in .env / Vercel)
// If not set, all isActive products are enabled.
// ─────────────────────────────────────────────────────────────────

export function getEnabledProducts(): ProductConfig[] {
  const envIds = process.env.ENABLED_PRODUCT_IDS || process.env.NEXT_PUBLIC_ENABLED_PRODUCT_IDS
  
  if (envIds) {
    const ids = envIds.split(',').map(id => parseInt(id.trim(), 10))
    return ids
      .map(id => PRODUCT_CONFIGS[id])
      .filter((p): p is ProductConfig => !!p && p.isActive)
  }
  
  return Object.values(PRODUCT_CONFIGS).filter(p => p.isActive)
}

export function getProductConfig(printfulProductId: number): ProductConfig | null {
  return PRODUCT_CONFIGS[printfulProductId] ?? null
}

export function getProductBySlug(slug: string): ProductConfig | null {
  return Object.values(PRODUCT_CONFIGS).find(p => p.seoSlug === slug) ?? null
}

export function getPlacementConfig(
  printfulProductId: number,
  placementId: string
): PrintPlacement | null {
  const product = PRODUCT_CONFIGS[printfulProductId]
  if (!product) return null
  return product.placements.find(p => p.id === placementId) ?? null
}

// Calculate retail price for a given product + selected placements + size
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
