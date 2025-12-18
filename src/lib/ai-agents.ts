import { ChatMessage, Product, User } from './types'

// Environment variables (Vite)
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// API endpoints
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'
const OPENAI_API_BASE = 'https://api.openai.com/v1'

// ============================================
// API Helper Functions
// ============================================

async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
  } = {}
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY.')
  }

  const {
    model = 'openai/gpt-4o',
    temperature = 0.7,
    maxTokens = 1024,
    jsonMode = false
  } = options

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Golden Goose Tees Kiosk'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } })
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenRouter API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function generateImageWithDALLE3(
  prompt: string,
  options: {
    size?: '1024x1024' | '1792x1024' | '1024x1792'
    quality?: 'standard' | 'hd'
    style?: 'vivid' | 'natural'
  } = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY.')
  }

  const {
    size = '1024x1024',
    quality = 'hd',
    style = 'vivid'
  } = options

  // Enhance prompt for t-shirt design
  const enhancedPrompt = `Create a high-quality t-shirt design: ${prompt}.
    The design should be on a transparent or white background, suitable for printing on fabric.
    Style: Clean, professional, print-ready artwork with bold colors and clear details.
    Do NOT include any mockups of t-shirts - just the design artwork itself.`

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
    throw new Error(error.error?.message || `DALL-E API error: ${response.statusText}`)
  }

  const data = await response.json()
  const base64Image = data.data[0]?.b64_json

  if (!base64Image) {
    throw new Error('No image generated')
  }

  // Return as data URL (PNG)
  return `data:image/png;base64,${base64Image}`
}

async function editImageWithDALLE(
  imageDataUrl: string,
  prompt: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY.')
  }

  // For editing, we'll use DALL-E 3 with a modified prompt
  // Note: DALL-E 3 doesn't support direct image editing, so we generate a new image
  // based on the description. For true editing, you'd need DALL-E 2 edit endpoint.
  const enhancedPrompt = `Create a t-shirt design based on this edit request: ${prompt}.
    The design should be on a transparent or white background, suitable for printing.
    Make it bold, colorful, and print-ready.`

  return generateImageWithDALLE3(enhancedPrompt)
}

// ============================================
// Content Moderation Result Types
// ============================================

export interface ContentModerationResult {
  approved: boolean
  violations: string[]
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  suggestions?: string[]
}

