import type { VercelRequest, VercelResponse } from '@vercel/node'

// --- Inlined from api/_lib/printful-transform.ts ---

type ProductCategory = 'apparel' | 'drinkware' | 'accessory' | 'poster'
type ProductMockupTemplate = 'tshirt' | 'mug' | 'hat' | 'poster'

interface PrintfulCatalogProduct {
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

function printfulToCatalogSummary(product: PrintfulCatalogProduct): {
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

// --- Inlined from api/_lib/printful.ts ---

const PRINTFUL_API_BASE = 'https://api.printful.com'
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY ?? process.env.VITE_PRINTFUL_API_KEY

interface PrintfulProduct {
  id: number
  type: string
  type_name: string
  title: string
  brand: string | null
  model: string
  image: string
  variant_count: number
  currency: string
  options: Array<{
    id: string
    title: string
    type: string
    values: Record<string, string>
    additional_price: number | null
  }>
  is_discontinued: boolean
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('Printful API key not configured. Set PRINTFUL_API_KEY environment variable.')
  }

  const url = `${PRINTFUL_API_BASE}${endpoint}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Printful API error: ${response.statusText}`)
  }
  const data = await response.json()
  return data.result as T
}

const printfulServer = {
  isConfigured(): boolean {
    return !!PRINTFUL_API_KEY
  },
  async getProducts(categoryId?: number): Promise<PrintfulProduct[]> {
    const query = categoryId ? `?category_id=${categoryId}` : ''
    return request<PrintfulProduct[]>(`/products${query}`)
  },
}


// --- Original handler from api/printful/catalog/list.ts, modified to use inlined code ---

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    if (!printfulServer.isConfigured()) {
      res.status(200).json({ success: true, products: [], paging: { total: 0, offset: 0, limit: 24 } })
      return
    }

    const categoryId = req.query.category_id
      ? parseInt(String(req.query.category_id), 10)
      : undefined
    const numCategoryId = Number.isFinite(categoryId) ? (categoryId as number) : undefined

    const rawProducts = await printfulServer.getProducts(numCategoryId)

    const products = rawProducts.map((p: any) =>
      printfulToCatalogSummary({
        ...p,
        files: p.files || [],
      })
    )

    res.status(200).json({
      success: true,
      products,
      paging: {
        total: products.length,
        offset: 0,
        limit: products.length,
      },
    })
  } catch (error: any) {
    console.error('Catalog list error:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch catalog',
    })
  }
}
