import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_lib/auth'
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
  if (req.method !== 'GET') {
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

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Orders today
    const { count: ordersToday } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .is('deleted_at', null)

    // Orders last 7 days
    const { count: ordersLast7Days } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
      .is('deleted_at', null)

    // Revenue today
    const { data: revenueTodayData } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .gte('created_at', todayStart.toISOString())
      .is('deleted_at', null)

    const revenueToday = (revenueTodayData || []).reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || 0)
    }, 0)

    // Revenue last 7 days
    const { data: revenueLast7DaysData } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .gte('created_at', sevenDaysAgo.toISOString())
      .is('deleted_at', null)

    const revenueLast7Days = (revenueLast7DaysData || []).reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || 0)
    }, 0)

    // Counts by status
    const { data: ordersByStatus } = await supabaseAdmin
      .from('orders')
      .select('status')
      .is('deleted_at', null)

    const statusCounts: Record<string, number> = {}
    ;(ordersByStatus || []).forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
    })

    // Printful orders missing tracking
    const { count: missingTracking } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .not('printful_order_id', 'is', null)
      .is('tracking_number', null)
      .in('status', ['processing', 'fulfilled', 'shipped'])
      .is('deleted_at', null)

    // Failures last 24h
    const { count: failuresLast24h } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .is('deleted_at', null)

    res.status(200).json({
      orders: {
        today: ordersToday || 0,
        last7Days: ordersLast7Days || 0
      },
      revenue: {
        today: revenueToday,
        last7Days: revenueLast7Days
      },
      statusCounts,
      printful: {
        missingTracking: missingTracking || 0
      },
      failures: {
        last24h: failuresLast24h || 0
      }
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to get metrics'
    
    res.status(statusCode).json({ error: message })
  }
}

