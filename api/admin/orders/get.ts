import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
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

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        users:user_id (
          id,
          email,
          name
        ),
        designs:design_id (
          id,
          title,
          files
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      throw error
    }

    res.status(200).json({ order: data })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to get order'
    
    res.status(statusCode).json({ error: message })
  }
}


