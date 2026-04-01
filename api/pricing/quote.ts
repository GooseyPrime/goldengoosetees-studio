import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { printfulServer, extractPrintfulEstimateTotal } from '../_lib/printful'
import {
  priceQuote,
  computeQuoteInputHash,
  inferPricingCategory,
  type ProductCategoryHint,
} from '../_lib/pricing'
import { getSupabaseAdmin } from '../_lib/supabase-server'
import { getUserIdFromBearer } from '../_lib/verify-user'
import { isCuratedProductId } from '../_lib/offerings'
import {
  buildPrintfulItemsFromDesign,
  recipientForQuote,
  fileUrlsHash,
} from '../_lib/printful-order-build'
import { isPricingV2Enabled } from '../_lib/flags'

type RecipientBody = {
  country_code: string
  state_code?: string
  zip?: string
}

function validateRecipient(r: RecipientBody): string | null {
  if (!r?.country_code || r.country_code.length !== 2) {
    return 'recipient.country_code is required (ISO2)'
  }
  const cc = r.country_code.toUpperCase()
  if (['US', 'CA', 'AU'].includes(cc) && !(r.state_code && String(r.state_code).trim())) {
    return 'recipient.state_code is required for US, CA, AU'
  }
  return null
}

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
    res.status(503).json({ error: 'Pricing quote API disabled (set PRICING_V2_ENABLED=true)' })
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

  if (!printfulServer.isConfigured()) {
    res.status(503).json({ error: 'Printful not configured' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const {
    designId,
    variantId,
    configurationId,
    quantity = 1,
    recipient,
    shippingMethod = 'STANDARD',
    shippingAddress,
  } = body || {}

  const recErr = validateRecipient(recipient || {})
  if (recErr) {
    res.status(400).json({ error: recErr })
    return
  }

  if (!designId || typeof designId !== 'string') {
    res.status(400).json({ error: 'designId is required' })
    return
  }

  const vid = parseInt(String(variantId), 10)
  if (!Number.isFinite(vid)) {
    res.status(400).json({ error: 'variantId is required' })
    return
  }

  try {
    const { data: designRow, error: dErr } = await admin.from('designs').select('*').eq('id', designId).single()
    if (dErr || !designRow) {
      res.status(404).json({ error: 'Design not found' })
      return
    }
    if (designRow.user_id !== userId) {
      res.status(403).json({ error: 'Design does not belong to current user' })
      return
    }

    const pfVariant = await printfulServer.getVariant(vid)
    if (!isCuratedProductId(pfVariant.product_id)) {
      res.status(400).json({ error: 'Variant not in curated catalog' })
      return
    }

    const printfulProduct = await printfulServer.getProduct(pfVariant.product_id)
    const hint = inferCategoryHint(printfulProduct)
    const pricingCategory = inferPricingCategory(hint, printfulProduct.title, printfulProduct.type_name)

    const { items, resolvedVariantId } = await buildPrintfulItemsFromDesign({
      designRow: designRow as any,
      variantId: vid,
      quantity: Math.min(100, Math.max(1, parseInt(String(quantity), 10) || 1)),
    })

    const ship = shippingAddress || {}
    const recipientPayload = recipientForQuote({
      name: ship.name,
      line1: ship.line1 || '1 Main St',
      line2: ship.line2,
      city: ship.city || 'New York',
      state: ship.state || recipient.state_code || 'NY',
      postal_code: ship.postal_code || recipient.zip || '10001',
      country: ship.country || recipient.country_code,
      email: ship.email,
      phone: ship.phone,
    })

    // Merge explicit recipient overrides from client (authoritative for estimate)
    const mergedRecipient = {
      ...recipientPayload,
      ...recipient,
      state_code: recipient.state_code || recipientPayload.state_code,
      country_code: recipient.country_code || recipientPayload.country_code,
      zip: recipient.zip || recipientPayload.zip,
    }

    const estimate = await printfulServer.estimateOrderCosts({
      recipient: mergedRecipient,
      items,
    })

    const C = extractPrintfulEstimateTotal(estimate.raw)
    if (!Number.isFinite(C)) {
      console.error('quote: could not parse Printful total', JSON.stringify(estimate.raw).slice(0, 500))
      res.status(502).json({ error: 'Could not parse Printful estimate response' })
      return
    }

    const quoteMath = priceQuote({ printfulTotalCost: C, category: pricingCategory })
    const files = Array.isArray(designRow.files) ? designRow.files : []
    const quoteInputHash = computeQuoteInputHash({
      designId,
      variantId: resolvedVariantId,
      configurationId: configurationId ?? null,
      quantity,
      shippingMethod,
      recipient: mergedRecipient,
      fileFingerprint: fileUrlsHash(files as any),
      pricingVersion: quoteMath.pricingVersion,
    })

    const id = randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { error: insErr } = await admin.from('pricing_quotes').insert({
      id,
      pricing_version: quoteMath.pricingVersion,
      currency: 'USD',
      design_id: designId,
      variant_id: resolvedVariantId,
      configuration_id: configurationId ?? null,
      quantity,
      shipping_method: shippingMethod,
      recipient: mergedRecipient,
      quote_input_hash: quoteInputHash,
      printful_estimate: estimate.raw,
      printful_total_cost: quoteMath.printfulTotalCost,
      retail_total_amount: quoteMath.retailTotal,
      stripe_fee_est_amount: quoteMath.stripeFeeEst,
      refund_buffer_est_amount: quoteMath.refundBufferEst,
      profit_target_amount: quoteMath.profitTarget,
      profit_est_amount: quoteMath.profitEst,
      expires_at: expiresAt,
    })

    if (insErr) {
      console.error('quote: insert pricing_quotes failed', insErr)
      res.status(500).json({ error: 'Failed to persist quote' })
      return
    }

    res.status(200).json({
      quoteId: id,
      expiresAt,
      variantId: resolvedVariantId,
      printfulCosts: estimate.costs,
      retailTotal: quoteMath.retailTotal,
      printfulTotalCost: quoteMath.printfulTotalCost,
      breakdown: {
        stripeFeeEst: quoteMath.stripeFeeEst,
        refundBufferEst: quoteMath.refundBufferEst,
        profitTarget: quoteMath.profitTarget,
        profitEst: quoteMath.profitEst,
        grossMargin: quoteMath.grossMargin,
      },
      pricingVersion: quoteMath.pricingVersion,
      quoteInputHash,
    })
  } catch (e: any) {
    console.error('quote error', e)
    res.status(500).json({ error: e?.message || 'Quote failed' })
  }
}

function inferCategoryHint(product: { type: string; type_name: string; title: string; model?: string }): ProductCategoryHint {
  const descriptor = `${product.type} ${product.type_name} ${product.title} ${product.model || ''}`.toLowerCase()
  if (descriptor.includes('mug') || descriptor.includes('cup') || descriptor.includes('tumbler') || descriptor.includes('bottle')) {
    return 'drinkware'
  }
  if (descriptor.includes('hat') || descriptor.includes('cap') || descriptor.includes('beanie')) {
    return 'accessory'
  }
  if (descriptor.includes('poster') || descriptor.includes('canvas')) {
    return 'poster'
  }
  return 'apparel'
}
