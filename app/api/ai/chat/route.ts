import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  DESIGN_AGENT_TOOLS,
  executeDesignAgentTool,
  type ClientAction,
  type StudioContextPayload,
} from '@/lib/ai/designAgentCore'

export const dynamic = 'force-dynamic'

const MAX_ROUNDS = 6

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export async function POST(request: NextRequest) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    return NextResponse.json(
      { success: false, error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    )
  }

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

    const system = `You are the Golden Goose Tees design assistant. You help customers use the custom apparel studio: pick products and variants, add art to each print placement (front, back, sleeves, etc.), run mockups, review, and checkout.

Rules:
- Be concise and actionable. Use tools when the user wants to navigate, change placement focus, generate art, or edit art.
- For generate_design: use clear printable-safe prompts (no hateful/violent content; refuse if asked).
- If the user must do something in the UI first (e.g. pick a product), say so clearly.
- After tools run, summarize what changed in plain language.

Current studio context (JSON):
${JSON.stringify(ctx, null, 2)}

Per-placement image URLs (for your reasoning only; edit_design uses server-side URLs):
${JSON.stringify(artUrls)}`

    const client = new OpenAI({ apiKey: key })
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...history.slice(-16).map((m): OpenAI.Chat.ChatCompletionUserMessageParam | OpenAI.Chat.ChatCompletionAssistantMessageParam => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const actions: ClientAction[] = []
    let assistantText = ''

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: DESIGN_AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1200,
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
