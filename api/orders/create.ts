import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '../_lib/supabase-server'
import { getUserIdFromBearer } from '../_lib/verify-user'
import { isPricingV2Enabled } from '../_lib/flags'
import { computeQuoteInputHash, PRICING_VERSION } from '../_lib/pricing'
import { fileUrlsHash } from '../_lib/printful-order-build'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isPricingV2Enabled()) {
    res.status(503).json({ error: 'Server order create disabled (set PRICING_V2_ENABLED=true)' })
    return
  }

  const userId = await getUserIdFromBearer(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    res.status(500).json({ error: 'Server misconfigured' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { pricingQuoteId, shippingAddress } = body || {}

  if (!pricingQuoteId || typeof pricingQuoteId !== 'string') {
    res.status(400).json({ error: 'pricingQuoteId is required' })
    return
  }
  if (!shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.country) {
    res.status(400).json({ error: 'shippingAddress with line1, city, country is required' })
    return
  }

  try {
    const { data: quote, error: qErr } = await admin
      .from('pricing_quotes')
      .select('*')
      .eq('id', pricingQuoteId)
      .single()

    if (qErr || !quote) {
      res.status(404).json({ error: 'Quote not found' })
      return
    }

    const expires = new Date(quote.expires_at).getTime()
    if (Number.isFinite(expires) && expires < Date.now()) {
      res.status(410).json({ error: 'Quote expired' })
      return
    }

    const { data: designRow, error: dErr } = await admin
      .from('designs')
      .select('*')
      .eq('id', quote.design_id)
      .single()

    if (dErr || !designRow) {
      res.status(404).json({ error: 'Design not found' })
      return
    }
    if (designRow.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const files = Array.isArray(designRow.files) ? designRow.files : []
    const recipient = quote.recipient as Record<string, string>
    const verifyHash = computeQuoteInputHash({
      designId: quote.design_id,
      variantId: quote.variant_id,
      configurationId: quote.configuration_id ?? null,
      quantity: quote.quantity,
      shippingMethod: quote.shipping_method,
      recipient,
      fileFingerprint: fileUrlsHash(files as any),
      pricingVersion: quote.pricing_version,
    })

    if (verifyHash !== quote.quote_input_hash) {
      console.error('orders/create: quote hash mismatch', { quoteId: pricingQuoteId })
      res.status(409).json({ error: 'Quote integrity check failed' })
      return
    }

    const orderId = randomUUID()
    const now = new Date().toISOString()

    const pricingSnapshot = {
      pricing_version: quote.pricing_version || PRICING_VERSION,
      currency: quote.currency || 'USD',
      quote_input: {
        variant_id: quote.variant_id,
        product_id: designRow.product_id,
        configuration_id: quote.configuration_id,
        quantity: quote.quantity,
        shipping_method: quote.shipping_method,
        recipient,
      },
      printful_estimate: quote.printful_estimate,
      pricing_math: {
        p_stripe: null,
        retail_total: Number(quote.retail_total_amount),
        printful_total_cost: Number(quote.printful_total_cost),
      },
      retail_breakdown: {
        retail_total_amount: Number(quote.retail_total_amount),
        stripe_fee_est_amount: Number(quote.stripe_fee_est_amount),
        refund_buffer_est_amount: Number(quote.refund_buffer_est_amount),
        profit_target_amount: Number(quote.profit_target_amount),
        profit_est_amount: Number(quote.profit_est_amount),
      },
    }

    const insertPayload: Record<string, unknown> = {
      id: orderId,
      user_id: userId,
      design_id: quote.design_id,
      product_id: String(designRow.product_id),
      variant_selections: designRow.variant_selections,
      size: designRow.size,
      color: designRow.color,
      status: 'pending',
      total_amount: Number(quote.retail_total_amount),
      shipping_address: {
        name: shippingAddress.name,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
      },
      created_at: now,
      updated_at: now,
      pricing_quote_id: quote.id,
      pricing_version: quote.pricing_version,
      currency: quote.currency || 'USD',
      pricing_snapshot: pricingSnapshot,
      printful_estimate: quote.printful_estimate,
      printful_total_cost: quote.printful_total_cost,
      stripe_fee_est_amount: quote.stripe_fee_est_amount,
      refund_buffer_est_amount: quote.refund_buffer_est_amount,
      profit_target_amount: quote.profit_target_amount,
      profit_est_amount: quote.profit_est_amount,
    }

    const { error: insErr } = await admin.from('orders').insert(insertPayload)
    if (insErr) {
      console.error('orders/create insert error', insErr)
      res.status(500).json({ error: insErr.message || 'Failed to create order' })
      return
    }

    res.status(200).json({
      orderId,
      totalAmount: Number(quote.retail_total_amount),
      pricingQuoteId: quote.id,
    })
  } catch (e: any) {
    console.error('orders/create', e)
    res.status(500).json({ error: e?.message || 'Order create failed' })
  }
}
