import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '@/api/_lib/printful.js'

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

    const products = await printfulServer.getSyncProducts()

    res.status(200).json({
      success: true,
      products,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful store products'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}

