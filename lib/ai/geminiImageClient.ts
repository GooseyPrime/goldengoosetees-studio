import { randomUUID } from 'crypto'
import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const BUCKET = 'design-uploads'

export class GeminiImageError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'GeminiImageError'
    this.statusCode = statusCode
  }
}

export function shouldFallbackFromGeminiError(e: unknown): boolean {
  if (!(e instanceof GeminiImageError)) return false
  const c = e.statusCode
  if (c === 404 || c === 429 || c === 503) return true
  const msg = e.message.toLowerCase()
  return (
    msg.includes('not found') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  )
}

function apiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ''
  )
}

export function isGeminiNativeConfigured(): boolean {
  return Boolean(apiKey())
}

function primaryModel(): string {
  return (
    process.env.GEMINI_IMAGE_MODEL?.trim() ||
    'gemini-2.5-flash-image'
  )
}

function fallbackModel(): string | null {
  const f = process.env.GEMINI_IMAGE_MODEL_FALLBACK?.trim()
  return f || null
}

function extractPngBufferFromResponse(res: GenerateContentResponse): Buffer | null {
  const candidates = res.candidates
  if (!candidates?.length) return null
  for (const c of candidates) {
    const parts = c.content?.parts
    if (!parts) continue
    for (const p of parts) {
      const inline = p.inlineData
      if (!inline?.data) continue
      const mime = (inline.mimeType || 'image/png').toLowerCase()
      if (!mime.startsWith('image/')) continue
      try {
        return Buffer.from(inline.data, 'base64')
      } catch {
        continue
      }
    }
  }
  return null
}

async function persistPngToDesignUploads(buf: Buffer): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new GeminiImageError(
      'Gemini returned image bytes but Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and create the design-uploads bucket, so the app can publish an HTTPS URL for Printful.'
    )
  }
  const admin = getSupabaseAdmin()
  const path = `gemini/${randomUUID()}.png`
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) {
    throw new GeminiImageError(
      `Could not store generated image: ${error.message}. Confirm bucket "${BUCKET}" exists and the service role can upload.`
    )
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function generateWithModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.85,
    },
  })

  const buf = extractPngBufferFromResponse(response)
  if (!buf || buf.length < 100) {
    const block = response.promptFeedback?.blockReason
    const txt = response.text?.trim()
    throw new GeminiImageError(
      block
        ? `Gemini blocked the prompt (${String(block)}). Try a different description.`
        : txt
          ? `Gemini did not return an image. Model said: ${txt.slice(0, 200)}`
          : 'Gemini did not return image data in the response. Try another model via GEMINI_IMAGE_MODEL or check Google AI Studio quotas.'
    )
  }

  const imageUrl = await persistPngToDesignUploads(buf)
  const revised = response.text?.trim() || undefined
  return { imageUrl, revisedPrompt: revised }
}

export async function generateImageGemini(prompt: string): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const key = apiKey()
  if (!key) {
    throw new GeminiImageError('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }

  const ai = new GoogleGenAI({ apiKey: key })
  const primary = primaryModel()
  const fallback = fallbackModel()

  try {
    return await generateWithModel(ai, primary, prompt)
  } catch (e) {
    if (fallback && fallback !== primary) {
      console.warn('[generateImageGemini] Primary model failed, trying fallback:', e)
      return await generateWithModel(ai, fallback, prompt)
    }
    throw e
  }
}

export async function editImageGemini(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<{ imageUrl: string }> {
  const key = apiKey()
  if (!key) {
    throw new GeminiImageError('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }

  const ai = new GoogleGenAI({ apiKey: key })
  const model = primaryModel()
  const b64 = imageBuffer.toString('base64')
  const normalizedMime =
    mimeType && mimeType.includes('/')
      ? mimeType
      : 'image/png'

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime,
              data: b64,
            },
          },
          {
            text: `Edit this apparel graphic as instructed. Output a single revised image. Instructions: ${prompt}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.65,
    },
  })

  const buf = extractPngBufferFromResponse(response)
  if (!buf || buf.length < 100) {
    throw new GeminiImageError(
      response.text?.trim()
        ? `Gemini did not return an edited image: ${response.text.trim().slice(0, 200)}`
        : 'Gemini did not return edited image data.'
    )
  }

  const imageUrl = await persistPngToDesignUploads(buf)
  return { imageUrl }
}
