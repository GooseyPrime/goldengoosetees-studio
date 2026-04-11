import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { printfulPost } from '@/lib/printful/client'

export const dynamic = 'force-dynamic'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

/**
 * After successful payment, create a draft Printful order (confirm separately in dashboard or via API when ready).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const md = session.metadata || {}

    try {
      const catalogVariantId = parseInt(md.catalog_variant_id || '', 10)
      const placementFileIds = JSON.parse(md.placement_file_ids || '{}') as Record<string, string>
      const quantity = parseInt(md.quantity || '1', 10) || 1

      if (
        process.env.PRINTFUL_API_KEY &&
        Number.isFinite(catalogVariantId) &&
        Object.keys(placementFileIds).length > 0
      ) {
        const files = Object.entries(placementFileIds).map(([placement, file_id]) => ({
          placement,
          file_id,
        }))

        const orderBody = {
          recipient: {
            name: session.customer_details?.name || 'Customer',
            email: session.customer_details?.email || session.customer_email || undefined,
            address1: session.customer_details?.address?.line1 || 'Pending',
            city: session.customer_details?.address?.city || 'Pending',
            state_code: session.customer_details?.address?.state || 'CA',
            country_code: session.customer_details?.address?.country || 'US',
            zip: session.customer_details?.address?.postal_code || '00000',
          },
          items: [
            {
              quantity,
              catalog_variant_id: catalogVariantId,
              source: 'catalog',
              files,
            },
          ],
        }

        const res = await printfulPost<{ id: number }>('/orders', orderBody)
        if (!res.success) {
          console.error('Printful order creation failed:', res.error)
        } else {
          console.log('Printful draft order created:', res.data)
        }
      }
    } catch (e) {
      console.error('Fulfillment handler error:', e)
    }
  }

  return NextResponse.json({ received: true })
}
