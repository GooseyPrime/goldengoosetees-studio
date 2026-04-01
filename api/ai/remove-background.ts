import type { VercelRequest, VercelResponse } from '@vercel/node'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY
const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'

/**
 * Remove background from image
 * POST /api/ai/remove-background
 * Body: { imageUrl: string } (data URL or public URL)
 * Response: { imageUrl: string } (data URL)
 *
 * Uses remove.bg if REMOVE_BG_API_KEY is set, otherwise Replicate rembg if REPLICATE_API_TOKEN is set.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { imageUrl } = req.body || {}

  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'imageUrl is required' })
    return
  }

  if (REMOVE_BG_API_KEY) {
    try {
      const formData = new URLSearchParams()
      if (imageUrl.startsWith('data:')) {
        const base64 = imageUrl.split(',')[1]
        formData.append('image_file_b64', base64)
      } else {
        formData.append('image_url', imageUrl)
      }
      formData.append('size', 'auto')
      formData.append('format', 'png')

      const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': REMOVE_BG_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!rbRes.ok) {
        const errText = await rbRes.text()
        throw new Error(errText || 'remove.bg failed')
      }

      const arrayBuffer = await rbRes.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const dataUrl = `data:image/png;base64,${base64}`
      return res.status(200).json({ imageUrl: dataUrl })
    } catch (error: any) {
      console.error('Remove background (remove.bg) error:', error)
      return res.status(500).json({
        error: error?.message || 'Failed to remove background',
      })
    }
  }

  if (!REPLICATE_API_TOKEN) {
    return res.status(503).json({
      error: 'Background removal not configured. Set REMOVE_BG_API_KEY or REPLICATE_API_TOKEN.',
    })
  }

  try {
    let imageInput: string = imageUrl

    if (imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split(',')[1]
      const uploadRes = await fetch('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(base64, 'base64'),
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to upload image')
      }
      const uploadData = await uploadRes.json()
      imageInput = uploadData.urls?.get || uploadData.url || uploadData
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REMBG_VERSION,
        input: { image: imageInput },
      }),
    })

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}))
      throw new Error(errData.detail || errData.error || 'Failed to create prediction')
    }

    let prediction = await createRes.json()
    let attempts = 0
    const maxAttempts = 30

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      })
      prediction = await pollRes.json()
      attempts++
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || prediction.detail || 'Background removal failed')
    }

    if (prediction.status !== 'succeeded') {
      throw new Error('Background removal timed out')
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (!outputUrl) {
      throw new Error('No output from background removal')
    }

    const imgRes = await fetch(outputUrl)
    if (!imgRes.ok) {
      throw new Error('Failed to fetch result image')
    }

    const arrayBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mime = imgRes.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${mime};base64,${base64}`

    return res.status(200).json({ imageUrl: dataUrl })
  } catch (error: any) {
    console.error('Remove background (Replicate) error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to remove background',
    })
  }
}

