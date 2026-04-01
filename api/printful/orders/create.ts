import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer, PrintfulOrderRequest } from '../../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require user authentication - regular users need to create orders during checkout
    await requireAuth(req)

    const orderData: PrintfulOrderRequest = req.body

    if (!orderData || !orderData.recipient || !orderData.items) {
      res.status(400).json({ error: 'Invalid order data' })
      return
    }

    // Create order in Printful
    const printfulOrder = await printfulServer.createOrder(orderData)

    res.status(200).json({
      success: true,
      order: printfulOrder
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to create Printful order'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage
    })
  }
}
