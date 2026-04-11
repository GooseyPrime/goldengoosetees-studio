import OpenAI from 'openai'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function parseModelList(envVal: string | undefined, fallback: string[]): string[] {
  if (!envVal?.trim()) return fallback
  return envVal
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function getChatModelChain(): string[] {
  return parseModelList(process.env.OPENROUTER_CHAT_MODELS, [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
  ])
}

export function getOnlineModelChain(): string[] {
  return parseModelList(process.env.OPENROUTER_ONLINE_MODELS, [
    'openai/gpt-4o-mini:online',
    'perplexity/sonar',
  ])
}

const WEB_HINT =
  /\b(latest|today|current|news|trending|price|stock|weather|who won|when did|202[4-9]|this year)\b/i

export function shouldUseOnlineModel(message: string): boolean {
  if (process.env.OPENROUTER_FORCE_ONLINE === 'true') return true
  return WEB_HINT.test(message)
}

export function createOpenRouterClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  return new OpenAI({
    apiKey: key,
    baseURL: OPENROUTER_BASE,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://goldengoosetees.com',
      'X-Title': 'Golden Goose Tees Studio',
    },
  })
}

export async function chatCompletionWithFallback(
  client: OpenAI,
  models: string[],
  params: Omit<OpenAI.Chat.ChatCompletionCreateParams, 'model'>
): Promise<OpenAI.Chat.ChatCompletion> {
  let lastErr: Error | null = null
  for (const model of models) {
    try {
      return await client.chat.completions.create({
        ...params,
        model,
        stream: false,
      })
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      console.warn(`OpenRouter model ${model} failed:`, lastErr.message)
    }
  }
  throw lastErr || new Error('All OpenRouter models failed')
}
