import { NextRequest, NextResponse } from 'next/server'
import { validateImageUrlForPlacement } from '@/lib/design/validateArt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const catalogProductId = Number(body.catalogProductId)
    const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''

    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json({ success: false, error: 'Valid imageUrl required' }, { status: 400 })
    }
    if (!Number.isFinite(catalogProductId) || !placementId) {
      return NextResponse.json(
        { success: false, error: 'catalogProductId and placementId required' },
        { status: 400 }
      )
    }

    const v = await validateImageUrlForPlacement(imageUrl, catalogProductId, placementId)
    if (!v.ok) {
      return NextResponse.json({ success: false, error: v.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
