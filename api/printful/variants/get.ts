import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '#api/printful.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require user authentication - users need this for mockup generation
    await requireAuth(req)

    const { variantId } = req.query

    if (!variantId || typeof variantId !== 'string') {
      res.status(400).json({ error: 'Variant ID is required' })
      return
    }

    // Get variant from Printful
    const variant = await printfulServer.getVariant(Number(variantId))

    res.status(200).json({
      success: true,
      variant
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful variant'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage
    })
  }
}


