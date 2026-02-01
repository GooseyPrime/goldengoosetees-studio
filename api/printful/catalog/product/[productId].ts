import type { VercelRequest, VercelResponse } from '@vercel/node'
import { printfulServer } from '../../../_lib/printful'
import { printfulToProduct } from '../../../_lib/printful-transform'

/**
 * Public catalog product detail - no auth required
 * GET /api/printful/catalog/product/:productId
 * Returns full Product for use in DesignEditor flow
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const productId = req.query.productId
  if (!productId || typeof productId !== 'string') {
    res.status(400).json({ error: 'Product ID required' })
    return
  }

  const id = parseInt(productId, 10)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Invalid product ID' })
    return
  }

  try {
    if (!printfulServer.isConfigured()) {
      res.status(503).json({ error: 'Catalog not configured' })
      return
    }

    const [product, variants] = await Promise.all([
      printfulServer.getProduct(id),
      printfulServer.getVariants(id),
    ])

    const appProduct = printfulToProduct(product as any, variants as any)

    res.status(200).json({
      success: true,
      product: appProduct,
    })
  } catch (error: any) {
    console.error('Catalog product error:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch product',
    })
  }
}
