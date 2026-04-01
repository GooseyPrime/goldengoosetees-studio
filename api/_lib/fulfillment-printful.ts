import { getSupabaseAdmin } from './supabase-server'
import { printfulServer } from './printful'
import { buildPrintfulItemsFromDesign } from './printful-order-build'
import type { PrintfulOrderRequest } from './printful'

/**
 * Create and confirm Printful order from a paid Supabase order row (service role).
 */
export async function fulfillPrintfulForPaidOrder(orderId: string): Promise<{
  printfulOrderId: string
  estimatedDelivery: string
}> {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Supabase admin not configured')

  const { data: order, error: oErr } = await admin.from('orders').select('*').eq('id', orderId).single()
  if (oErr || !order) throw new Error('Order not found')

  if (order.printful_order_id) {
    return {
      printfulOrderId: String(order.printful_order_id),
      estimatedDelivery:
        order.estimated_delivery || new Date(Date.now() + 7 * 864e5).toISOString(),
    }
  }

  const { data: designRow, error: dErr } = await admin
    .from('designs')
    .select('*')
    .eq('id', order.design_id)
    .single()
  if (dErr || !designRow) throw new Error('Design not found')

  let variantId: number | null = null
  if (order.pricing_quote_id) {
    const { data: quote } = await admin
      .from('pricing_quotes')
      .select('variant_id')
      .eq('id', order.pricing_quote_id)
      .single()
    if (quote?.variant_id != null) variantId = Number(quote.variant_id)
  }

  if (variantId == null || !Number.isFinite(variantId)) {
    const sku = Number(order.product_id)
    if (Number.isFinite(sku)) {
      const v = await printfulServer.getVariants(sku)
      variantId = v[0]?.id ?? null
    }
  }

  if (variantId == null || !Number.isFinite(variantId)) {
    throw new Error('Could not resolve Printful variant for order')
  }

  const { items } = await buildPrintfulItemsFromDesign({
    designRow: designRow as any,
    variantId,
    quantity: 1,
  })

  const addr = order.shipping_address as Record<string, string>
  const recipient: PrintfulOrderRequest['recipient'] = {
    name: addr.name || 'Customer',
    address1: addr.line1,
    address2: addr.line2,
    city: addr.city,
    state_code: addr.state,
    country_code: addr.country,
    zip: addr.postal_code,
    email: addr.email,
    phone: addr.phone,
  }

  const snap = order.pricing_snapshot as Record<string, any> | null
  const retailTotal = Number(order.total_amount)
  const retailSub = retailTotal

  const orderRequest: PrintfulOrderRequest = {
    recipient,
    items,
    retail_costs: {
      currency: order.currency || 'USD',
      subtotal: retailSub.toFixed(2),
      shipping: '0.00',
      tax: '0.00',
      discount: '0.00',
    },
  }

  if (snap?.printful_estimate?.costs) {
    const c = snap.printful_estimate.costs
    orderRequest.retail_costs = {
      currency: order.currency || 'USD',
      subtotal: String(c.subtotal ?? retailSub.toFixed(2)),
      shipping: String(c.shipping ?? '0.00'),
      tax: String(c.tax ?? c.vat ?? '0.00'),
      discount: String(c.discount ?? '0.00'),
    }
  }

  const created = await printfulServer.createOrder(orderRequest)
  await printfulServer.confirmOrder(created.id)
  const estimatedDelivery = await printfulServer.getEstimatedDelivery(recipient)

  return {
    printfulOrderId: String(created.id),
    estimatedDelivery,
  }
}
