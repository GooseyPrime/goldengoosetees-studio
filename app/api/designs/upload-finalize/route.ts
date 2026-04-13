import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { getPlacementConfig } from '@/lib/config/products.config'
import { validateImageBufferForPlacement } from '@/lib/design/validateArt'

export const dynamic = 'force-dynamic'

const BUCKET = 'design-uploads'

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured for uploads' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const path = typeof body.path === 'string' ? body.path.trim() : ''
    const catalogProductId = body.catalogProductId != null ? Number(body.catalogProductId) : NaN
    const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''

    if (!path || path.includes('..')) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
    if (dlErr || !blob) {
      console.error('upload-finalize download:', dlErr)
      return NextResponse.json(
        { success: false, error: dlErr?.message || 'Could not read uploaded file' },
        { status: 500 }
      )
    }

    const buf = Buffer.from(await blob.arrayBuffer())

    if (Number.isFinite(catalogProductId) && placementId) {
      if (getPlacementConfig(catalogProductId, placementId)) {
        const v = validateImageBufferForPlacement(buf, catalogProductId, placementId)
        if (!v.ok) {
          await admin.storage.from(BUCKET).remove([path])
          return NextResponse.json({ success: false, error: v.error }, { status: 400 })
        }
      }
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      success: true,
      path,
      publicUrl: pub.publicUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Finalize failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
