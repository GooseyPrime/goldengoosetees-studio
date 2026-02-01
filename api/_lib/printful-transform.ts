/**
 * Transform Printful Catalog API responses to app Product type
 * Types mirrored from src/lib/types for server-side use
 */
export type ProductCategory = 'apparel' | 'drinkware' | 'accessory' | 'poster'
export type ProductMockupTemplate = 'tshirt' | 'mug' | 'hat' | 'poster'

export interface PrintArea {
  id: string
  name: string
  position: 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  widthInches: number
  heightInches: number
  dpi: number
  constraints: {
    minDPI: number
    maxDPI: number
    formats: string[]
    maxFileSizeMB: number
    colorMode: 'RGB' | 'CMYK'
  }
}

export interface ProductConfiguration {
  id: string
  name: string
  printAreas: string[]
  priceModifier: number
}

export interface ProductVariantOption {
  value: string
  label?: string
  hexCode?: string
  available: boolean
}

export interface ProductVariant {
  id: string
  name: string
  options: ProductVariantOption[]
}

export interface Product {
  id: string
  name: string
  description: string
  printfulSKU: string
  basePrice: number
  imageUrl: string
  printAreas: PrintArea[]
  configurations: ProductConfiguration[]
  variants: ProductVariant[]
  category: ProductCategory
  mockupTemplate: ProductMockupTemplate
  available: boolean
}

export interface PrintfulCatalogProduct {
  id: number
  main_category_id?: number
  type: string
  type_name: string
  title: string
  brand?: string | null
  model?: string
  image: string
  variant_count: number
  currency: string
  files?: Array<{
    id?: string
    type?: string
    title?: string
    additional_price?: string | number | null
    options?: Array<{ id?: string; type?: string; title?: string; additional_price?: number }>
  }>
  options?: Array<{
    id: string
    title: string
    type: string
    values: Record<string, string>
    additional_price: number | null
  }>
  is_discontinued?: boolean
}

export interface PrintfulCatalogVariant {
  id: number
  product_id: number
  name: string
  size: string
  color: string
  color_code?: string
  image: string
  price: string
  in_stock: boolean
}

export interface PrintfulCategory {
  id: number
  parent_id?: number
  title: string
  image_url?: string
  size?: string
}

const DEFAULT_DPI = 300
const DEFAULT_CONSTRAINTS = {
  minDPI: 150,
  maxDPI: 300,
  formats: ['PNG', 'SVG'],
  maxFileSizeMB: 50,
  colorMode: 'RGB' as const,
}

function inferCategory(product: PrintfulCatalogProduct): ProductCategory {
  const descriptor = `${product.type} ${product.type_name} ${product.title} ${product.model || ''}`.toLowerCase()
  if (descriptor.includes('mug') || descriptor.includes('cup') || descriptor.includes('tumbler') || descriptor.includes('bottle')) {
    return 'drinkware'
  }
  if (descriptor.includes('hat') || descriptor.includes('cap') || descriptor.includes('beanie')) {
    return 'accessory'
  }
  if (descriptor.includes('poster') || descriptor.includes('canvas') || descriptor.includes('print')) {
    return 'poster'
  }
  return 'apparel'
}

function mockupTemplateForCategory(category: ProductCategory): ProductMockupTemplate {
  switch (category) {
    case 'drinkware':
      return 'mug'
    case 'accessory':
      return 'hat'
    case 'poster':
      return 'poster'
    default:
      return 'tshirt'
  }
}

function placementToPosition(type: string): PrintArea['position'] {
  const t = (type || 'front').toLowerCase()
  if (t.includes('back')) return 'back'
  if (t.includes('left') && t.includes('sleeve')) return 'left_sleeve'
  if (t.includes('right') && t.includes('sleeve')) return 'right_sleeve'
  return 'front'
}

/**
 * Build print areas from Printful product files array
 * Uses default dimensions when printfiles are not available
 */
function buildPrintAreas(product: PrintfulCatalogProduct): PrintArea[] {
  const files = product.files || []
  const defaultArea = { widthInches: 12, heightInches: 16 }

  if (files.length === 0) {
    return [{
      id: 'area-front',
      name: 'Front Print',
      position: 'front',
      widthInches: defaultArea.widthInches,
      heightInches: defaultArea.heightInches,
      dpi: DEFAULT_DPI,
      constraints: DEFAULT_CONSTRAINTS,
    }]
  }

  return files
    .filter(f => f.type && !['preview', 'mockup'].includes((f.type || '').toLowerCase()))
    .map((f, i) => {
      const placement = (f.type || 'front').toLowerCase()
      const areaId = `area-${placement.replace(/\s/g, '-')}-${product.id}-${i}`
      const name = (f.title || f.type || 'Print').replace(/\b\w/g, l => l.toUpperCase())

      // Default dimensions; can be refined with printfiles API if needed
      let widthInches = defaultArea.widthInches
      let heightInches = defaultArea.heightInches
      if (placement.includes('sleeve')) {
        widthInches = 3
        heightInches = 4
      }

      return {
        id: areaId,
        name,
        position: placementToPosition(placement),
        widthInches,
        heightInches,
        dpi: DEFAULT_DPI,
        constraints: DEFAULT_CONSTRAINTS,
      }
    })
}

