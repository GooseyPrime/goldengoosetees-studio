import { ChatMessage, Product, User } from './types'

// Backend API endpoints (Vercel serverless functions)
const API_BASE = '/api/ai'

/** Single fallback when the conversational LLM is unavailable (no fake assistant replies). */
const FALLBACK_ASSISTANT_MESSAGE =
  "I'm having a bit of trouble connecting right now. Please try again in a moment — I'm here to help you create something awesome!"

// Client-side Gemini (edit/remove-background only; image generation is server-side)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

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
    systemPrompt?: string
  } = {}
): Promise<string> {
  const {
    model = 'openai/gpt-4o',
    temperature = 0.7,
    maxTokens = 1024,
    jsonMode = false,
    systemPrompt
  } = options

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      jsonMode,
      model
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Chat API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.content || ''
}

/** User-friendly error messages for design generation (from copy). */
function getDesignGenerationErrorMessage(status: number, serverMessage?: string): string {
  if (status === 503) {
    const lower = (serverMessage || '').toLowerCase()
    if (lower.includes('not configured') || lower.includes('api key')) {
      return "Image creation is temporarily unavailable. Please try again later."
    }
    return "We couldn't create an image right now. Please try again in a moment or try a different description."
  }
  return "We couldn't create an image right now. Please try again in a moment or try a different description."
}

/** Call backend generate-design (Gemini first, then DALL-E fallback). */
async function callGenerateDesignApi(
  prompt: string,
  options: {
    widthInches?: number
    heightInches?: number
    size?: '1024x1024' | '1792x1024' | '1024x1792'
    quality?: 'standard' | 'hd'
    style?: 'vivid' | 'natural'
  } = {}
): Promise<string> {
  const {
    widthInches,
    heightInches,
    size = '1024x1024',
    quality = 'hd',
    style = 'vivid'
  } = options

  const response = await fetch(`${API_BASE}/generate-design`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      widthInches,
      heightInches,
      size,
      quality,
      style
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const serverMessage = error?.error
    const friendly = getDesignGenerationErrorMessage(response.status, serverMessage)
    throw new Error(friendly)
  }

  const data = await response.json()
  if (data.revisedPrompt) {
    console.log('Revised prompt:', data.revisedPrompt)
  }
  return data.imageUrl
}

type GeminiImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'

function pickClosestGeminiAspectRatio(inputWidth?: number, inputHeight?: number): string | undefined {
  if (!inputWidth || !inputHeight || inputWidth <= 0 || inputHeight <= 0) return undefined
  const ratio = inputWidth / inputHeight
  const candidates: Array<{ ar: string; r: number }> = [
    { ar: '1:1', r: 1 },
    { ar: '2:3', r: 2 / 3 },
    { ar: '3:2', r: 3 / 2 },
    { ar: '3:4', r: 3 / 4 },
    { ar: '4:3', r: 4 / 3 },
    { ar: '4:5', r: 4 / 5 },
    { ar: '5:4', r: 5 / 4 },
    { ar: '9:16', r: 9 / 16 },
    { ar: '16:9', r: 16 / 9 },
    { ar: '21:9', r: 21 / 9 },
  ]
  let best = candidates[0]!
  let bestDiff = Infinity
  for (const c of candidates) {
    const diff = Math.abs(c.r - ratio)
    if (diff < bestDiff) {
      best = c
      bestDiff = diff
    }
  }
  return best.ar
}

function buildGeminiTeeGraphicPrompt(prompt: string, context?: { widthInches?: number; heightInches?: number }): string {
  const ar = pickClosestGeminiAspectRatio(context?.widthInches, context?.heightInches)
  return `Create a print-ready T-shirt graphic based on this concept:
"${prompt}"

This is NOT a photo of a shirt and NOT a mockup. Generate ONLY the standalone artwork for printing.

Build the scene step-by-step if the concept has multiple elements:
1) Establish the overall style and mood that fits a T-shirt graphic.
2) Place the primary subject(s) with clear silhouettes and strong contrast.
3) Add supporting details that reinforce the theme without clutter.
4) Finish with crisp edges and print-friendly color separation.

Visual requirements:
- Hyper-specific, vivid, and complete illustration (not just text)
- Professional, print-ready quality with clean shapes and sharp detail
- White or transparent background suitable for printing
- Positive phrasing (describe what should exist, not what shouldn't)
- If the concept includes words/slogans, render them legibly as part of the design composition

Composition:
- Centered, balanced layout suitable for a front/back print area
- High contrast and readability at a distance
${ar ? `- Keep the composition compatible with a ${ar} aspect ratio` : ''}`.trim()
}

