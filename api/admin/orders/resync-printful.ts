import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
import { printfulServer } from '../../_lib/printful'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    await requireAdmin(req)

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Supabase not configured' })
      return
    }

    const { orderId } = req.body

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    // Get order from Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (!order.printful_order_id) {
      res.status(400).json({ error: 'Order does not have a Printful order ID' })
      return
    }

    // Get latest status from Printful
    const printfulOrder = await printfulServer.getOrder(order.printful_order_id)

    // Map Printful status to our order status
    let status = order.status
    if (printfulOrder.status === 'fulfilled') {
      status = 'fulfilled'
    } else if (printfulOrder.status === 'shipped') {
      status = 'shipped'
    } else if (printfulOrder.status === 'failed') {
      status = 'failed'
    } else if (printfulOrder.status === 'processing') {
      status = 'processing'
    }

    // Update order in Supabase
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Update tracking info if available
    if (printfulOrder.shipments && printfulOrder.shipments.length > 0) {
      const shipment = printfulOrder.shipments[0]
      updates.tracking_number = shipment.tracking_number
      updates.tracking_url = shipment.tracking_url
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    res.status(200).json({
      success: true,
      order: updatedOrder
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to sync with Printful'
    
    res.status(statusCode).json({ error: message })
  }
}
