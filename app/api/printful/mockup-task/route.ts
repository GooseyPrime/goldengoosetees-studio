import { NextRequest, NextResponse } from 'next/server'
import { printfulGet, printfulPost } from '@/lib/printful/client'

export const dynamic = 'force-dynamic'

type FileEntry = { placement: string; file_id: string }

/**
 * POST — create mockup task
 * Body: { catalogProductId: number, catalogVariantId: number, files: FileEntry[] }
 */
export async function POST(request: NextRequest) {
  if (!process.env.PRINTFUL_API_KEY?.trim()) {
    return NextResponse.json({ success: false, error: 'PRINTFUL_API_KEY not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const catalogProductId = Number(body.catalogProductId)
    const catalogVariantId = Number(body.catalogVariantId)
    const files = Array.isArray(body.files) ? body.files : []

    if (!Number.isFinite(catalogProductId) || !Number.isFinite(catalogVariantId)) {
      return NextResponse.json(
        { success: false, error: 'catalogProductId and catalogVariantId required' },
        { status: 400 }
      )
    }

    const normalized: FileEntry[] = files
      .filter((f: unknown) => f && typeof f === 'object')
      .map((f: { placement?: string; file_id?: string }) => ({
        placement: String(f.placement || '').trim(),
        file_id: String(f.file_id || '').trim(),
      }))
      .filter((f: FileEntry) => f.placement && f.file_id)

    if (normalized.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one placement file is required' }, { status: 400 })
    }

    const payload = {
      product_id: catalogProductId,
      variant_ids: [catalogVariantId],
      files: normalized,
      format: 'png',
    }

    const res = await printfulPost<{
      id: number
      status: string
      catalog_variant_mockups?: unknown[]
      failure_reasons?: string[]
    }>('/mockup-tasks', payload)

    if (!res.success || res.data === undefined) {
      return NextResponse.json(
        { success: false, error: res.error || 'Printful mockup task failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      taskId: res.data.id,
      status: res.data.status,
      failureReasons: res.data.failure_reasons ?? [],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

/**
 * GET — poll mockup task ?id=
 */
export async function GET(request: NextRequest) {
  if (!process.env.PRINTFUL_API_KEY?.trim()) {
    return NextResponse.json({ success: false, error: 'PRINTFUL_API_KEY not configured' }, { status: 503 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id query param' }, { status: 400 })
  }

  const res = await printfulGet<{
    id: number
    status: string
    catalog_variant_mockups?: Array<{
      catalog_variant_id: number
      mockups: Array<{ placement: string; mockup_url: string }>
    }>
    failure_reasons?: string[]
  }>(`/mockup-tasks?id=${encodeURIComponent(id)}`)

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error || 'Poll failed' }, { status: 502 })
  }

  const data = res.data as {
    id: number
    status: string
    catalog_variant_mockups?: Array<{
      catalog_variant_id: number
      mockups: Array<{ placement: string; mockup_url: string }>
    }>
    failure_reasons?: string[]
  }

  const mockupUrls: string[] = []
  for (const block of data.catalog_variant_mockups ?? []) {
    for (const m of block.mockups ?? []) {
      if (m.mockup_url) mockupUrls.push(m.mockup_url)
    }
  }

  return NextResponse.json({
    success: true,
    taskId: data.id,
    status: data.status,
    mockupUrls,
    raw: data,
    failureReasons: data.failure_reasons ?? [],
  })
}