async function generateImageWithGemini(
  model: GeminiImageModel,
  prompt: string,
  options?: {
    aspectRatio?: string
    imageSize?: '1K' | '2K' | '4K'
  }
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY.')
  }

  const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          ...(options?.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
          ...(options?.imageSize ? { imageSize: options.imageSize } : {}),
        },
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message = error?.error?.message || `Gemini API error: ${response.status} ${response.statusText}`
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Gemini API key or insufficient permissions. Please check your configuration.')
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit exceeded. Please wait a moment and try again.')
    }
    throw new Error(message)
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imagePart =
    parts.find((p: any) => p?.inlineData?.data) ||
    parts.find((p: any) => p?.inline_data?.data) ||
    parts.find((p: any) => p?.inlineData) ||
    parts.find((p: any) => p?.inline_data)

  const inline = imagePart?.inlineData || imagePart?.inline_data
  const base64 = inline?.data
  const mimeType = inline?.mimeType || inline?.mime_type || 'image/png'

  if (!base64) {
    throw new Error('No image was generated. Please try again with a different prompt.')
  }

  return `data:${mimeType};base64,${base64}`
}

// ============================================
// Content Moderation Result Types
// ============================================

export interface ContentModerationResult {
  approved: boolean
  isNSFW?: boolean
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
  // Note: These now check the backend API availability
  isConfigured(): boolean {
    // Always return true since we're using backend APIs
    // The backend will handle API key validation
    return true
  },

  hasOpenRouter(): boolean {
    // Always return true since we're using backend APIs
    return true
  },

  hasOpenAI(): boolean {
    // Always return true since we're using backend APIs
    return true
  },

  hasGemini(): boolean {
    return !!GEMINI_API_KEY
  },

