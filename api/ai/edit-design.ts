import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * AI Edit Design - modifies an existing design based on text instructions
 * POST /api/ai/edit-design
 * Body: { imageUrl: string, editPrompt: string }
 * Response: { imageUrl: string }
 *
 * Uses generate-design with an enhanced prompt as the edit instructions.
 * Note: This is a stopgap - true image-to-image editing would require
 * a dedicated model that accepts image + text input.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { imageUrl, editPrompt } = req.body || {}

  if (!editPrompt || typeof editPrompt !== 'string') {
    res.status(400).json({ error: 'editPrompt is required' })
    return
  }

  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'imageUrl is required' })
    return
  }

  try {
    const enhancedPrompt = `Create a t-shirt graphic design with the following modifications to an existing design: ${editPrompt}.

The result should be print-ready with transparent or white background, suitable for t-shirt printing. Maintain professional quality, clear shapes, and high contrast.`

    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/$/, '')

    const genRes = await fetch(`${origin}/api/ai/generate-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        widthInches: 12,
        heightInches: 16,
      }),
    })

    if (!genRes.ok) {
      const err = await genRes.json().catch(() => ({}))
      throw new Error(err.error || `Image generation failed: ${genRes.statusText}`)
    }

    const data = await genRes.json()
    return res.status(200).json({ imageUrl: data.imageUrl })
  } catch (error: any) {
    console.error('Edit design error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to edit design',
    })
  }
}