export interface IPCheckResult {
  hasViolation: boolean
  detectedItems: string[]
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface AdminQueryResult {
  answer: string
  data?: any
  sqlQuery?: string
}

// ============================================
// AI Agents
// ============================================

export const aiAgents = {
  // Check if AI services are configured
  isConfigured(): boolean {
    return !!(OPENROUTER_API_KEY && OPENAI_API_KEY)
  },

  hasOpenRouter(): boolean {
    return !!OPENROUTER_API_KEY
  },

  hasOpenAI(): boolean {
    return !!OPENAI_API_KEY
  },

  // ==========================================
  // Content Moderator (OpenRouter)
  // ==========================================
  contentModerator: {
    systemPrompt: `You are a content moderation AI for GoldenGooseTees, a custom T-shirt design kiosk. Your role is to review design prompts and ensure they comply with our policies.

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

RESPONSE FORMAT (JSON):
{
  "approved": boolean,
  "violations": ["list of specific violations"],
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "suggestions": ["alternative ideas if rejected"]
}

You must respond ONLY with valid JSON, no additional text.`,

    async moderate(prompt: string, user: User | null): Promise<ContentModerationResult> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `USER AGE: ${user?.ageVerified ? '18+' : 'Unknown (treat as under 18)'}
USER ROLE: ${user?.role || 'guest'}

DESIGN PROMPT TO REVIEW:
"${prompt}"

Analyze this prompt and respond with JSON only.`
          }
        ], { jsonMode: true, temperature: 0.3 })

        const result = JSON.parse(response) as ContentModerationResult
        return result
      } catch (error) {
        console.error('Content moderation failed:', error)
        // Fail open with warning for API errors
        return {
          approved: true,
          violations: [],
          severity: 'none',
        }
      }
    },
  },

  // ==========================================
  // IP Checker (OpenRouter)
  // ==========================================
  ipChecker: {
    systemPrompt: `You are an intellectual property (IP) detection AI for a custom T-shirt printing service. Your role is to identify potential copyright and trademark violations in design requests.

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

You must respond ONLY with valid JSON, no additional text.`,

    async check(prompt: string): Promise<IPCheckResult> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `DESIGN PROMPT TO ANALYZE:
"${prompt}"

Check for potential IP violations and respond with JSON only.`
          }
        ], { jsonMode: true, temperature: 0.3 })

        const result = JSON.parse(response) as IPCheckResult
        return result
      } catch (error) {
        console.error('IP check failed:', error)
        return {
          hasViolation: false,
          detectedItems: [],
          riskLevel: 'none',
          recommendations: [],
        }
      }
    },
  },

  // ==========================================
  // Design Assistant (OpenRouter)
  // ==========================================
  designAssistant: {
    systemPrompt: `You are an expert AI design assistant for GoldenGooseTees, a custom T-shirt design kiosk. You guide customers through the design process with enthusiasm and expertise.

YOUR ROLE:
1. Welcome users and understand their vision
2. Ask clarifying questions about style, colors, text, and imagery
3. Provide creative suggestions that fit their needs
4. Ensure designs meet technical requirements (DPI, format, dimensions)
5. Build excitement and confidence
6. Guide them smoothly to checkout

CONVERSATION STAGES:
1. GREETING: Welcome them warmly, acknowledge their product choice
2. DISCOVERY: Ask open-ended questions about their design vision
3. EXPLORATION: Dive into specifics (colors, style, text vs graphics, purpose)
4. REFINEMENT: Suggest concrete design directions, validate feasibility
5. GENERATION: Confirm all details before generating
6. REVIEW: Present the design, gather feedback
7. ITERATION: Make refinements based on feedback
8. APPROVAL: Recognize satisfaction and guide to checkout

TECHNICAL CONSTRAINTS:
- You know exact print area dimensions for each product
- You understand DPI requirements (typically 150-300 DPI)
- You know file format requirements (PNG for photos, SVG for graphics)
- You can calculate if an idea fits the print area dimensions
- You warn about designs that won't print well (too small text, too much detail, etc.)

SELLING POINTS (SUBTLE):
- Mention multiple print areas when relevant ("This would pop on the back too!")
- Suggest catalog publishing for designs they're proud of
- Create urgency without being pushy ("Let's bring this vision to life!")

RED FLAGS:
- If you detect potential trademark/copyright issues, gently suggest alternatives
- If content seems inappropriate for their age, redirect to safer options
- If technically impossible (ultra-high detail on small area), explain limitations

TONE:
- Enthusiastic but professional
- Use emojis sparingly (1 per message max, only when natural)
- Keep responses concise (2-4 sentences typically)
- Ask ONE question at a time
- Validate their ideas positively before suggesting changes

GENERATION CUES:
When user says "generate", "create", "make it", "let's do it", "go ahead", etc., that's your cue to confirm details and initiate generation.

APPROVAL CUES:
When user says "looks good", "perfect", "I love it", "approve it", etc., guide them to checkout or catalog publishing.

Remember: You're a design partner, not just an order taker. Help them create something they'll love!`,

    async chat(
      messages: ChatMessage[],
      product: Product,
      currentPrintArea: string,
      user: User | null
    ): Promise<string> {
      const area = product.printAreas.find((pa) => pa.id === currentPrintArea)

      const conversationHistory = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))

      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'system',
            content: `CURRENT CONTEXT:
- Product: ${product.name} ($${product.basePrice})
- Print Area: ${area?.name} (${area?.widthInches}" × ${area?.heightInches}")
- Required DPI: ${area?.constraints.minDPI}-${area?.constraints.maxDPI}
- Formats: ${area?.constraints.formats.join(', ')}
- Color Mode: ${area?.constraints.colorMode}
- User Age Verified: ${user?.ageVerified ? 'Yes (18+)' : 'No (treat as under 18)'}`
          },
          ...conversationHistory
        ], { temperature: 0.8, maxTokens: 512 })

        return response
      } catch (error) {
        console.error('Design assistant chat failed:', error)
        return "I'm having a bit of trouble connecting right now. Could you try again? I'm excited to help you create something awesome!"
      }
    },

    detectGenerationIntent(message: string): boolean {
      const keywords = [
        'generate',
        'create',
        'make it',
        'make this',
        'do it',
        "let's do it",
        'go for it',
        'go ahead',
        'start',
        'proceed',
        'yes, generate',
        'sounds good',
        'perfect, generate',
      ]
      const lower = message.toLowerCase()
      return keywords.some((k) => lower.includes(k))
    },

    detectApprovalIntent(message: string): boolean {
      const keywords = [
        'looks good',
        'looks great',
        'perfect',
        'awesome',
        'love it',
        'i love it',
        'approve',
        'approved',
        "that's great",
        'exactly',
        'nice',
        'beautiful',
        'amazing',
        'buy it',
      ]
      const lower = message.toLowerCase()
      return keywords.some((k) => lower.includes(k))
    },

    async getInitialMessage(product: Product): Promise<string> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `The user just selected: ${product.name} ($${product.basePrice})

Available print areas: ${product.printAreas.map((pa) => `${pa.name} (${pa.widthInches}" × ${pa.heightInches}")`).join(', ')}

Generate a warm, enthusiastic greeting that:
1. Acknowledges their product choice
2. Briefly mentions the print areas available
3. Asks them to describe their design vision
4. Keeps it to 2-3 sentences

Be excited but professional. Use one emoji if natural.`
          }
        ], { temperature: 0.9, maxTokens: 256 })

        return response
      } catch (error) {
        console.error('Initial message generation failed:', error)
        return `Great choice! You've selected the **${product.name}**. ${
          product.printAreas.length > 1
            ? `This has ${product.printAreas.length} print areas: ${product.printAreas.map((a) => a.name).join(', ')}.`
            : `You can design the ${product.printAreas[0]?.name}.`
        } What kind of design are you imagining?`
      }
    },

    async getApprovalMessage(): Promise<string> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `The user has approved their design! Generate an enthusiastic response that:
1. Celebrates their approval
2. Explains they can either checkout to order OR publish to catalog
3. Asks what they'd like to do next
4. Keep it to 2-3 sentences

Be excited and clear about next steps.`
          }
        ], { temperature: 0.9, maxTokens: 256 })

        return response
      } catch (error) {
        console.error('Approval message generation failed:', error)
        return `Excellent! Your design looks amazing! You can either proceed to checkout to order your custom tee, or publish it to our catalog to share with the community. What would you like to do?`
      }
    },
  },

  // ==========================================
  // Design Generator (DALL-E 3)
  // ==========================================
  designGenerator: {
    async generate(prompt: string, constraints: any): Promise<string> {
      return generateImageWithDALLE3(prompt, {
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      })
    },

    async edit(currentImageUrl: string, editPrompt: string): Promise<string> {
      return editImageWithDALLE(currentImageUrl, editPrompt)
    },

    async removeBackground(imageDataUrl: string): Promise<string> {
      // For background removal, we'll use a generation-based approach
      // A proper solution would use a dedicated API like remove.bg or Clipdrop
      const prompt = 'A clean, isolated design element on a pure transparent background, suitable for t-shirt printing'
      return generateImageWithDALLE3(prompt, {
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      })
    }
  },

  // ==========================================
  // Admin Agent (OpenRouter + Supabase)
  // ==========================================
  adminAgent: {
    systemPrompt: `You are an AI assistant for the admin dashboard of GoldenGooseTees. You help administrators understand their business data through natural language queries.

You have access to the following database tables:
- orders: id, user_id, design_id, product_id, size, color, status, total_amount, shipping_address, stripe_payment_id, printful_order_id, tracking_number, estimated_delivery, created_at, updated_at
- designs: id, user_id, product_id, files, is_public, is_nsfw, title, description, catalog_section, created_at, updated_at
- users: id, email, name, avatar, age_verified, role, created_at

Order statuses: pending, processing, fulfilled, shipped, delivered, failed

When answering questions:
1. Identify what data is needed to answer the question
2. Formulate your response in a clear, helpful manner
3. Include specific numbers when available
4. Suggest actionable insights when appropriate

You should respond with helpful insights based on the data context provided.`,

    async query(
      question: string,
      context: {
        ordersCount?: number
        designsCount?: number
        recentOrders?: any[]
        topProducts?: any[]
        revenue?: number
      }
    ): Promise<AdminQueryResult> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `DATA CONTEXT:
${JSON.stringify(context, null, 2)}

ADMIN QUESTION:
"${question}"

Provide a helpful, data-driven answer to this question.`
          }
        ], { temperature: 0.5, maxTokens: 1024 })

        return {
          answer: response,
          data: context
        }
      } catch (error) {
        console.error('Admin query failed:', error)
        return {
          answer: 'I apologize, but I encountered an error processing your query. Please try again or check your API configuration.',
        }
      }
    },

    async generateInsights(data: {
      totalOrders: number
      pendingOrders: number
      completedOrders: number
      totalRevenue: number
      topProducts: string[]
    }): Promise<string> {
      try {
        const response = await callOpenRouter([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `Generate 3-4 key business insights based on this data:

Total Orders: ${data.totalOrders}
Pending Orders: ${data.pendingOrders}
Completed Orders: ${data.completedOrders}
Total Revenue: $${data.totalRevenue.toFixed(2)}
Top Products: ${data.topProducts.join(', ')}

Keep insights actionable and concise.`
          }
        ], { temperature: 0.7, maxTokens: 512 })

        return response
      } catch (error) {
        console.error('Insights generation failed:', error)
        return 'Unable to generate insights at this time.'
      }
    }
  }
}
