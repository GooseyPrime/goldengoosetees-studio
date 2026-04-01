import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../../_lib/auth'
import { printfulServer } from '../../../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAuth(req)

    const { productId } = req.query
    if (!productId || typeof productId !== 'string') {
      res.status(400).json({ error: 'Product ID is required' })
      return
    }

    const result = await printfulServer.getPrintfiles(Number(productId))

    res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful printfiles'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}
