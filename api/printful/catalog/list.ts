import type { VercelRequest, VercelResponse } from '@vercel/node'
import { printfulServer } from '#api/printful.js'
import { printfulToCatalogSummary } from '../../_lib/printful-transform'

/**
 * Public catalog list - no auth required for browsing
 * GET /api/printful/catalog/list?category_id=24&limit=48
 */
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


