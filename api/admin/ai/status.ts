import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    await requireAdmin(req)

    // Check which AI providers are configured
    const openRouterConfigured = !!process.env.OPENROUTER_API_KEY
    const openAIConfigured = !!process.env.OPENAI_API_KEY
    const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)

    res.status(200).json({
      providers: {
        openRouter: {
          configured: openRouterConfigured,
          name: 'OpenRouter (GPT-4o)'
        },
        openai: {
          configured: openAIConfigured,
          name: 'OpenAI (DALL-E 3)'
        },
        gemini: {
          configured: geminiConfigured,
          name: 'Google Gemini'
        }
      },
      // Note: Error tracking and rate limiting would require additional infrastructure
      // For now, we only show configuration status
      errors: {
        tracked: false,
        message: 'Error tracking not implemented. Add logging infrastructure to track errors.'
      },
      rateLimiting: {
        enabled: false,
        message: 'Rate limiting not implemented. Add Redis/KV-based limiter if needed.'
      }
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to get AI status'
    
    res.status(statusCode).json({ error: message })
  }
}