/**
 * Build configurations from print areas (one per area, plus front+back combo if applicable)
 */
function buildConfigurations(printAreas: PrintArea[], files: PrintfulCatalogProduct['files']): ProductConfiguration[] {
  const configs: ProductConfiguration[] = []

  printAreas.forEach((area, i) => {
    const additionalPrice = files?.[i]?.additional_price
    const priceMod = typeof additionalPrice === 'string' ? parseFloat(additionalPrice) || 0 : (Number(additionalPrice) || 0)
    configs.push({
      id: `config-${area.id}`,
      name: area.name,
      printAreas: [area.id],
      priceModifier: priceMod,
    })
  })

  if (printAreas.length >= 2) {
    const frontArea = printAreas.find(a => a.position === 'front')
    const backArea = printAreas.find(a => a.position === 'back')
    if (frontArea && backArea) {
      const frontPrice = files?.find(f => (f.type || '').toLowerCase().includes('front'))?.additional_price
      const backPrice = files?.find(f => (f.type || '').toLowerCase().includes('back'))?.additional_price
      const frontMod = typeof frontPrice === 'string' ? parseFloat(frontPrice) || 0 : (Number(frontPrice) || 0)
      const backMod = typeof backPrice === 'string' ? parseFloat(backPrice) || 0 : (Number(backPrice) || 0)
      configs.push({
        id: 'config-front-and-back',
        name: 'Front & Back',
        printAreas: [frontArea.id, backArea.id],
        priceModifier: frontMod + backMod,
      })
    }
  }

  if (configs.length === 0) {
    configs.push({
      id: 'config-default',
      name: 'Default',
      printAreas: printAreas.map(a => a.id),
      priceModifier: 0,
    })
  }

  return configs
}

/**
 * Build variants from Printful variants (size, color)
 */
function buildVariants(variants: PrintfulCatalogVariant[]): ProductVariant[] {
  const sizeSet = new Set<string>()
  const colorMap = new Map<string, string>()

  variants.forEach(v => {
    if (v.size) sizeSet.add(v.size)
    if (v.color) {
      colorMap.set(v.color, v.color_code || '#888888')
    }
  })

  const result: ProductVariant[] = []

  if (sizeSet.size > 0) {
    result.push({
      id: 'size',
      name: 'Size',
      options: Array.from(sizeSet).map(s => ({
        value: s,
        label: s,
        available: true,
      })),
    })
  }

  if (colorMap.size > 0) {
    result.push({
      id: 'color',
      name: 'Color',
      options: Array.from(colorMap.entries()).map(([color, hex]) => ({
        value: color,
        label: color,
        hexCode: hex,
        available: true,
      })),
    })
  }

  if (result.length === 0) {
    result.push(
      { id: 'size', name: 'Size', options: [{ value: 'M', label: 'M', available: true }] },
      { id: 'color', name: 'Color', options: [{ value: 'White', label: 'White', hexCode: '#FFFFFF', available: true }] }
    )
  }

  return result
}

/**
 * Transform a full Printful product (with variants) to app Product
 */
export function printfulToProduct(
  product: PrintfulCatalogProduct,
  variants: PrintfulCatalogVariant[]
): Product {
  const category = inferCategory(product)
  const printAreas = buildPrintAreas(product)
  const configurations = buildConfigurations(printAreas, product.files)
  const productVariants = buildVariants(variants)

  const firstVariant = variants[0]
  const basePrice = firstVariant ? parseFloat(firstVariant.price) || 19.99 : 19.99

  return {
    id: String(product.id),
    name: product.title,
    description: product.model || product.type_name || product.title,
    printfulSKU: String(firstVariant?.id ?? product.id),
    basePrice,
    imageUrl: product.image,
    printAreas,
    configurations,
    variants: productVariants,
    category,
    mockupTemplate: mockupTemplateForCategory(category),
    available: !product.is_discontinued,
  }
}

/**
 * Create a minimal product summary for catalog grid (no full variants needed)
 */
export function printfulToCatalogSummary(product: PrintfulCatalogProduct): {
  id: string
  name: string
  imageUrl: string
  category: ProductCategory
  basePrice: number
} {
  const category = inferCategory(product)
  return {
    id: String(product.id),
    name: product.title,
    imageUrl: product.image,
    category,
    basePrice: 19.99, // Placeholder until we have variant data
  }
}
