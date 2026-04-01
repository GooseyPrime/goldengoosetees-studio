import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

type ConfirmPaymentIntentBody = {
  paymentIntentId: string
  tokenId: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' })
    return
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as ConfirmPaymentIntentBody
  if (!body?.paymentIntentId || !body?.tokenId) {
    res.status(400).json({ error: 'Missing paymentIntentId or tokenId' })
    return
  }

  const formData = new URLSearchParams()
  formData.append('payment_method_data[type]', 'card')
  formData.append('payment_method_data[card][token]', body.tokenId)

  try {
    const response = await fetch(`${STRIPE_API_BASE}/payment_intents/${encodeURIComponent(body.paymentIntentId)}/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    const data = await response.json()
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Failed to confirm payment intent' })
      return
    }
    res.status(200).json(data)
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' })
  }
}

