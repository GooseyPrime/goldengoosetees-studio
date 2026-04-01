import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildGeminiTeeGraphicPrompt, pickClosestGeminiAspectRatio } from '@/api/_lib/gemini-image.js'
import { getAppConfig } from '@/api/_lib/config.js'
import { notifyAdmin } from '@/api/_lib/notify.js'

// Environment variables - server-side only
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = 'https://api.openai.com/v1'

const DEFAULT_GEMINI_IMAGE_PRIMARY = 'gemini-2.0-flash-exp-image-generation'
const DEFAULT_GEMINI_IMAGE_FALLBACK = 'gemini-2.0-flash-exp'

async function tryGeminiImage(
  prompt: string,
  widthInches?: number,
  heightInches?: number,
  modelPrimary?: string,
  modelFallback?: string
): Promise<{ imageUrl: string; revisedPrompt?: string } | null> {
  if (!GEMINI_API_KEY) return null
  const fullPrompt = buildGeminiTeeGraphicPrompt(prompt, { widthInches, heightInches })
  const aspectRatio =
    pickClosestGeminiAspectRatio(widthInches, heightInches) || '1:1'

  const modelsToTry = [
    modelPrimary || DEFAULT_GEMINI_IMAGE_PRIMARY,
    modelFallback || DEFAULT_GEMINI_IMAGE_FALLBACK
  ]
  for (const model of modelsToTry) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio,
            },
          },
        }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.warn(`Gemini ${model} image gen failed:`, response.status, errBody?.error?.message)
        continue
      }

      const data = await response.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      const imagePart =
        parts.find((p: any) => p?.inlineData?.data) ||
        parts.find((p: any) => p?.inline_data?.data) ||
        parts.find((p: any) => p?.inlineData) ||
        parts.find((p: any) => p?.inline_data)
      const inline = imagePart?.inlineData || imagePart?.inline_data
      const base64 = inline?.data
      const mimeType = inline?.mimeType || inline?.mime_type || 'image/png'

      if (!base64) continue
      return {
        imageUrl: `data:${mimeType};base64,${base64}`,
        revisedPrompt: fullPrompt,
      }
    } catch (e) {
      console.warn(`Gemini ${model} image gen error:`, e)
    }
  }
  return null
}

async function tryDalle3(
  prompt: string,
  size: string = '1024x1024',
  quality: string = 'hd',
  style: string = 'vivid'
): Promise<{ imageUrl: string; revisedPrompt?: string } | null> {
  if (!OPENAI_API_KEY) return null
  const enhancedPrompt = `Create a detailed, high-quality t-shirt graphic design with the following concept: ${prompt}

CRITICAL REQUIREMENTS:
- This MUST be a complete, visually rich illustration or artwork
- NOT just text or typography - include visual imagery
- Include ALL visual elements described (characters, objects, scenes, etc.)
- If text is mentioned, incorporate it as part of the overall design composition
- Use a pure white or transparent background suitable for t-shirt printing
- Style: Bold, eye-catching, colorful artwork with professional print-ready quality
- Make it vibrant and detailed with clear, sharp graphics
- Do NOT create a mockup of a t-shirt - create ONLY the graphic artwork itself
- Ensure high contrast and visibility for printing on fabric`

  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.warn('DALL-E image gen failed:', response.status, error?.error?.message)
    return null
  }

  const data = await response.json()
  const base64Image = data.data?.[0]?.b64_json
  const revisedPrompt = data.data?.[0]?.revised_prompt
  if (!base64Image) return null
  return {
    imageUrl: `data:image/png;base64,${base64Image}`,
    revisedPrompt,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    prompt,
    size = '1024x1024',
    quality = 'hd',
    style = 'vivid',
    widthInches,
    heightInches,
  } = req.body || {}

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'Image generation not configured. Set GEMINI_API_KEY and/or OPENAI_API_KEY on the server.',
    })
  }

  try {
    const config = await getAppConfig()
    const imagePrimary = (config.image_model_primary as string) || DEFAULT_GEMINI_IMAGE_PRIMARY
    const imageFallback = (config.image_model_fallback as string) || DEFAULT_GEMINI_IMAGE_FALLBACK

    // 1. Try Gemini first (Nano-Banana style)
    const geminiResult = await tryGeminiImage(
      prompt,
      widthInches,
      heightInches,
      imagePrimary,
      imageFallback
    )
    if (geminiResult) {
      return res.status(200).json({
        imageUrl: geminiResult.imageUrl,
        revisedPrompt: geminiResult.revisedPrompt,
      })
    }

    // 2. Fallback to DALL-E 3
    const dalleResult = await tryDalle3(prompt, size, quality, style)
    if (dalleResult) {
      return res.status(200).json({
        imageUrl: dalleResult.imageUrl,
        revisedPrompt: dalleResult.revisedPrompt,
      })
    }

    await notifyAdmin({
      category: 'ai_failures',
      subject: 'Golden Goose Tees: Image generation failed',
      shortMessage: 'Image generation failed. Gemini and DALL-E were tried.',
    })
    return res.status(503).json({
      error:
        'Image generation failed. Gemini and DALL-E were tried; check server configuration and API keys.',
    })
  } catch (error: any) {
    console.error('Design generation error:', error)
    await notifyAdmin({
      category: 'ai_failures',
      subject: 'Golden Goose Tees: Design generation error',
      shortMessage: error?.message || 'Design generation threw an exception.',
      detail: String(error?.stack || ''),
    }).catch(() => {})
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return res.status(500).json({ error: 'Network error. Please check connection and try again.' })
    }
    return res.status(500).json({
      error: error.message || 'Failed to generate design',
    })
  }
}

