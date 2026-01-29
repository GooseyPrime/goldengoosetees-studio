import type { VercelRequest, VercelResponse } from '@vercel/node'

// Environment variables - server-side only
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if OpenRouter is configured
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenRouter API key not configured on server' 
    })
  }

  const { 
    messages, 
    systemPrompt,
    temperature = 0.7, 
    maxTokens = 1024,
    jsonMode = false,
    model = 'openai/gpt-4o'
  } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' })
  }

  try {
    const apiMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages

    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VITE_APP_URL || 'https://goldengoosetees.com',
        'X-Title': 'Golden Goose Tees Kiosk'
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: 'json_object' } })
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errorMessage = error.error?.message || `OpenRouter API error: ${response.statusText}`
      
      console.error('OpenRouter chat error:', error)
      return res.status(response.status).json({ error: errorMessage })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    return res.status(200).json({ content })
  } catch (error: any) {
    console.error('Chat completion error:', error)
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(500).json({ error: 'Network error. Please check connection and try again.' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Failed to complete chat request' 
    })
  }
}