  // ==========================================
  // Content Moderator (OpenRouter)
  // ==========================================
  contentModerator: {
    systemPrompt: `You are a content moderation AI for GoldenGooseTees, a custom T-shirt design web app. Your role is to review design prompts and ensure they comply with our policies.

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
        const response = await fetch(`${API_BASE}/moderate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt,
            userAgeVerified: user?.ageVerified,
            userRole: user?.role
          })
        })

        if (!response.ok) {
          throw new Error('Content moderation service error')
        }

        const result = await response.json()
        return result as ContentModerationResult
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
        const response = await fetch(`${API_BASE}/check-ip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt
          })
        })

        if (!response.ok) {
          throw new Error('IP check service error')
        }

        const result = await response.json()
        return result as IPCheckResult
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
    systemPrompt: `You are an ACTION-ORIENTED AI design assistant for GoldenGooseTees. Your PRIMARY goal is to CREATE designs quickly, not conduct endless interviews.

CRITICAL BEHAVIOR RULES:
1. BE DECISIVE - If user gives ANY design concept, you have enough to generate. Don't ask more questions.
2. GENERATE FIRST - When in doubt, generate a design. It's easier to refine than to keep asking questions.
3. ONE QUESTION MAX - Never ask more than one clarifying question before generating.
4. RECOGNIZE FRUSTRATION - If user uses caps, exclamation marks, profanity, or repeats themselves, IMMEDIATELY proceed to generation.
5. NO CONFIRMATION NEEDED - Don't ask "Should I generate?" or "Are you ready?" - just do it.

FAST-TRACK GENERATION:
When user provides a design concept (even vague), respond with:
"Great idea! I'm generating your [concept] design now. The system will create it in a few seconds - you'll see it appear in the preview. Once it's ready, let me know if you want any changes!"

MINIMAL QUESTIONS - Only ask if ABSOLUTELY necessary:
- NEVER ask about specific colors if they haven't mentioned any (just pick good ones)
- NEVER ask about font style unless it's a text-heavy design
- NEVER ask about background - assume transparent/white for printing
- NEVER ask for confirmation to proceed - just do it

WHEN TO GENERATE IMMEDIATELY:
- User describes ANY visual concept
- User mentions a theme, style, or subject
- User provides text they want on the shirt
- User says words like: make, create, generate, design, draw, want, give me, do
- User responds with "yes", "ok", "sure", "yeah", "go", or similar affirmations
- User shows ANY sign of impatience

EXAMPLE GOOD RESPONSES:
User: "a cowboy on a pink pickle"
You: "Love that quirky Western theme! I'm generating a cowboy riding a wild pink pickle now - perfect for a fun rodeo-style design. Watch the preview for your creation!"

User: "something with skulls"
You: "Skulls it is! I'm creating a bold skull design for you. It'll appear in the preview shortly. Let me know if you want it more detailed or with any specific style!"

User: "YES JUST MAKE IT"
You: "On it! Generating your design right now. It'll be in the preview in just a moment!"

WHAT NOT TO DO:
- Don't ask "What colors would you like?"
- Don't ask "Should the text be bold or script?"
- Don't say "Before we generate, can you tell me..."
- Don't ask "Would you like me to proceed?"
- Don't ask multiple questions in one message
- Don't repeat back all the details asking for confirmation

TECHNICAL AWARENESS (use silently, don't lecture):
- Print area: 12" × 16" front/back, 3" × 4" sleeves
- DPI: 150-300 (handled automatically)
- Formats: PNG/SVG (handled automatically)

IN-APP ONLY RULES:
- Never recommend external tools or websites for resizing or editing.
- If a user wants a size change or can't see the design, direct them to the in-app Edit button and the Transform > Scale controls.
- Offer the built-in upload option if they want to place their own artwork.

RED FLAGS (only mention if truly problematic):
- Trademark issues: Gently suggest alternatives
- Inappropriate content: Redirect to safer options

TONE:
- Excited and confident
- One emoji max per message
- 1-2 sentences is ideal
- Action-oriented language

Remember: Your job is to CREATE, not to interview. Users came here to make a shirt, not to answer questions!`,

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

      const contextMessage = {
        role: 'system',
        content: `CURRENT CONTEXT:
- Product: ${product.name} ($${product.basePrice})
- Print Area: ${area?.name} (${area?.widthInches}" × ${area?.heightInches}")
- Required DPI: ${area?.constraints.minDPI}-${area?.constraints.maxDPI}
- Formats: ${area?.constraints.formats.join(', ')}
- Color Mode: ${area?.constraints.colorMode}
- User Age Verified: ${user?.ageVerified ? 'Yes (18+)' : 'No (treat as under 18)'}`
      }

      try {
        const response = await callOpenRouter(
          [contextMessage, ...conversationHistory],
          { 
            temperature: 0.8, 
            maxTokens: 512,
            systemPrompt: this.systemPrompt
          }
        )

        return response
      } catch (error) {
        console.error('Design assistant chat failed:', error)
        return FALLBACK_ASSISTANT_MESSAGE
      }
    },

    detectGenerationIntent(message: string): boolean {
      const lower = message.toLowerCase().trim()
      const cleanLower = lower.replace(/[!.,?']/g, '')

      // AGGRESSIVE DETECTION - err on the side of generating

      // 1. Direct generation commands (highest priority)
      const directCommands = [
        'generate', 'create', 'make', 'draw', 'design', 'build', 'produce',
        'do it', 'go for it', 'go ahead', 'lets go', 'let\'s go', 'lets do it',
        'make it', 'make the', 'make my', 'make this', 'make that',
        'create it', 'create the', 'create my', 'just do it', 'just make',
        'generate it', 'generate the', 'generate my', 'give me', 'show me',
        'i want', 'i need', 'i\'d like', 'can you make', 'can you create',
        'please make', 'please create', 'please generate'
      ]
      if (directCommands.some(cmd => lower.includes(cmd))) {
        return true
      }

      // 2. Frustration indicators - ALWAYS generate immediately
      const frustrationSigns = [
        '!!!', 'just', 'already', 'fucking', 'ffs', 'come on', 'cmon',
        'seriously', 'please just', 'stop asking', 'enough', 'finally'
      ]
      if (frustrationSigns.some(sign => lower.includes(sign))) {
        return true
      }

      // 3. All caps detection (user is emphatic)
      if (message.length > 3 && message === message.toUpperCase() && /[A-Z]/.test(message)) {
        return true
      }

      // 4. Short affirmative responses (user is confirming)
      const affirmatives = [
        'yes', 'yep', 'yeah', 'yea', 'ya', 'y', 'ok', 'okay', 'k', 'kk',
        'sure', 'alright', 'aight', 'fine', 'good', 'great', 'perfect',
        'absolutely', 'definitely', 'totally', 'ready', 'go', 'proceed',
        'sounds good', 'sounds great', 'sounds perfect', 'that works',
        'love it', 'like it', 'want it', 'do that', 'thats it', 'that\'s it'
      ]
      if (affirmatives.includes(cleanLower) || affirmatives.some(a => cleanLower === a)) {
        return true
      }

      // 5. If message ends with ! and contains action words
      if (message.endsWith('!') && ['now', 'it', 'go', 'ready', 'please'].some(w => lower.includes(w))) {
        return true
      }

      // 6. Design concept detection - if user describes something visual, they want it made
      const visualConcepts = [
        'with a', 'featuring', 'showing', 'picture of', 'image of',
        'that says', 'text saying', 'words', 'logo', 'graphic',
        'cowboy', 'skull', 'flower', 'animal', 'sunset', 'mountain',
        'retro', 'vintage', 'modern', 'minimalist', 'abstract'
      ]
      if (visualConcepts.some(concept => lower.includes(concept))) {
        return true
      }

      // 7. After any conversation (more than 2 exchanges), assume user wants to generate
      // This is handled in the chat flow, not here

      return false
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
        const userMessage = {
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

        const response = await callOpenRouter(
          [userMessage],
          { 
            temperature: 0.9, 
            maxTokens: 256,
            systemPrompt: this.systemPrompt
          }
        )

        return response
      } catch (error) {
        console.error('Initial message generation failed:', error)
        return FALLBACK_ASSISTANT_MESSAGE
      }
    },

    async getApprovalMessage(): Promise<string> {
      try {
        const userMessage = {
          role: 'user',
          content: `The user has approved their design! Generate an enthusiastic response that:
1. Celebrates their approval
2. Explains they can either checkout to order OR publish to catalog
3. Asks what they'd like to do next
4. Keep it to 2-3 sentences

Be excited and clear about next steps.`
        }

        const response = await callOpenRouter(
          [userMessage],
          { 
            temperature: 0.9, 
            maxTokens: 256,
            systemPrompt: this.systemPrompt
          }
        )

        return response
      } catch (error) {
        console.error('Approval message generation failed:', error)
        return FALLBACK_ASSISTANT_MESSAGE
      }
    },
  },

  // ==========================================
  // Design Generator (backend: Gemini first, DALL-E fallback)
  // ==========================================
  designGenerator: {
    async generate(prompt: string, constraints: any): Promise<string> {
      return callGenerateDesignApi(prompt, {
        widthInches: constraints?.widthInches,
        heightInches: constraints?.heightInches,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      })
    },

    async edit(currentImageUrl: string, editPrompt: string): Promise<string> {
      const response = await fetch(`${API_BASE}/edit-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentImageUrl, editPrompt }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Edit failed: ${response.statusText}`)
      }
      const data = await response.json()
      return data.imageUrl
    },

    async removeBackground(imageDataUrl: string): Promise<string> {
      const response = await fetch(`${API_BASE}/remove-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageDataUrl }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Background removal failed: ${response.statusText}`)
      }
      const data = await response.json()
      return data.imageUrl
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
        const userMessage = {
          role: 'user',
          content: `DATA CONTEXT:
${JSON.stringify(context, null, 2)}

ADMIN QUESTION:
"${question}"

Provide a helpful, data-driven answer to this question.`
        }

        const response = await callOpenRouter(
          [userMessage],
          { 
            temperature: 0.5, 
            maxTokens: 1024,
            systemPrompt: this.systemPrompt
          }
        )

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
        const userMessage = {
          role: 'user',
          content: `Generate 3-4 key business insights based on this data:

Total Orders: ${data.totalOrders}
Pending Orders: ${data.pendingOrders}
Completed Orders: ${data.completedOrders}
Total Revenue: $${data.totalRevenue.toFixed(2)}
Top Products: ${data.topProducts.join(', ')}

Keep insights actionable and concise.`
        }

        const response = await callOpenRouter(
          [userMessage],
          { 
            temperature: 0.7, 
            maxTokens: 512,
            systemPrompt: this.systemPrompt
          }
        )

        return response
      } catch (error) {
        console.error('Insights generation failed:', error)
        return 'Unable to generate insights at this time.'
      }
    }
  }
}
