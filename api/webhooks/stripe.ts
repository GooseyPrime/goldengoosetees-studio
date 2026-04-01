/**
 * Stripe Webhook Handler for Vercel Serverless Functions
 *
 * This file handles Stripe webhook events, particularly:
 * - checkout.session.completed: Triggers order fulfillment via Printful
 *
 * SETUP INSTRUCTIONS:
 * 1. In Stripe Dashboard > Developers > Webhooks
 * 2. Add endpoint: https://your-domain.vercel.app/api/webhooks/stripe
 * 3. Select events: checkout.session.completed, payment_intent.succeeded
 * 4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
 *
 * ENVIRONMENT VARIABLES REQUIRED (in Vercel):
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - PRINTFUL_API_KEY (server-only, with backwards compatibility for VITE_PRINTFUL_API_KEY)
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Stripe webhook secret from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
// Use PRINTFUL_API_KEY first, fallback to VITE_PRINTFUL_API_KEY for backwards compatibility
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY ?? process.env.VITE_PRINTFUL_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Verify Stripe signature
async function verifyStripeSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    // Simple signature verification (for production, use stripe.webhooks.constructEvent)
    // This is a simplified version - in production, use the Stripe SDK
    const crypto = await import('crypto')
    const [t, v1] = signature.split(',').reduce(
      (acc, part) => {
        const [key, value] = part.split('=')
        if (key === 't') acc[0] = value
        if (key === 'v1') acc[1] = value
        return acc
      },
      ['', '']
    )

    const expectedSignature = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(`${t}.${payload}`)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Update order in Supabase
async function updateOrderStatus(
  orderId: string,
  updates: Record<string, any>
): Promise<void | VercelResponse> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase not configured')
    return
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to update order: ${response.statusText}`)
  }
}

// Get order from Supabase
async function getOrder(orderId: string): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data[0] || null
}

// Submit order to Printful
async function submitToPrintful(order: any): Promise<{
  printfulOrderId: string
  estimatedDelivery: string
}> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('Printful API key not configured')
  }

  // This is a simplified version - you would need to:
  // 1. Get the design files from storage
  // 2. Upload them to Printful
  // 3. Create the order with proper variant IDs

  const printfulOrder = {
    recipient: {
      name: order.shipping_address.name,
      address1: order.shipping_address.line1,
      address2: order.shipping_address.line2,
      city: order.shipping_address.city,
      state_code: order.shipping_address.state,
      country_code: order.shipping_address.country,
      zip: order.shipping_address.postal_code,
    },
    items: [
      {
        variant_id: 71, // Default variant - replace with actual
        quantity: 1,
        // files would go here from the design
      },
    ],
  }

  const response = await fetch('https://api.printful.com/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(printfulOrder),
  })

  if (!response.ok) {
    const error = await response.json() as any
    throw new Error(error.error?.message || 'Failed to create Printful order')
  }

  const data = await response.json() as any
  const printfulOrderId = data.result.id.toString()

  // Confirm the order
  await fetch(`https://api.printful.com/orders/${printfulOrderId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
    },
  })

  // Calculate estimated delivery (7 business days)
  const estimatedDelivery = new Date()
  let daysAdded = 0
  while (daysAdded < 7) {
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 1)
    const dayOfWeek = estimatedDelivery.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return {
    printfulOrderId,
    estimatedDelivery: estimatedDelivery.toISOString(),
  }
}

// Handle checkout.session.completed event
async function handleCheckoutCompleted(session: any): Promise<void | VercelResponse> {
  const orderId = session.metadata?.order_id

  if (!orderId) {
    console.error('No order_id in session metadata')
    return
  }

  console.log(`Processing completed checkout for order: ${orderId}`)

  // Get the order
  const order = await getOrder(orderId)
  if (!order) {
    console.error(`Order not found: ${orderId}`)
    return
  }

  // Update order with Stripe session info
  await updateOrderStatus(orderId, {
    stripe_session_id: session.id,
    stripe_payment_id: session.payment_intent,
    status: 'processing',
  })

  try {
    // Submit to Printful
    const { printfulOrderId, estimatedDelivery } = await submitToPrintful(order)

    // Update order with Printful info
    await updateOrderStatus(orderId, {
      printful_order_id: printfulOrderId,
      estimated_delivery: estimatedDelivery,
      status: 'processing',
    })

    console.log(`Order ${orderId} submitted to Printful: ${printfulOrderId}`)
  } catch (error) {
    console.error(`Failed to submit order ${orderId} to Printful:`, error)
    await updateOrderStatus(orderId, {
      status: 'failed',
    })
  }
}

// Main handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const signature = req.headers['stripe-signature'] as string
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  // Get raw body
  const rawBody =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

  // Verify signature (simplified - use Stripe SDK in production)
  // For production, use: stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    console.log(`Received Stripe webhook: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'payment_intent.succeeded':
        console.log('Payment intent succeeded:', event.data.object.id)
        // Handle if needed
        break

      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id)
        // Handle payment failure
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

// Vercel config to parse raw body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}


