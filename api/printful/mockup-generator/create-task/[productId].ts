import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../../_lib/auth'
import { printfulServer } from '../../../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
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

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await printfulServer.createMockupTask(Number(productId), payload || {})

    res.status(200).json({
      success: true,
      task_key: result.task_key,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to create mockup task'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}
