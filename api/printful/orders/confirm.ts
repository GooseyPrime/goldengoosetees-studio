import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
import { printfulServer } from '../../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    await requireAdmin(req)

    const { orderId } = req.body

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    // Confirm order in Printful
    const confirmedOrder = await printfulServer.confirmOrder(Number(orderId))

    res.status(200).json({
      success: true,
      order: confirmedOrder
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to confirm Printful order'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage
    })
  }
}
