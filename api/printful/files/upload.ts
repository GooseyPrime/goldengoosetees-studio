import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '@/api/_lib/printful.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require user authentication
    // Note: This endpoint is required for users to upload design files during checkout.
    // Rate limiting and abuse prevention should be implemented at the infrastructure level (e.g., Vercel rate limits)
    await requireAuth(req)

    // Handle file upload
    // Note: Vercel serverless functions handle FormData differently
    // The file should be sent as base64 or URL in the request body
    const { fileData, filename } = req.body

    if (!fileData || !filename) {
      res.status(400).json({ error: 'File data and filename are required' })
      return
    }

    // Convert base64 to Blob if needed
    let fileBlob: Blob
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Base64 data URL
      const response = await fetch(fileData)
      fileBlob = await response.blob()
    } else if (typeof fileData === 'string') {
      // Assume it's a URL
      const response = await fetch(fileData)
      fileBlob = await response.blob()
    } else {
      res.status(400).json({ error: 'Invalid file data format' })
      return
    }

    // Upload to Printful
    const result = await printfulServer.uploadFile(fileBlob, filename)

    res.status(200).json({
      success: true,
      file: result
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to upload file to Printful'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage
    })
  }
}

