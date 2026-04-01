import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '../../_lib/printful'

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

    const { syncProductId } = req.query
    if (!syncProductId || typeof syncProductId !== 'string') {
      res.status(400).json({ error: 'Sync product ID is required' })
      return
    }

    const product = await printfulServer.getSyncProduct(Number(syncProductId))

    res.status(200).json({
      success: true,
      product,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful store product'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}
