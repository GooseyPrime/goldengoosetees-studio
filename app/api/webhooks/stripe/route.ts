import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement Stripe webhook handling
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
