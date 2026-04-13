import { NextResponse } from 'next/server'
import { isGeminiNativeConfigured } from '@/lib/ai/geminiImageClient'
import { isNanoBananaConfigured } from '@/lib/ai/nanoBananaClient'

export const dynamic = 'force-dynamic'

/**
 * No secrets — for production debugging (confirm which image backends env exposes).
 */
export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim())
  const geminiConfigured = isGeminiNativeConfigured()
  const nanoBananaConfigured = isNanoBananaConfigured()
  return NextResponse.json({
    success: true,
    geminiConfigured,
    nanoBananaConfigured,
    openaiConfigured,
    nanoBananaGeneratePathDefault: '/v1/images/generations',
  })
}
