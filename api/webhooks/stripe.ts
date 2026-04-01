/**
 * Stripe webhook — raw body + constructEvent; Printful fulfillment (optional flag).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { buffer } from 'micro'
import { fulfillPrintfulForPaidOrder } from '../_lib/fulfillment-printful'
import { isServerFulfillmentEnabled } from '../_lib/flags'

export const config = {
  api: {
    bodyParser: false,
  },
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getOrderRow(orderId: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!response.ok) return null
  const data = await response.json()
  return data[0] || null
}

async function patchOrder(orderId: string, updates: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase not configured')
    return
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
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
  })
  if (!response.ok) {
    throw new Error(`Failed to update order: ${response.statusText}`)
  }
}

async function handlePaidOrder(orderId: string, stripeExtras: Record<string, unknown>): Promise<void> {
  console.log(`[stripe-webhook] paid order ${orderId}`, stripeExtras)

  const existing = await getOrderRow(orderId)
  if (!existing) {
    console.error(`[stripe-webhook] order not found ${orderId}`)
    return
  }

  await patchOrder(orderId, {
    ...stripeExtras,
    status: 'processing',
  })

  if (!isServerFulfillmentEnabled()) {
    console.log('[stripe-webhook] SERVER_FULFILLMENT_ENABLED not true; skipping Printful')
    return
  }

  if (existing.printful_order_id) {
    console.log(`[stripe-webhook] order ${orderId} already has Printful id, skipping create`)
    return
  }

  try {
    const { printfulOrderId, estimatedDelivery } = await fulfillPrintfulForPaidOrder(orderId)
    await patchOrder(orderId, {
      printful_order_id: printfulOrderId,
      estimated_delivery: estimatedDelivery,
      status: 'processing',
    })
    console.log(`[stripe-webhook] Printful ${printfulOrderId} for order ${orderId}`)
  } catch (e) {
    console.error(`[stripe-webhook] Printful failed for ${orderId}`, e)
    await patchOrder(orderId, { status: 'failed' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe webhook not configured' })
    return
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY)

  let event: Stripe.Event
  try {
    const rawBody = await buffer(req)
    const sig = req.headers['stripe-signature'] as string
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature' })
      return
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message)
    res.status(400).json({ error: `Webhook Error: ${err?.message || 'invalid'}` })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id
        if (orderId) {
          await handlePaidOrder(orderId, {
            stripe_session_id: session.id,
            stripe_payment_id: session.payment_intent as string,
          })
        } else {
          console.error('checkout.session.completed missing order_id metadata')
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        // Avoid double-fulfill with Checkout Session (handled by checkout.session.completed).
        if (orderId && pi.metadata?.fulfill_on_pi === '1') {
          await handlePaidOrder(orderId, {
            stripe_payment_id: pi.id,
          })
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        if (orderId) {
          await patchOrder(orderId, { status: 'failed' })
        }
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}
