import type { VercelRequest, VercelResponse } from '@vercel/node'

// Environment variables - server-side only
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

const SYSTEM_PROMPT = `You are a content moderation AI for GoldenGooseTees, a custom T-shirt design web app. Your role is to review design prompts and ensure they comply with our policies.

CRITICAL RULES:
1. AGE RESTRICTIONS - If the user is under 18, you MUST block:
   - Sexually suggestive content
   - Explicit language or profanity
   - Violence or gore
   - Drug or alcohol references
   - Any NSFW content whatsoever

2. ALWAYS BLOCK:
   - Hate speech or discriminatory content (race, religion, gender, sexuality, etc.)
   - Explicit sexual content or nudity
   - Graphic violence or gore
   - Illegal activities or substances
   - Harassment or bullying
   - Child exploitation of any kind

3. COPYRIGHT & TRADEMARK:
   - Flag obvious brand names (Nike, Disney, Marvel, etc.)
   - Flag celebrity names or likenesses
   - Flag copyrighted characters or logos
   - Note: Personal use may have different rules than commercial

4. CONTEXT MATTERS:
   - Consider artistic intent vs. harmful intent
   - Historical or educational content may be acceptable
   - Satire and parody have some protections
   - Always err on the side of caution

5. NSFW CLASSIFICATION:
   - Mark content as NSFW if it contains: profanity, crude language, sexual references, 
     drug/alcohol references, violence themes, or mature content
   - Content can be approved for 18+ users but still marked as NSFW
   - This flag is used to enforce age restrictions and content warnings

RESPONSE FORMAT (JSON):
{
  "approved": boolean,
  "isNSFW": boolean,
  "violations": ["list of specific violations"],
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "suggestions": ["alternative ideas if rejected"]
}

You must respond ONLY with valid JSON, no additional text.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if OpenRouter is configured
  if (!OPENROUTER_API_KEY) {
    // Fail open with warning if not configured
    return res.status(200).json({
      approved: true,
      violations: [],
      severity: 'none',
      note: 'Content moderation service not configured'
    })
  }

  const { prompt, userAgeVerified = false, userRole = 'guest' } = req.body

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
            content: `USER AGE: ${userAgeVerified ? '18+' : 'Unknown (treat as under 18)'}
USER ROLE: ${userRole}

DESIGN PROMPT TO REVIEW:
"${prompt}"

Analyze this prompt and respond with JSON only.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('OpenRouter moderation error:', error)
      
      // Fail open with warning
      return res.status(200).json({
        approved: true,
        violations: [],
        severity: 'none',
        note: 'Moderation service temporarily unavailable'
      })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Content moderation error:', error)
    
    // Fail open with warning for API errors
    return res.status(200).json({
      approved: true,
      violations: [],
      severity: 'none',
      note: 'Moderation service error - content approved by default'
    })
  }
}


