import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_lib/auth'
import { printfulServer } from '../_lib/printful'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    await requireAdmin(req)

    // Test connection by fetching products
    await printfulServer.getProducts()

    res.status(200).json({
      ok: true,
      message: 'Successfully connected to Printful'
    })
  } catch (error: any) {
    // Sanitize error message (don't expose API key)
    const errorMessage = error.message || 'Failed to connect to Printful'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      ok: false,
      error: sanitizedMessage
    })
  }
}
