import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

type CreateCheckoutSessionBody = {
  orderId: string
  productName: string
  productDescription?: string
  productImage?: string
  amount: number // dollars
  customerEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' })
    return
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as CreateCheckoutSessionBody

  if (!body?.orderId || !body?.productName || !body?.amount || !body?.customerEmail || !body?.successUrl || !body?.cancelUrl) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const amountInCents = Math.round(body.amount * 100)

  const formData = new URLSearchParams()
  formData.append('mode', 'payment')
  formData.append('success_url', body.successUrl)
  formData.append('cancel_url', body.cancelUrl)
  formData.append('customer_email', body.customerEmail)

  // Line item
  formData.append('line_items[0][price_data][currency]', 'usd')
  formData.append('line_items[0][price_data][unit_amount]', amountInCents.toString())
  formData.append('line_items[0][price_data][product_data][name]', body.productName)
  if (body.productDescription) {
    formData.append('line_items[0][price_data][product_data][description]', body.productDescription)
  }
  if (body.productImage) {
    formData.append('line_items[0][price_data][product_data][images][0]', body.productImage)
  }
  formData.append('line_items[0][quantity]', '1')

  // Metadata
  formData.append('metadata[order_id]', body.orderId)
  if (body.metadata) {
    Object.entries(body.metadata).forEach(([key, value]) => {
      formData.append(`metadata[${key}]`, value)
    })
  }

  // Shipping address collection
  formData.append('shipping_address_collection[allowed_countries][0]', 'US')
  formData.append('shipping_address_collection[allowed_countries][1]', 'CA')

  try {
    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await response.json()
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Failed to create checkout session' })
      return
    }

    res.status(200).json({ id: data.id, url: data.url })
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' })
  }
}

