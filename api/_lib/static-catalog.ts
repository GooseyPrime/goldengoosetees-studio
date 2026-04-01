/**
 * Offline / degraded catalog when Printful or DB is unavailable.
 * Grid shape matches api/printful/catalog/list; full shape matches printful-transform Product.
 *
 * If you change estimatedBase or titles, update `src/lib/catalog-emergency.ts` basePrice values
 * (must match catalogStartingRetail + inferPricingCategory for default PRICING_* env).
 */
import type {
  Product,
  PrintArea,
  ProductConfiguration,
  ProductVariant,
  ProductCategory,
} from './printful-transform'
import { catalogStartingRetail, inferPricingCategory, type ProductCategoryHint } from './pricing'
import { getCuratedPrintfulProductIds, isCuratedProductId } from './offerings'

const DEFAULT_CONSTRAINTS = {
  minDPI: 150,
  maxDPI: 300,
  formats: ['PNG', 'SVG'],
  maxFileSizeMB: 50,
  colorMode: 'RGB' as const,
}

/** Stable placeholder; ProductCard handles non-Unsplash URLs. */
function placeholderImage(label: string): string {
  const q = encodeURIComponent(label.slice(0, 24))
  return `https://placehold.co/800x800/1c1917/e7e5e4/png?text=${q}`
}

type Meta = {
  name: string
  description: string
  category: ProductCategory
  /** Typical Printful garment/product base when cache is empty */
  estimatedBase: number
}

/** Default launch set; keep aligned with offerings.ts DEFAULT_CURATED_PRODUCT_IDS. */
const STATIC_META: Record<number, Meta> = {
  71: {
    name: 'Bella + Canvas 3001 Unisex Tee',
    description: 'Retail-favorite unisex jersey tee',
    category: 'apparel',
    estimatedBase: 12.5,
  },
  146: {
    name: 'Gildan 5000 Heavy Cotton Tee',
    description: 'Classic heavyweight cotton tee',
    category: 'apparel',
    estimatedBase: 11.99,
  },
  306: {
    name: 'Unisex Crewneck Sweatshirt',
    description: 'Midweight fleece crewneck',
    category: 'apparel',
    estimatedBase: 24.99,
  },
  380: {
    name: 'Unisex Hoodie',
    description: 'Pullover hoodie',
    category: 'apparel',
    estimatedBase: 28.99,
  },
  483: {
    name: '11 oz Ceramic Mug',
    description: 'White ceramic mug',
    category: 'drinkware',
    estimatedBase: 8.99,
  },
  468: {
    name: 'Matte Poster',
    description: 'Indoor poster print',
    category: 'poster',
    estimatedBase: 9.99,
  },
  189: {
    name: 'Dad Hat',
    description: 'Unstructured cap',
    category: 'accessory',
    estimatedBase: 14.99,
  },
  148: {
    name: 'Trucker Hat',
    description: 'Mesh-back cap',
    category: 'accessory',
    estimatedBase: 14.99,
  },
}

function hintFromCategory(cat: ProductCategory): ProductCategoryHint {
  if (cat === 'drinkware') return 'drinkware'
  if (cat === 'poster') return 'poster'
  if (cat === 'accessory') return 'accessory'
  return 'apparel'
}

function mockupForCategory(category: ProductCategory): Product['mockupTemplate'] {
  if (category === 'drinkware') return 'mug'
  if (category === 'poster') return 'poster'
  if (category === 'accessory') return 'hat'
  return 'tshirt'
}

function printAreasForCategory(category: ProductCategory): PrintArea[] {
  if (category === 'drinkware') {
    return [
      {
        id: 'area-wrap',
        name: 'Mug wrap',
        position: 'front',
        widthInches: 8,
        heightInches: 3.5,
        dpi: 300,
        constraints: DEFAULT_CONSTRAINTS,
      },
    ]
  }
  if (category === 'poster') {
    return [
      {
        id: 'area-front',
        name: 'Poster',
        position: 'front',
        widthInches: 12,
        heightInches: 18,
        dpi: 300,
        constraints: DEFAULT_CONSTRAINTS,
      },
    ]
  }
  if (category === 'accessory') {
    return [
      {
        id: 'area-front',
        name: 'Front',
        position: 'front',
        widthInches: 4,
        heightInches: 2.5,
        dpi: 300,
        constraints: DEFAULT_CONSTRAINTS,
      },
    ]
  }
  return [
    {
      id: 'area-front',
      name: 'Front Print',
      position: 'front',
      widthInches: 12,
      heightInches: 16,
      dpi: 300,
      constraints: DEFAULT_CONSTRAINTS,
    },
    {
      id: 'area-back',
      name: 'Back Print',
      position: 'back',
      widthInches: 12,
      heightInches: 16,
      dpi: 300,
      constraints: DEFAULT_CONSTRAINTS,
    },
  ]
}

