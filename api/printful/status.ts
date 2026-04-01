import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_lib/auth'
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
    // Require admin authentication
    await requireAdmin(req)

    // Check if Printful is configured
    const configured = printfulServer.isConfigured()

    res.status(200).json({
      configured,
      storeId: configured ? printfulServer.getStoreId() : undefined
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to check Printful status'
    
    res.status(statusCode).json({ error: message })
  }
}


