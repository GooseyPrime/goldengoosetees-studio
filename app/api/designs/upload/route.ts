import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import imageSize from 'image-size'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { getPlacementConfig } from '@/lib/config/products.config'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024
const BUCKET = 'design-uploads'

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured for uploads' },
      { status: 503 }
    )
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large (max 8MB)' }, { status: 400 })
    }
    const mime = file.type || 'application/octet-stream'
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
      return NextResponse.json(
        { success: false, error: 'Only PNG, JPEG, or WebP images are allowed' },
        { status: 400 }
      )
    }

    const catalogProductIdRaw = form.get('catalogProductId')
    const placementIdRaw = form.get('placementId')
    const buf = Buffer.from(await file.arrayBuffer())

    if (catalogProductIdRaw && placementIdRaw) {
      const catalogProductId = parseInt(String(catalogProductIdRaw), 10)
      const placementId = String(placementIdRaw).trim()
      if (Number.isFinite(catalogProductId) && placementId) {
        const pc = getPlacementConfig(catalogProductId, placementId)
        if (pc) {
          let w = 0
          let h = 0
          try {
            const dim = imageSize(buf)
            w = dim.width ?? 0
            h = dim.height ?? 0
          } catch {
            return NextResponse.json(
              { success: false, error: 'Could not read image dimensions' },
              { status: 400 }
            )
          }
          const minSide = Math.max(300, Math.floor(pc.canvasExportPx * 0.25))
          if (w > 0 && h > 0 && Math.min(w, h) < minSide) {
            return NextResponse.json(
              {
                success: false,
                error: `Image is too small for this print area. Minimum ~${minSide}px on the shorter side (got ${w}×${h}px). Target about ${pc.canvasExportPx}px for best print quality.`,
              },
              { status: 400 }
            )
          }
        }
      }
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const path = `sessions/${randomUUID()}.${ext}`

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: false,
    })
    if (error) {
      console.error('Supabase upload:', error)
      return NextResponse.json(
        {
          success: false,
          error:
            error.message ||
            'Upload failed (check bucket design-uploads exists and is public or use signed URL flow)',
        },
        { status: 500 }
      )
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      path: data.path,
      publicUrl: pub.publicUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
