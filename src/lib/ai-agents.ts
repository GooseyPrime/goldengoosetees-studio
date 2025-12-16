import { ChatMessage, Product, User } from './types'

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

export const aiAgents = {
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

EXAMPLES:

Input: "Create a skull with roses" (User: 25 years old)
Output: {"approved": true, "violations": [], "severity": "none"}

Input: "Make a design with the Nike swoosh" (User: 25 years old)
Output: {"approved": false, "violations": ["trademark infringement - Nike"], "severity": "high", "suggestions": ["Create your own swoosh-inspired design", "Design your own athletic symbol"]}

Input: "Sexy girl in bikini" (User: 16 years old)
Output: {"approved": false, "violations": ["sexually suggestive content for minor"], "severity": "critical", "suggestions": ["Try a design with abstract art", "Create a nature-themed design"]}

Input: "Death to all [group]" (User: 25 years old)
Output: {"approved": false, "violations": ["hate speech", "incitement to violence"], "severity": "critical", "suggestions": []}

You must respond ONLY with valid JSON, no additional text.`,

    async moderate(prompt: string, user: User | null): Promise<ContentModerationResult> {
      const fullPrompt = `${this.systemPrompt}

USER AGE: ${user?.ageVerified ? '18+' : 'Unknown (treat as under 18)'}
USER ROLE: ${user?.role || 'guest'}

DESIGN PROMPT TO REVIEW:
"${prompt}"

Analyze this prompt and respond with JSON only.`

      try {
        const response = await window.spark.llm(fullPrompt, 'gpt-4o', true)
        const result = JSON.parse(response) as ContentModerationResult
        return result
      } catch (error) {
        console.error('Content moderation failed:', error)
        return {
          approved: true,
          violations: [],
          severity: 'none',
        }
      }
    },
  },

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

CONTEXT:
- This is for PERSONAL USE only, not commercial resale
- Some IP use may fall under fair use for personal items
- We err on the side of caution but don't over-flag

RESPONSE FORMAT (JSON):
{
  "hasViolation": boolean,
  "detectedItems": ["specific brands/characters/etc"],
  "riskLevel": "none" | "low" | "medium" | "high",
  "recommendations": ["suggestions for modifications"]
}

EXAMPLES:

Input: "A sword fighting a dragon"
Output: {"hasViolation": false, "detectedItems": [], "riskLevel": "none", "recommendations": []}

Input: "Darth Vader with a lightsaber"
Output: {"hasViolation": true, "detectedItems": ["Star Wars character - Darth Vader", "Star Wars IP - lightsaber"], "riskLevel": "high", "recommendations": ["Create your own space warrior character", "Design a futuristic helmet with your own style"]}

Input: "Just Do It slogan"
Output: {"hasViolation": true, "detectedItems": ["Nike trademarked slogan"], "riskLevel": "high", "recommendations": ["Create your own motivational phrase", "Try 'Just Get It Done' or another variation"]}

Input: "A superhero with a cape"
Output: {"hasViolation": false, "detectedItems": [], "riskLevel": "none", "recommendations": []}

You must respond ONLY with valid JSON, no additional text.`,

    async check(prompt: string): Promise<IPCheckResult> {
      const fullPrompt = `${this.systemPrompt}

DESIGN PROMPT TO ANALYZE:
"${prompt}"

Check for potential IP violations and respond with JSON only.`

      try {
        const response = await window.spark.llm(fullPrompt, 'gpt-4o', true)
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

      const conversationHistory = messages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n')

      const fullPrompt = `${this.systemPrompt}

CURRENT CONTEXT:
- Product: ${product.name} ($${product.basePrice})
- Print Area: ${area?.name} (${area?.widthInches}" × ${area?.heightInches}")
- Required DPI: ${area?.constraints.minDPI}-${area?.constraints.maxDPI}
- Formats: ${area?.constraints.formats.join(', ')}
- Color Mode: ${area?.constraints.colorMode}
- User Age Verified: ${user?.ageVerified ? 'Yes (18+)' : 'No (treat as under 18)'}

CONVERSATION SO FAR:
${conversationHistory}

USER'S LATEST MESSAGE: ${messages[messages.length - 1]?.content || ''}

Respond as the AI design assistant. Be natural, helpful, and guide them toward a great design.`

      try {
        const response = await window.spark.llm(fullPrompt, 'gpt-4o')
        return response
      } catch (error) {
        console.error('Design assistant chat failed:', error)
        return "I'm having a bit of trouble connecting right now. Could you try again? I'm excited to help you create something awesome! 🎨"
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
      const fullPrompt = `${this.systemPrompt}

The user just selected: ${product.name} ($${product.basePrice})

Available print areas: ${product.printAreas.map((pa) => `${pa.name} (${pa.widthInches}" × ${pa.heightInches}")`).join(', ')}

Generate a warm, enthusiastic greeting that:
1. Acknowledges their product choice
2. Briefly mentions the print areas available
3. Asks them to describe their design vision
4. Keeps it to 2-3 sentences

Be excited but professional. Use one emoji if natural.`

      try {
        const response = await window.spark.llm(fullPrompt, 'gpt-4o')
        return response
      } catch (error) {
        console.error('Initial message generation failed:', error)
        return `Great choice! You've selected the **${product.name}**. ${
          product.printAreas.length > 1
            ? `This has ${product.printAreas.length} print areas: ${product.printAreas.map((a) => a.name).join(', ')}.`
            : `You can design the ${product.printAreas[0]?.name}.`
        } What kind of design are you imagining? 🎨`
      }
    },

    async getApprovalMessage(): Promise<string> {
      const fullPrompt = `${this.systemPrompt}

The user has approved their design! Generate an enthusiastic response that:
1. Celebrates their approval
2. Explains they can either checkout to order OR publish to catalog
3. Asks what they'd like to do next
4. Keep it to 2-3 sentences

Be excited and clear about next steps.`

      try {
        const response = await window.spark.llm(fullPrompt, 'gpt-4o')
        return response
      } catch (error) {
        console.error('Approval message generation failed:', error)
        return `Excellent! Your design looks amazing! 🎉 You can either proceed to checkout to order your custom tee, or publish it to our catalog to share with the community. What would you like to do?`
      }
    },
  },
}
