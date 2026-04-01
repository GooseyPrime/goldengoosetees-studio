import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' })
    return
  }

  const sessionId = (req.query.session_id as string) || ''
  if (!sessionId) {
    res.status(400).json({ error: 'Missing session_id' })
    return
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    })
    const data = await response.json()
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Failed to get checkout session' })
      return
    }
    res.status(200).json(data)
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' })
  }
}


