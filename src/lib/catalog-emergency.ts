/**
 * Client-only fallback when catalog API returns non-JSON or network fails.
 * Keep IDs/names aligned with api/_lib/offerings.ts defaults; basePrice matches
 * api/_lib/static-catalog.ts retail for default PRICING_* env (see scripts note in static-catalog).
 */
import type { Product, ProductCategory, ProductMockupTemplate } from '@/lib/types'

const PLACEHOLDER = (label: string) =>
  `https://placehold.co/800x800/1c1917/e7e5e4/png?text=${encodeURIComponent(label.slice(0, 24))}`

type Row = {
  id: number
  name: string
  description: string
  category: ProductCategory
  mockupTemplate: ProductMockupTemplate
  basePrice: number
}

/** Precomputed with api/_lib/pricing defaults + per-product estimatedBase from static-catalog. */
const ROWS: Row[] = [
  { id: 71, name: 'Bella + Canvas 3001 Unisex Tee', description: 'Retail-favorite unisex jersey tee', category: 'apparel', mockupTemplate: 'tshirt', basePrice: 19.99 },
  { id: 146, name: 'Gildan 5000 Heavy Cotton Tee', description: 'Classic heavyweight cotton tee', category: 'apparel', mockupTemplate: 'tshirt', basePrice: 18.99 },
  { id: 306, name: 'Unisex Crewneck Sweatshirt', description: 'Midweight fleece crewneck', category: 'apparel', mockupTemplate: 'tshirt', basePrice: 38.99 },
  { id: 380, name: 'Unisex Hoodie', description: 'Pullover hoodie', category: 'apparel', mockupTemplate: 'tshirt', basePrice: 45.99 },
  { id: 483, name: '11 oz Ceramic Mug', description: 'White ceramic mug', category: 'drinkware', mockupTemplate: 'mug', basePrice: 15.95 },
  { id: 468, name: 'Matte Poster', description: 'Indoor poster print', category: 'poster', mockupTemplate: 'poster', basePrice: 18.95 },
  { id: 189, name: 'Dad Hat', description: 'Unstructured cap', category: 'accessory', mockupTemplate: 'hat', basePrice: 23.99 },
  { id: 148, name: 'Trucker Hat', description: 'Mesh-back cap', category: 'accessory', mockupTemplate: 'hat', basePrice: 23.99 },
]

const DEFAULT_CONSTRAINTS = {
  minDPI: 150,
  maxDPI: 300,
  formats: ['PNG', 'SVG'],
  maxFileSizeMB: 50,
  colorMode: 'RGB' as const,
}

function printAreasFor(category: ProductCategory): Product['printAreas'] {
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

function configurationsFor(areas: Product['printAreas']): Product['configurations'] {
  const configs: Product['configurations'] = areas.map((area) => ({
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
  return configs
}

function variantsFor(category: ProductCategory): Product['variants'] {
  if (category === 'drinkware' || category === 'poster') {
    return [
      { id: 'size', name: 'Size', options: [{ value: 'One size', label: 'One size', available: true }] },
      { id: 'color', name: 'Color', options: [{ value: 'Default', label: 'Default', hexCode: '#FFFFFF', available: true }] },
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

function rowToGridProduct(row: Row): Product {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    printfulSKU: String(row.id),
    basePrice: row.basePrice,
    imageUrl: PLACEHOLDER(row.name),
    category: row.category,
    configurations: [],
    variants: [],
    printAreas: [],
    mockupTemplate: row.mockupTemplate,
    available: true,
  }
}

function rowToFullProduct(row: Row): Product {
  const printAreas = printAreasFor(row.category)
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    printfulSKU: String(row.id),
    basePrice: row.basePrice,
    imageUrl: PLACEHOLDER(row.name),
    category: row.category,
    printAreas,
    configurations: configurationsFor(printAreas),
    variants: variantsFor(row.category),
    mockupTemplate: row.mockupTemplate,
    available: true,
  }
}

export function getEmergencyCatalogProducts(): Product[] {
  return ROWS.map(rowToGridProduct)
}

export function getEmergencyProductById(productId: string): Product | null {
  const id = parseInt(productId, 10)
  if (!Number.isFinite(id)) return null
  const row = ROWS.find((r) => r.id === id)
  return row ? rowToFullProduct(row) : null
}
