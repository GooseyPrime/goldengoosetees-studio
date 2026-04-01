import type { VercelRequest, VercelResponse } from '@vercel/node'
import { printfulServer } from '@/api/_lib/printful.js'

/**
 * Public catalog categories - no auth required
 * GET /api/printful/catalog/categories
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
      res.status(200).json({ success: true, categories: [] })
      return
    }

    const categories = await printfulServer.getCategories()

    res.status(200).json({
      success: true,
      categories: categories || [],
    })
  } catch (error: any) {
    console.error('Catalog categories error:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch categories',
    })
  }
}

