import type { VercelRequest, VercelResponse } from '@vercel/node'
import { printfulServer } from '../../_lib/printful'
import { getSupabaseAdmin } from '../../_lib/supabase-server'
import { getCuratedPrintfulProductIds, isCuratedProductId } from '../../_lib/offerings'
import { catalogStartingRetail, inferPricingCategory, type ProductCategoryHint } from '../../_lib/pricing'
import { buildStaticGridProducts } from '../../_lib/static-catalog'

type ProductCategory = 'apparel' | 'drinkware' | 'accessory' | 'poster'

interface CatalogProduct {
  id: number
  type: string
  type_name: string
  title: string
  brand?: string | null
  model?: string
  image: string
  variant_count: number
  currency: string
  files?: unknown[]
  is_discontinued?: boolean
}

function sendJson(res: VercelResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function inferCategory(product: CatalogProduct): ProductCategory {
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

function hintFromCategory(cat: ProductCategory): ProductCategoryHint {
  if (cat === 'drinkware') return 'drinkware'
  if (cat === 'poster') return 'poster'
  if (cat === 'accessory') return 'accessory'
  return 'apparel'
}

/**
 * Use cron-populated cache only for catalog list. Do not call Printful per product here:
 * N sequential variant fetches caused timeouts and Vercel non-JSON error pages, breaking
 * `res.json()` on the client (e.g. "Unexpected token 'A', \"A server e\"...").
 */
function minBaseFromCache(cachedMin: number | undefined): number {
  if (cachedMin != null && Number.isFinite(cachedMin) && cachedMin > 0) {
    return cachedMin
  }
  return 19.99
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const respondStatic = (fallbackReason: string) => {
    const products = buildStaticGridProducts()
    sendJson(res, 200, {
      success: true,
      products,
      paging: { total: products.length, offset: 0, limit: products.length },
      source: 'static_fallback',
      fallbackReason,
    })
  }

  try {
    if (!printfulServer.isConfigured()) {
      respondStatic('printful_not_configured')
      return
    }

    const categoryId = req.query.category_id ? parseInt(String(req.query.category_id), 10) : undefined
    const numCategoryId = Number.isFinite(categoryId) ? categoryId : undefined

    const rawProducts = (await printfulServer.getProducts(numCategoryId)) as CatalogProduct[]
    const curated = getCuratedPrintfulProductIds()
    const filtered =
      curated.length === 0 ? rawProducts : rawProducts.filter((p) => isCuratedProductId(p.id))

    if (filtered.length === 0) {
      respondStatic('no_matching_products')
      return
    }

    const minByProduct = new Map<number, number>()
    const admin = getSupabaseAdmin()
    if (admin && filtered.length > 0) {
      try {
        const ids = filtered.map((p: CatalogProduct) => p.id)
        const { data: cacheRows, error: cacheErr } = await admin
          .from('printful_variant_price_cache')
          .select('product_id, printful_base_price')
          .in('product_id', ids)

        if (cacheErr) {
          console.warn('catalog list: variant cache read skipped', cacheErr.message)
        } else {
          for (const row of cacheRows || []) {
            const pid = Number(row.product_id)
            const price = Number(row.printful_base_price)
            if (!Number.isFinite(pid) || !Number.isFinite(price)) continue
            const prev = minByProduct.get(pid)
            if (prev == null || price < prev) minByProduct.set(pid, price)
          }
        }
      } catch (e: any) {
        console.warn('catalog list: cache lookup failed', e?.message)
      }
    }

    const products = []
    for (const p of filtered as CatalogProduct[]) {
      const category = inferCategory(p)
      const hint = hintFromCategory(category)
      const pricingCategory = inferPricingCategory(hint, p.title, p.type_name)
      const minBase = minBaseFromCache(minByProduct.get(p.id))
      const basePrice = catalogStartingRetail(minBase, pricingCategory)

      products.push({
        id: String(p.id),
        name: p.title,
        description: p.model || p.type_name || p.title,
        printfulSKU: String(p.id),
        basePrice,
        imageUrl: p.image,
        category,
        configurations: [],
        variants: [],
        printAreas: [],
        mockupTemplate: category === 'drinkware' ? 'mug' : category === 'poster' ? 'poster' : category === 'accessory' ? 'hat' : 'tshirt',
        available: !p.is_discontinued,
      })
    }

    sendJson(res, 200, {
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
    respondStatic(typeof error?.message === 'string' ? error.message : 'printful_error')
  }
}
