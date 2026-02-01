import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAppConfig } from '../_lib/config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = 'https://api.openai.com/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

type Provider = 'gemini' | 'openai' | 'openrouter'

/**
 * Generate conversational messages for design phases
 * Provides context-aware responses during design creation flow
 */

const SYSTEM_PROMPT = `You are a helpful design assistant at GoldenGooseTees. Generate brief, encouraging messages for users during the design process. Keep responses concise (1-2 sentences) and enthusiastic.`

async function chatWithGemini(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 150
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured')
  
  const response = await fetch(`${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ 
        role: 'user', 
        parts: [{ text: prompt }] 
      }],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini: ${response.statusText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (text == null) throw new Error('Empty Gemini response')
  return String(text).trim()
}

async function chatWithOpenAI(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 150
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured')
  
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (content == null) throw new Error('Empty OpenAI response')
  return String(content).trim()
}

async function chatWithOpenRouter(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 150
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured')
  
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VITE_APP_URL || 'https://goldengoosetees.com',
      'X-Title': 'Golden Goose Tees Kiosk',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenRouter: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (content == null) throw new Error('Empty OpenRouter response')
  return String(content).trim()
}

function buildPrompt(
  type: 'creating' | 'ready' | 'error',
  context?: { concept?: string; style?: string; text?: string; error?: string }
): string {
  const { concept = '', style = '', text = '', error = '' } = context || {}

  switch (type) {
    case 'creating':
      return `Generate an enthusiastic 1-2 sentence message telling the user we're creating their design${concept ? ` about "${concept}"` : ''}${style ? ` in a ${style} style` : ''}${text ? ` with the text "${text}"` : ''}. Keep it exciting and brief!`
    
    case 'ready':
      return `Generate an enthusiastic 1-2 sentence message telling the user their design is ready${concept ? ` for their "${concept}" concept` : ''}. Invite them to check it out!`
    
    case 'error':
      return `Generate a friendly, reassuring 1-2 sentence message telling the user we had trouble creating their design${error ? ` (${error})` : ''}, but they should try again. Be encouraging!`
    
    default:
      return 'Generate a brief, friendly message.'
  }
}

function getFallbackMessage(type: 'creating' | 'ready' | 'error'): string {
  switch (type) {
    case 'creating':
      return "Creating your design now… This should just take a moment! ✨"
    case 'ready':
      return "Your design is ready! Check it out in the preview above. 🎨"
    case 'error':
      return "Something went wrong. Please try again with a different prompt or description."
    default:
      return "Please wait…"
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, concept, style, text, error } = req.body || {}

  if (!type || !['creating', 'ready', 'error'].includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid type. Must be one of: creating, ready, error' 
    })
  }

  // If no API keys are configured, return fallback immediately
  if (!GEMINI_API_KEY && !OPENAI_API_KEY && !OPENROUTER_API_KEY) {
    return res.status(200).json({ 
      content: getFallbackMessage(type)
    })
  }

  try {
    const config = await getAppConfig()
    const provider = (config.conversational_provider as Provider) || 'gemini'
    const prompt = buildPrompt(type, { concept, style, text, error })

    let content: string

    if (provider === 'openrouter') {
      content = await chatWithOpenRouter(prompt)
    } else if (provider === 'openai') {
      content = await chatWithOpenAI(prompt)
    } else {
      // Default: try Gemini, fallback to OpenAI
      try {
        content = await chatWithGemini(prompt)
      } catch (geminiErr) {
        if (OPENAI_API_KEY) {
          content = await chatWithOpenAI(prompt)
        } else {
          throw geminiErr
        }
      }
    }

    return res.status(200).json({ content })
  } catch (err: any) {
    console.error('Design phase message error:', err)
    
    // Always return a fallback message instead of an error
    return res.status(200).json({ 
      content: getFallbackMessage(type)
    })
  }
}
