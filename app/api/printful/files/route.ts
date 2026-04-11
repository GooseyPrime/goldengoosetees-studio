import { NextRequest, NextResponse } from 'next/server'
import { printfulPost } from '@/lib/printful/client'

export const dynamic = 'force-dynamic'

/**
 * Register a publicly reachable image URL with Printful's file library.
 * POST { url: string, filename?: string }
 */
export async function POST(request: NextRequest) {
  if (!process.env.PRINTFUL_API_KEY?.trim()) {
    return NextResponse.json({ success: false, error: 'PRINTFUL_API_KEY not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 })
    }

    const filename =
      typeof body.filename === 'string' && body.filename.trim()
        ? body.filename.trim()
        : `design-${Date.now()}.png`

    const res = await printfulPost<{ id: string; url?: string; preview_url?: string }>('/files', {
      url,
      type: 'default',
      filename,
    })

    if (!res.success || !res.data) {
      return NextResponse.json(
        { success: false, error: res.error || 'Printful file registration failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      fileId: res.data.id,
      url: res.data.url,
      previewUrl: res.data.preview_url,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
