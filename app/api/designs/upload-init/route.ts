import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const BUCKET = 'design-uploads'
const MAX_BYTES = 12 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured for uploads' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : ''
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize)
    if (!ALLOWED.has(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Only PNG, JPEG, or WebP images are allowed' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `File must be between 1 byte and ${MAX_BYTES / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
    const path = `sessions/${randomUUID()}.${ext}`

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false })
    if (error || !data) {
      console.error('createSignedUploadUrl:', error)
      const raw = (error?.message || '').toLowerCase()
      let hint =
        'Check that the Supabase Storage bucket "design-uploads" exists, is reachable, and that SUPABASE_SERVICE_ROLE_KEY is set on the server.'
      if (raw.includes('bucket not found') || raw.includes('not found') || raw.includes('does not exist')) {
        hint =
          'The Storage bucket "design-uploads" is missing or misnamed. Create a public bucket named design-uploads in the Supabase dashboard (see README).'
      } else if (raw.includes('jwt') || raw.includes('key')) {
        hint = 'Invalid or missing SUPABASE_SERVICE_ROLE_KEY — signed uploads require the service role.'
      }
      return NextResponse.json(
        { success: false, error: error?.message || 'Could not create upload URL', hint },
        { status: 500 }
      )
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: pub.publicUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload init failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
