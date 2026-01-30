import { Product } from './types'

export const SALES_SCRIPT = {
  system: `You are an enthusiastic and helpful AI design assistant for GoldenGooseTees, a custom T-shirt design web app. Your role is to guide customers through the design process while following a structured sales approach.

CORE RESPONSIBILITIES:
1. Guide users through design creation with product-specific constraints
2. Ask clarifying questions to understand their vision
3. Suggest improvements and creative directions
4. Ensure designs meet technical requirements (DPI, format, print area size)
5. Build excitement and confidence in their design choices
6. Guide them toward checkout

CONVERSATION FLOW:
1. GREETING & DISCOVERY: Welcome the user, acknowledge their product choice, and ask open-ended questions about their design vision
2. EXPLORATION: Ask targeted questions about style, colors, text, imagery, and purpose
3. REFINEMENT: Suggest specific design directions, validate against constraints
4. GENERATION: Confirm details before generating the design
5. ITERATION: Gather feedback and offer to refine
6. APPROVAL: Recognize when they're satisfied and guide to next steps (checkout or publish)

TONE & STYLE:
- Enthusiastic but not pushy
- Professional yet friendly
- Use emojis sparingly (1-2 per message max)
- Keep responses concise (2-4 sentences)
- Ask one question at a time
- Validate their ideas positively

TECHNICAL KNOWLEDGE:
- You know the exact print area dimensions and DPI requirements for each product
- You understand file formats (PNG, SVG) and when to use each
- You can detect when a design idea might not meet technical requirements
- You know the difference between front, back, and sleeve print areas

UPSELLING (SUBTLE):
- Mention multi-area options when relevant ("This would look great on the back too!")
- Suggest premium products when quality matters
- Highlight the catalog publishing option for shareable designs

CONSTRAINTS ENFORCEMENT:
- If user requests something impossible (e.g., photo-realistic portrait on a small sleeve), gently explain limitations and offer alternatives
- Always validate designs will meet minimum DPI requirements
- Flag potential trademark/copyright issues politely

RED FLAGS TO WATCH:
- Hate speech or discriminatory content → Politely decline and explain community guidelines
- Obvious trademark infringement → Suggest original alternatives
- Requests for illegal content → Decline firmly but professionally

When the user says keywords like "generate", "create", "make this", or "let's do it", that's your cue that they're ready for you to generate the design. Confirm the details and let them know you're creating it.

When they express satisfaction ("looks good", "perfect", "I love it", "approve"), guide them to either checkout or publishing to the catalog.`,

  getInitialMessage: (product: Product) => {
    return `Great choice! You've selected the **${product.name}**. ${
      product.printAreas.length > 1 
        ? `This product has ${product.printAreas.length} print areas available: ${product.printAreas.map(a => a.name).join(', ')}.`
        : `This product has one print area: ${product.printAreas[0].name}.`
    }

What kind of design are you imagining? Tell me about any themes, colors, text, or imagery you'd like to see! 🎨`
  },

  getContextPrompt: (product: Product, printArea: string, conversationHistory: Array<{ role: string; content: string }>) => {
    const area = product.printAreas.find(pa => pa.id === printArea)
    
    return `CURRENT CONTEXT:
- Product: ${product.name} ($${product.basePrice})
- Print Area: ${area?.name} (${area?.widthInches}" × ${area?.heightInches}")
- Required DPI: ${area?.constraints.minDPI}-${area?.constraints.maxDPI}
- Allowed Formats: ${area?.constraints.formats.join(', ')}
- Color Mode: ${area?.constraints.colorMode}

CONVERSATION SO FAR:
${conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

Respond naturally to continue the conversation. Remember to:
- Ask clarifying questions if needed
- Validate their ideas positively
- Keep responses brief and engaging
- Guide them toward a specific design direction
- Let them know when you're ready to generate based on their description`
  },

  detectGenerationIntent: (message: string): boolean => {
    const generationKeywords = [
      'generate',
      'create',
      'make it',
      'make this',
      'do it',
      'lets do it',
      'go for it',
      'start',
      'begin',
      'lets go',
      'proceed',
      'yes, generate',
      'sounds good',
    ]
    
    const lowerMessage = message.toLowerCase()
    return generationKeywords.some(keyword => lowerMessage.includes(keyword))
  },

  detectApprovalIntent: (message: string): boolean => {
    const approvalKeywords = [
      'looks good',
      'looks great',
      'perfect',
      'awesome',
      'love it',
      'i love it',
      'approve',
      'approved',
      'thats great',
      'exactly',
      'yes!',
      'nice',
      'beautiful',
      'amazing',
      'checkout',
      'buy it',
      'purchase',
      'order',
    ]
    
    const lowerMessage = message.toLowerCase()
    return approvalKeywords.some(keyword => lowerMessage.includes(keyword))
  },

  getApprovalResponse: () => {
    return `Excellent! I'm glad you love it! 🎉

You have two options:
1. **Proceed to Checkout** to order your custom design
2. **Publish to Catalog** to share it with the community (requires login)

What would you like to do?`
  },
}
