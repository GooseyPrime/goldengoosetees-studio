# AI System Guide - GoldenGooseTees Kiosk

## Overview

The GoldenGooseTees kiosk uses a multi-agent AI system to provide safe, helpful, and legally compliant design assistance. All agents use GPT-4 for dynamic, context-aware responses.

## Agent Architecture

### 1. Content Moderator Agent

**Location**: `src/lib/ai-agents.ts` → `aiAgents.contentModerator`

**Responsibility**: Ensures all design requests comply with community guidelines and legal requirements.

#### Rules Enforced

**Age-Based Restrictions (Under 18)**:
- Sexually suggestive content ❌
- Explicit language or profanity ❌
- Violence or gore ❌
- Drug or alcohol references ❌
- Any NSFW content ❌

**Universal Restrictions (All Ages)**:
- Hate speech or discriminatory content ❌
- Explicit sexual content or nudity ❌
- Graphic violence or gore ❌
- Illegal activities or substances ❌
- Harassment or bullying ❌
- Child exploitation ❌

#### Response Format

```json
{
  "approved": boolean,
  "violations": ["specific violation 1", "specific violation 2"],
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "suggestions": ["alternative idea 1", "alternative idea 2"]
}
```

#### Usage Example

```typescript
import { aiAgents } from '@/lib/ai-agents'

const result = await aiAgents.contentModerator.moderate(
  "Design prompt here",
  currentUser // includes ageVerified field
)

if (!result.approved) {
  console.error('Violations:', result.violations)
  console.log('Try instead:', result.suggestions)
}
```

### 2. IP Checker Agent

**Location**: `src/lib/ai-agents.ts` → `aiAgents.ipChecker`

**Responsibility**: Detects potential copyright and trademark violations.

#### What Gets Flagged

**Brand Names & Logos**:
- Corporate brands (Nike, Apple, Coca-Cola, etc.)
- Sports teams and leagues (NFL, NBA, etc.)
- Entertainment brands (Disney, Marvel, DC, etc.)

**Characters & Media**:
- Movie, TV, video game characters
- Cartoon/anime characters
- Book characters

**Celebrity Likenesses**:
- Actors, musicians, athletes
- Politicians and public figures

**Copyrighted Artwork**:
- Famous paintings or illustrations
- Comic book art
- Album covers

#### What's Generally OK

- Generic concepts (skulls, flowers, patterns) ✅
- Common phrases (unless trademarked) ✅
- Original artwork inspired by styles ✅
- Parody (with caution) ✅
- Personal use fan art (low risk) ✅

#### Response Format

```json
{
  "hasViolation": boolean,
  "detectedItems": ["Nike swoosh", "Darth Vader"],
  "riskLevel": "none" | "low" | "medium" | "high",
  "recommendations": ["Create your own swoosh-inspired design"]
}
```

#### Usage Example

```typescript
const result = await aiAgents.ipChecker.check("Design prompt here")

if (result.hasViolation && result.riskLevel === 'high') {
  console.warn('Detected:', result.detectedItems)
  console.log('Try instead:', result.recommendations)
}
```

### 3. Design Assistant Agent

**Location**: `src/lib/ai-agents.ts` → `aiAgents.designAssistant`

**Responsibility**: Guides users through the design process with conversational AI.

#### Conversation Stages

1. **GREETING**: Welcome user, acknowledge product choice
2. **DISCOVERY**: Ask about their design vision
3. **EXPLORATION**: Dive into specifics (colors, style, text)
4. **REFINEMENT**: Suggest concrete design directions
5. **GENERATION**: Confirm details before generating
6. **REVIEW**: Present design, gather feedback
7. **ITERATION**: Make refinements based on feedback
8. **APPROVAL**: Guide to checkout when satisfied

#### Technical Knowledge

The agent knows:
- Exact print area dimensions for each product
- DPI requirements (150-300 DPI typically)
- File formats (PNG for photos, SVG for graphics)
- When designs won't print well (too small text, etc.)

#### Intent Detection

**Generation Keywords**:
- "generate", "create", "make it", "do it"
- "let's do it", "go for it", "proceed"

