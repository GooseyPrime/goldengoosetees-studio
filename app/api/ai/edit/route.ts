import { NextRequest, NextResponse } from 'next/server'
import { editImageStudio } from '@/lib/ai/designAgentCore'
import { validateImageUrlForPlacement } from '@/lib/design/validateArt'
import { OpenAIImageServiceUnavailableError } from '@/lib/ai/openaiImageErrors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const catalogProductId = body.catalogProductId != null ? Number(body.catalogProductId) : NaN
    const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''

    const { imageUrl: out } = await editImageStudio(imageUrl, prompt)

    if (Number.isFinite(catalogProductId) && placementId) {
      const v = await validateImageUrlForPlacement(out, catalogProductId, placementId)
      if (!v.ok) {
        return NextResponse.json(
          {
            success: false,
            error: v.error,
            imageUrl: out,
            needsRevision: true,
          },
          { status: 422 }
        )
      }
    }

    return NextResponse.json({ success: true, imageUrl: out })
  } catch (e: unknown) {
    if (e instanceof OpenAIImageServiceUnavailableError) {
      console.error('AI edit:', e)
      return NextResponse.json({ success: false, error: e.message }, { status: e.httpStatus })
    }
    const msg = e instanceof Error ? e.message : 'Edit failed'
    console.error('AI edit:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
