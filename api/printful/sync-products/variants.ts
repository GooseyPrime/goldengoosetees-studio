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
    await requireAuth(req)

    const { syncProductId } = req.query
    if (!syncProductId || typeof syncProductId !== 'string') {
      res.status(400).json({ error: 'Sync product ID is required' })
      return
    }

    const variants = await printfulServer.getSyncVariants(Number(syncProductId))

    res.status(200).json({
      success: true,
      variants,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get Printful store variants'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}
