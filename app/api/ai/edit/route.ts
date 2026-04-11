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
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

    if (!prompt || !imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json(
        { success: false, error: 'prompt and valid imageUrl required' },
        { status: 400 }
      )
    }

    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return NextResponse.json({ success: false, error: 'Could not fetch source image' }, { status: 400 })
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    if (buf.length > 4 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Image too large for edit (max 4MB)' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: key })
    const file = await OpenAI.toFile(buf, 'source.png', { type: 'image/png' })

    const result = await client.images.edit({
      model: 'dall-e-2',
      image: file,
      prompt,
      n: 1,
      size: '1024x1024',
    })

    const url = result.data?.[0]?.url
    if (url) {
      return NextResponse.json({ success: true, imageUrl: url })
    }

    return NextResponse.json({ success: false, error: 'No edited image returned' }, { status: 502 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Edit failed'
    console.error('AI edit:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
