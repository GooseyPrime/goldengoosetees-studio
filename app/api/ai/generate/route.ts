import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

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
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt || prompt.length > 4000) {
      return NextResponse.json({ success: false, error: 'Invalid prompt' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: key })
    const result = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    })

    const url = result.data?.[0]?.url
    if (!url) {
      return NextResponse.json({ success: false, error: 'No image returned' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: url,
      revisedPrompt: result.data?.[0]?.revised_prompt,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    console.error('AI generate:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
