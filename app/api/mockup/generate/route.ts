import { NextResponse } from 'next/server'

/**
 * Deprecated: use POST /api/printful/mockup-task instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Use POST /api/printful/mockup-task with catalogProductId, catalogVariantId, and files[].',
    },
    { status: 410 }
  )
}