function configurationsForAreas(areas: PrintArea[]): ProductConfiguration[] {
  const configs: ProductConfiguration[] = areas.map((area) => ({
    id: `config-${area.id}`,
    name: area.name,
    printAreas: [area.id],
    priceModifier: 0,
  }))
  const front = areas.find((a) => a.position === 'front')
  const back = areas.find((a) => a.position === 'back')
  if (front && back) {
    configs.push({
      id: 'config-front-and-back',
      name: 'Front & Back',
      printAreas: [front.id, back.id],
      priceModifier: 0,
    })
  }
  if (configs.length === 0) {
    configs.push({
      id: 'config-default',
      name: 'Default',
      printAreas: areas.map((a) => a.id),
      priceModifier: 0,
    })
  }
  return configs
}

function variantsForCategory(category: ProductCategory): ProductVariant[] {
  if (category === 'drinkware' || category === 'poster') {
    return [
      {
        id: 'size',
        name: 'Size',
        options: [{ value: 'One size', label: 'One size', available: true }],
      },
      {
        id: 'color',
        name: 'Color',
        options: [{ value: 'Default', label: 'Default', hexCode: '#FFFFFF', available: true }],
      },
    ]
  }
  return [
    {
      id: 'size',
      name: 'Size',
      options: ['S', 'M', 'L', 'XL', '2XL'].map((s) => ({ value: s, label: s, available: true })),
    },
    {
      id: 'color',
      name: 'Color',
      options: [
        { value: 'White', label: 'White', hexCode: '#FFFFFF', available: true },
        { value: 'Black', label: 'Black', hexCode: '#1a1a1a', available: true },
      ],
    },
  ]
}

function metaForId(id: number): Meta {
  return (
    STATIC_META[id] ?? {
      name: `Product ${id}`,
      description: 'Catalog item',
      category: 'apparel' as ProductCategory,
      estimatedBase: 19.99,
    }
  )
}

function retailForMeta(meta: Meta): number {
  const hint = hintFromCategory(meta.category)
  const pricingCategory = inferPricingCategory(hint, meta.name, '')
  return catalogStartingRetail(meta.estimatedBase, pricingCategory)
}

/** Grid rows matching list API (minimal configurations for cards). */
export function buildStaticGridProducts(): Product[] {
  const ids = getCuratedPrintfulProductIds()
  return ids.map((id) => {
    const meta = metaForId(id)
    const basePrice = retailForMeta(meta)
    return {
      id: String(id),
      name: meta.name,
      description: meta.description,
      printfulSKU: String(id),
      basePrice,
      imageUrl: placeholderImage(meta.name),
      category: meta.category,
      configurations: [],
      variants: [],
      printAreas: [],
      mockupTemplate: mockupForCategory(meta.category),
      available: true,
    }
  })
}

/** Full product for design flow when Printful detail fails. */
export function buildStaticFullProduct(productId: number): Product | null {
  if (!isCuratedProductId(productId)) return null
  const meta = metaForId(productId)
  const printAreas = printAreasForCategory(meta.category)
  const configurations = configurationsForAreas(printAreas)
  const variants = variantsForCategory(meta.category)
  const basePrice = retailForMeta(meta)

  return {
    id: String(productId),
    name: meta.name,
    description: meta.description,
    printfulSKU: String(productId),
    basePrice,
    imageUrl: placeholderImage(meta.name),
    printAreas,
    configurations,
    variants,
    category: meta.category,
    mockupTemplate: mockupForCategory(meta.category),
    available: true,
  }
}
