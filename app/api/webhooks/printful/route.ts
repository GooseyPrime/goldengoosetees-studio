import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement Printful webhook handling
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Printful webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
