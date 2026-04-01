import type { VercelRequest, VercelResponse } from '@vercel/node'

// Environment variables - server-side only
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

const SYSTEM_PROMPT = `You are an intellectual property (IP) detection AI for a custom T-shirt printing service. Your role is to identify potential copyright and trademark violations in design requests.

WHAT TO FLAG:
1. BRAND NAMES & LOGOS:
   - Corporate brands (Nike, Apple, Coca-Cola, etc.)
   - Sports teams and leagues (NFL, NBA, etc.)
   - Entertainment brands (Disney, Marvel, DC, etc.)
   - Video game companies and titles
   - Social media platform logos

2. CHARACTERS & MEDIA:
   - Movie characters
   - TV show characters
   - Video game characters
   - Cartoon/anime characters
   - Book characters

3. CELEBRITY LIKENESSES:
   - Actors, musicians, athletes
   - Politicians and public figures
   - Historical figures may be acceptable (context matters)

4. COPYRIGHTED ARTWORK:
   - Famous paintings or illustrations
   - Comic book art
   - Album covers

WHAT'S GENERALLY OK:
- Generic concepts (skulls, flowers, geometric patterns)
- Common phrases (unless trademarked)
- Original artwork inspired by styles
- Parody (in some cases, but flag for review)
- Fan art for personal use (low risk)

RESPONSE FORMAT (JSON):
{
  "hasViolation": boolean,
  "detectedItems": ["specific brands/characters/etc"],
  "riskLevel": "none" | "low" | "medium" | "high",
  "recommendations": ["suggestions for modifications"]
}

You must respond ONLY with valid JSON, no additional text.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if OpenRouter is configured
  if (!OPENROUTER_API_KEY) {
    // Fail open if not configured
    return res.status(200).json({
      hasViolation: false,
      detectedItems: [],
      riskLevel: 'none',
      recommendations: [],
      note: 'IP checking service not configured'
    })
  }

  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VITE_APP_URL || 'https://goldengoosetees.com',
        'X-Title': 'Golden Goose Tees'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `DESIGN PROMPT TO ANALYZE:
"${prompt}"

Check for potential IP violations and respond with JSON only.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('OpenRouter IP check error:', error)
      
      // Fail open with warning
      return res.status(200).json({
        hasViolation: false,
        detectedItems: [],
        riskLevel: 'none',
        recommendations: [],
        note: 'IP checking service temporarily unavailable'
      })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('IP check error:', error)
    
    // Fail open for API errors
    return res.status(200).json({
      hasViolation: false,
      detectedItems: [],
      riskLevel: 'none',
      recommendations: [],
      note: 'IP checking service error'
    })
  }
}


