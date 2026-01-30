import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAppConfig } from '../_lib/config'
import { notifyAdmin } from '../_lib/notify'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = 'https://api.openai.com/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

type Provider = 'gemini' | 'openai' | 'openrouter'

async function chatWithGemini(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured')
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  let systemInstruction = systemPrompt
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    const text = (msg.content || '').trim()
    if (!text && role === 'user' && systemInstruction) continue
    if (!text) continue
    contents.push({ role: role as 'user' | 'model', parts: [{ text }] })
  }
  if (contents.length === 0) throw new Error('No valid messages')
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }
  const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini: ${response.statusText}`)
  }
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (text == null) throw new Error('Empty Gemini response')
  return String(text)
}

async function chatWithOpenAI(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  model: string,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured')
  const apiMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages
  const body: Record<string, unknown> = {
    model: model || 'gpt-4o',
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI: ${response.statusText}`)
  }
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (content == null) throw new Error('Empty OpenAI response')
  return String(content)
}

async function chatWithOpenRouter(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  model: string,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured')
  const apiMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages
  const body: Record<string, unknown> = {
    model: model || 'openai/gpt-4o',
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VITE_APP_URL || 'https://goldengoosetees.com',
      'X-Title': 'Golden Goose Tees Kiosk',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenRouter: ${response.statusText}`)
  }
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (content == null) throw new Error('Empty OpenRouter response')
  return String(content)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    messages,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
    jsonMode = false,
    model: bodyModel,
  } = req.body || {}

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' })
  }

  const config = await getAppConfig()
  const provider = (config.conversational_provider as Provider) || 'gemini'
  const modelId = (config.conversational_model_id as string) || (bodyModel as string) || 'gemini-2.0-flash'

  try {
    if (provider === 'openrouter') {
      const content = await chatWithOpenRouter(
        messages,
        systemPrompt,
        modelId,
        temperature,
        maxTokens,
        jsonMode
      )
      return res.status(200).json({ content })
    }

    if (provider === 'openai') {
      const content = await chatWithOpenAI(
        messages,
        systemPrompt,
        modelId,
        temperature,
        maxTokens,
        jsonMode
      )
      return res.status(200).json({ content })
    }

    // gemini (default): try Gemini, fallback to OpenAI
    try {
      const content = await chatWithGemini(
        messages,
        systemPrompt,
        modelId,
        temperature,
        maxTokens
      )
      return res.status(200).json({ content })
    } catch (geminiErr) {
      if (OPENAI_API_KEY) {
        try {
          const content = await chatWithOpenAI(
            messages,
            systemPrompt,
            'gpt-4o',
            temperature,
            maxTokens,
            jsonMode
          )
          return res.status(200).json({ content })
        } catch (_) {
          // fall through to error response
        }
      }
      throw geminiErr
    }
  } catch (error: any) {
    console.error('Chat completion error:', error)
    await notifyAdmin({
      category: 'ai_failures',
      subject: 'Golden Goose Tees: Chat completion failed',
      shortMessage: error?.message || 'Chat API threw an exception.',
    }).catch(() => {})
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return res.status(500).json({ error: 'Network error. Please check connection and try again.' })
    }
    return res.status(500).json({
      error: error.message || 'Failed to complete chat request',
    })
  }
}
