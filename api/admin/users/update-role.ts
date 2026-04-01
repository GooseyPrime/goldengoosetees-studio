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

    const { userId, role } = req.body

    if (!userId || !role) {
      res.status(400).json({ error: 'User ID and role are required' })
      return
    }

    // Validate role
    if (!['guest', 'user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be guest, user, or admin' })
      return
    }

    // Prevent self-demotion (admin can't remove their own admin role)
    if (adminUser.id === userId && role !== 'admin') {
      res.status(400).json({ error: 'Cannot remove your own admin role' })
      return
    }

    // Update user role
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'User not found' })
        return
      }
      throw error
    }

    // Log audit action
    await logAdminAction(
      adminUser.id,
      'update_user_role',
      'user',
      userId,
      { newRole: role, previousRole: data.role }
    )

    res.status(200).json({
      success: true,
      user: data
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to update user role'
    
    res.status(statusCode).json({ error: message })
  }
}
