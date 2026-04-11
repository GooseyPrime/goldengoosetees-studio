import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { computeRetailCents, type CheckoutDraftPayload } from '@/lib/checkout/quote'

export const dynamic = 'force-dynamic'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.VITE_APP_URL?.replace(/\/$/, '') ||
    request.headers.get('origin') ||
    'http://localhost:3000'

  try {
    const body = (await request.json()) as Partial<CheckoutDraftPayload> & { quantity?: number }
    const catalogProductId = Number(body.catalogProductId)
    const catalogVariantId = Number(body.catalogVariantId)
    const placementFileIds = body.placementFileIds && typeof body.placementFileIds === 'object' ? body.placementFileIds : {}
    const placementFileUrls = body.placementFileUrls && typeof body.placementFileUrls === 'object' ? body.placementFileUrls : {}

    if (!Number.isFinite(catalogProductId) || !Number.isFinite(catalogVariantId)) {
      return NextResponse.json({ success: false, error: 'Invalid product or variant' }, { status: 400 })
    }

    const keys = Object.keys(placementFileIds).filter((k) => placementFileIds[k as keyof typeof placementFileIds])
    if (keys.length === 0) {
      return NextResponse.json({ success: false, error: 'No design files for checkout' }, { status: 400 })
    }

    const variantLabel = typeof body.variantLabel === 'string' ? body.variantLabel : 'Custom'
    const sizeMatch = variantLabel.match(/\b(XXS|XS|S|M|L|XL|2XL|3XL|4XL|2X|3X)\b/i)
    const size = sizeMatch ? sizeMatch[1].toUpperCase().replace('2X', '2XL').replace('3X', '3XL') : 'M'

    const quantity = Math.min(99, Math.max(1, Number(body.quantity) || 1))
    const unitCents = computeRetailCents(catalogProductId, keys, size)
    const totalCents = unitCents * quantity

    if (totalCents <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid price' }, { status: 400 })
    }

    const stripe = getStripe()

    const metadata: Record<string, string> = {
      catalog_product_id: String(catalogProductId),
      catalog_variant_id: String(catalogVariantId),
      quantity: String(quantity),
      placement_file_ids: JSON.stringify(placementFileIds),
      placement_file_urls: JSON.stringify(placementFileUrls),
      mockup_task_id: body.mockupTaskId != null ? String(body.mockupTaskId) : '',
      mockup_urls: JSON.stringify(body.mockupUrls ?? []),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity,
          price_data: {
            currency: 'usd',
            unit_amount: unitCents,
            product_data: {
              name: body.productName || 'Custom product',
              description: `${variantLabel} — ${keys.length} print area(s)`,
            },
          },
        },
      ],
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      metadata,
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Checkout failed'
    console.error('Checkout:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
