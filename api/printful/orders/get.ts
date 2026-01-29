import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '../../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require user authentication
    await requireAuth(req)

    const { orderId } = req.query

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    // Get order from Printful
    const order = await printfulServer.getOrder(orderId)

    res.status(200).json({
      success: true,
      order
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful order'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage
    })
  }
}
