import { NextRequest, NextResponse } from 'next/server'
import { generateImageStudio } from '@/lib/ai/designAgentCore'
import { validateImageUrlForPlacement } from '@/lib/design/validateArt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt || prompt.length > 4000) {
      return NextResponse.json({ success: false, error: 'Invalid prompt' }, { status: 400 })
    }

    const catalogProductId = body.catalogProductId != null ? Number(body.catalogProductId) : NaN
    const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''

    const { imageUrl, revisedPrompt } = await generateImageStudio(prompt)

    if (Number.isFinite(catalogProductId) && placementId) {
      const v = await validateImageUrlForPlacement(imageUrl, catalogProductId, placementId)
      if (!v.ok) {
        return NextResponse.json(
          {
            success: false,
            error: v.error,
            imageUrl,
            needsRevision: true,
          },
          { status: 422 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    console.error('AI generate:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
