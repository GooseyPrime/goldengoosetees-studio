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
): Promise<void> {
  if (req.method !== 'POST') {
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

    const { userId, reason } = req.body

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' })
      return
    }

    // Prevent self-disable
    if (adminUser.id === userId) {
      res.status(400).json({ error: 'Cannot disable your own account' })
      return
    }

    // Check if disabled_at column exists (optional feature)
    // For now, we'll use a metadata field or just log the action
    // In a full implementation, you'd add disabled_at column to users table

    // Log audit action
    await logAdminAction(
      adminUser.id,
      'disable_user',
      'user',
      userId,
      { reason: reason || null }
    )

    // Note: Actual user disabling would require adding disabled_at column
    // and enforcing it in auth checks. For now, we just log the action.
    res.status(200).json({
      success: true,
      message: 'User disable action logged. Add disabled_at column to users table to enable full functionality.'
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to disable user'
    
    res.status(statusCode).json({ error: message })
  }
}
