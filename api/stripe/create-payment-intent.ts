import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

type CreatePaymentIntentBody = {
  amount: number // cents
  currency?: string
  metadata?: Record<string, string>
  description?: string
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

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as CreatePaymentIntentBody
  if (!body?.amount || body.amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' })
    return
  }

  const formData = new URLSearchParams()
  formData.append('amount', Math.round(body.amount).toString())
  formData.append('currency', body.currency || 'usd')
  formData.append('automatic_payment_methods[enabled]', 'true')
  if (body.description) formData.append('description', body.description)
  if (body.metadata) {
    Object.entries(body.metadata).forEach(([k, v]) => {
      formData.append(`metadata[${k}]`, v)
    })
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    const data = await response.json()
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Failed to create payment intent' })
      return
    }
    res.status(200).json(data)
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' })
  }
}


