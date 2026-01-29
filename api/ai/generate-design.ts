import type { VercelRequest, VercelResponse } from '@vercel/node'

// Environment variables - server-side only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = 'https://api.openai.com/v1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if OpenAI is configured
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API key not configured on server' 
    })
  }

  const { prompt, size = '1024x1024', quality = 'hd', style = 'vivid' } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  // Enhance prompt for t-shirt design
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

  try {
    const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality,
        style,
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errorMessage = error.error?.message || `DALL-E API error: ${response.statusText}`

      // Provide user-friendly error messages
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid OpenAI API key. Please check configuration.' })
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' })
      }
      if (response.status === 400 && errorMessage.includes('safety')) {
        return res.status(400).json({ error: 'Content policy violation. Please try a different design concept.' })
      }
      
      return res.status(response.status).json({ error: errorMessage })
    }

    const data = await response.json()
    const base64Image = data.data[0]?.b64_json
    const revisedPrompt = data.data[0]?.revised_prompt

    if (!base64Image) {
      return res.status(500).json({ error: 'No image was generated. Please try again.' })
    }

    // Return image as data URL
    return res.status(200).json({
      imageUrl: `data:image/png;base64,${base64Image}`,
      revisedPrompt
    })
  } catch (error: any) {
    console.error('Design generation error:', error)
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(500).json({ error: 'Network error. Please check connection and try again.' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Failed to generate design' 
    })
  }
}
