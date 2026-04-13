import { NextResponse } from 'next/server'
import { isNanoBananaConfigured } from '@/lib/ai/nanoBananaClient'

export const dynamic = 'force-dynamic'

/**
 * No secrets — for production debugging (confirm which image backends env exposes).
 */
export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim())
  const nanoBananaConfigured = isNanoBananaConfigured()
  return NextResponse.json({
    success: true,
    openaiConfigured,
    nanoBananaConfigured,
    nanoBananaGeneratePathDefault: '/v1/images/generations',
  })
}
