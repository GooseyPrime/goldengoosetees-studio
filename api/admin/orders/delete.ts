import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
import { logAdminAction } from '../../_lib/audit'
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
): Promise<void | VercelResponse> {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    const adminUser = await requireAdmin(req)

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Supabase not configured' })
      return
    }

    const { orderId, reason } = req.body

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    // Soft delete the order
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminUser.id,
        delete_reason: reason || null
      })
      .eq('id', orderId)
      .is('deleted_at', null) // Only update if not already deleted
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Order not found or already deleted' })
        return
      }
      throw error
    }

    // Log audit action
    await logAdminAction(
      adminUser.id,
      'delete_order',
      'order',
      orderId,
      { reason: reason || null }
    )

    res.status(200).json({
      success: true,
      order: data
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to delete order'
    
    res.status(statusCode).json({ error: message })
  }
}
