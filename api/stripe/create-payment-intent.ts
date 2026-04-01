import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_API_BASE = 'https://api.stripe.com/v1'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

type CreatePaymentIntentBody = {
  orderId: string
  /** Legacy: ignored for amount; must match server total within 1¢ if sent */
  amount?: number
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

  if (!body?.orderId) {
    res.status(400).json({ error: 'orderId is required' })
    return
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase not configured for payment intent' })
    return
  }

  const { data: row, error } = await supabaseAdmin.from('orders').select('total_amount').eq('id', body.orderId).single()

  if (error || !row) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  const totalAmount = Number((row as { total_amount: string | number }).total_amount)
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    res.status(400).json({ error: 'Invalid order total' })
    return
  }

  const amountInCents = Math.round(totalAmount * 100)

  if (body.amount != null) {
    const clientCents = Math.round(body.amount)
    if (Math.abs(clientCents - amountInCents) > 1) {
      res.status(400).json({ error: 'Amount does not match order total' })
      return
    }
  }

  const formData = new URLSearchParams()
  formData.append('amount', amountInCents.toString())
  formData.append('currency', body.currency || 'usd')
  formData.append('automatic_payment_methods[enabled]', 'true')
  if (body.description) formData.append('description', body.description)

  const metadata = {
    ...(body.metadata || {}),
    order_id: body.orderId,
    fulfill_on_pi: '1',
  }
  Object.entries(metadata).forEach(([k, v]) => {
    if (v != null) formData.append(`metadata[${k}]`, String(v))
  })

  try {
    const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    const data = (await response.json()) as any
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Failed to create payment intent' })
      return
    }
    res.status(200).json(data)
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' })
  }
}