**Approval Keywords**:
- "looks good", "perfect", "love it"
- "approve", "awesome", "beautiful"

#### Usage Example

```typescript
// Get initial greeting
const greeting = await aiAgents.designAssistant.getInitialMessage(product)

// Chat with user
const response = await aiAgents.designAssistant.chat(
  messages,          // ChatMessage[]
  product,           // Product
  currentPrintArea,  // string (area ID)
  user              // User | null (for age awareness)
)

// Detect intents
if (aiAgents.designAssistant.detectGenerationIntent(userMessage)) {
  // Trigger design generation
}

if (aiAgents.designAssistant.detectApprovalIntent(userMessage)) {
  // Show approval message and checkout options
}
```

## Integration in API

**Location**: `src/lib/api.ts` → `api.ai`

The API layer integrates all three agents:

### Design Generation Flow

```typescript
async generateDesign(prompt: string, constraints: any, user: User | null) {
  // 1. Content moderation
  const moderationResult = await aiAgents.contentModerator.moderate(prompt, user)
  if (!moderationResult.approved) {
    throw new Error(`Content not approved: ${moderationResult.violations}`)
  }

  // 2. IP check
  const ipResult = await aiAgents.ipChecker.check(prompt)
  if (ipResult.hasViolation && ipResult.riskLevel === 'high') {
    throw new Error(`IP issue: ${ipResult.detectedItems}`)
  }

  // 3. Generate design (if both checks pass)
  return generatedDesignUrl
}
```

### Chat Flow

```typescript
async chat(messages, product, currentPrintArea, user) {
  // Design assistant handles conversation
  return await aiAgents.designAssistant.chat(
    messages,
    product,
    currentPrintArea,
    user
  )
}
```

## Error Handling

All agents have built-in fallbacks:

```typescript
try {
  const response = await agent.doSomething()
} catch (error) {
  // Fail gracefully with sensible defaults
  return defaultSafeResponse
}
```

## Customization

To modify agent behavior, edit the `systemPrompt` in each agent:

```typescript
export const aiAgents = {
  contentModerator: {
    systemPrompt: `Your custom system prompt here...`,
    async moderate(...) { ... }
  }
}
```

## Best Practices

1. **Always pass user context**: Agents need age information for proper moderation
2. **Show specific errors**: Display violations and suggestions to users
3. **Don't override approvals**: If content moderator blocks something, respect it
4. **Test with edge cases**: Try brand names, celebrities, profanity
5. **Monitor API costs**: Every agent call uses GPT-4 tokens

## Testing Examples

### Should Pass Content Moderation

```typescript
// User age 25+
"A skull with roses" ✅
"Abstract geometric pattern" ✅
"My dog's portrait" ✅
"Motivational quote: Dream Big" ✅
```

### Should Fail Content Moderation

```typescript
// User under 18
"Sexy girl in bikini" ❌ (sexually suggestive)
"Blood and gore skull" ❌ (violence)

// Any age
"Death to [group]" ❌ (hate speech)
"Explicit nudity" ❌ (explicit content)
```

### Should Fail IP Check

```typescript
"Nike swoosh logo" ❌ (trademark)
"Darth Vader with lightsaber" ❌ (Star Wars IP)
"Just Do It slogan" ❌ (trademarked phrase)
"Mickey Mouse character" ❌ (Disney IP)
```

### Should Pass IP Check

```typescript
"A warrior in space with a sword" ✅ (generic concept)
"My own superhero character" ✅ (original)
"Geometric swoosh inspired design" ✅ (inspired, not copied)
```

## Monitoring & Logging

All agent errors are logged to console:

```javascript
console.error('Content moderation failed:', error)
console.error('IP check failed:', error)
console.error('Design assistant chat failed:', error)
```

Monitor these logs to identify:
- API failures
- JSON parsing errors
- Timeout issues
- Unexpected responses

## Future Enhancements

- [ ] Add caching for repeated prompts
- [ ] Implement rate limiting per user
- [ ] Add admin override for false positives
- [ ] Create moderation history dashboard
- [ ] Add appeal process for blocked content
- [ ] Integrate real-time trademark database
- [ ] Add image analysis for uploaded files
- [ ] Implement graduated responses (warn before block)
