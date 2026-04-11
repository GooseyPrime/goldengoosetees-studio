import { NextRequest, NextResponse } from 'next/server'
import type OpenAI from 'openai'
import {
  DESIGN_AGENT_TOOLS,
  executeDesignAgentTool,
  type ClientAction,
  type StudioContextPayload,
} from '@/lib/ai/designAgentCore'
import {
  chatCompletionWithFallback,
  createOpenRouterClient,
  getChatModelChain,
  getOnlineModelChain,
  shouldUseOnlineModel,
} from '@/lib/ai/openrouterChat'

export const dynamic = 'force-dynamic'

const MAX_ROUNDS = 6

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

function buildSystemPrompt(ctx: StudioContextPayload, artUrls: Record<string, string | null>): string {
  return `You are the senior print-shop administrator for Golden Goose Tees. You guide customers through ordering custom printed apparel: product type → size, color, and print locations → artwork that meets Printful technical requirements → mockups → review → Stripe checkout.

Persona and rules:
- Be warm, concise, and authoritative about print constraints (resolution, placement). Never invent prices; the app shows estimates and Stripe shows tax/shipping.
- Refuse hateful, violent, or illegal content. Keep prompts print-safe.
- Use tools when the customer wants to change the studio (product, size, color, placements, navigation, generate/edit art, mockups, checkout). Prefer set_size + set_color + set_print_locations over raw variant ids when helping humans choose.
- For questions needing current web information (news, trends, live facts), answer accurately; if your model has browsing/search capability, use it. If unsure, say so.
- After tools run, summarize what changed in plain language.

Current studio context (JSON):
${JSON.stringify(ctx, null, 2)}

Per-placement image URLs (for reasoning; server uses these for edits):
${JSON.stringify(artUrls)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message || message.length > 8000) {
      return NextResponse.json({ success: false, error: 'Invalid message' }, { status: 400 })
    }

    const ctx = body.context as StudioContextPayload
    if (!ctx || typeof ctx !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing context' }, { status: 400 })
    }

    const historyRaw = Array.isArray(body.history) ? (body.history as ChatMessage[]) : []
    const history = historyRaw.filter((m) => m.role === 'user' || m.role === 'assistant')
    const artUrls =
      body.artUrls && typeof body.artUrls === 'object'
        ? (body.artUrls as Record<string, string | null>)
        : {}

    const client = createOpenRouterClient()
    const useOnline = shouldUseOnlineModel(message)
    const models = useOnline ? getOnlineModelChain() : getChatModelChain()

    const system = buildSystemPrompt(ctx, artUrls)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...history.slice(-16).map(
        (m): OpenAI.Chat.ChatCompletionUserMessageParam | OpenAI.Chat.ChatCompletionAssistantMessageParam => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })
      ),
      { role: 'user', content: message },
    ]

    const actions: ClientAction[] = []
    let assistantText = ''

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const completion = await chatCompletionWithFallback(client, models, {
        messages,
        tools: DESIGN_AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.65,
        max_tokens: 1400,
      })

      const choice = completion.choices[0]
      const msg = choice?.message
      if (!msg) break

      if (msg.content) assistantText = msg.content

      const toolCalls = msg.tool_calls
      if (!toolCalls?.length) break

      messages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: toolCalls,
      })

      for (const tc of toolCalls) {
        if (tc.type !== 'function') continue
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
        } catch {
          args = {}
        }
        const result = await executeDesignAgentTool(tc.function.name, args, ctx, artUrls, actions)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        })
      }
    }

    if (!assistantText.trim()) {
      assistantText = 'Done. Check the studio for updates.'
    }

    return NextResponse.json({
      success: true,
      reply: assistantText.trim(),
      actions,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chat failed'
    console.error('AI chat:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
