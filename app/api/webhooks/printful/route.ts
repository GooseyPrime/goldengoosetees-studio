import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const sig = signatureHeader.replace(/^sha256=/i, '').trim()
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(sig, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const secret = process.env.PRINTFUL_WEBHOOK_SECRET?.trim()

  if (secret) {
    const sig =
      request.headers.get('x-printful-signature') ||
      request.headers.get('x-pf-signature') ||
      request.headers.get('printful-signature')
    if (!verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: { type?: string; data?: unknown }
  try {
    payload = JSON.parse(rawBody) as { type?: string; data?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.type === 'mockup_task_finished') {
    console.log('Printful mockup_task_finished', JSON.stringify(payload.data).slice(0, 500))
  }

  return NextResponse.json({ received: true })
}
