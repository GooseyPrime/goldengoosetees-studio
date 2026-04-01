/**
 * Admin audit logging helper
 * 
 * Logs all admin actions for security and compliance.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase not configured for audit logging')
}

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export interface AuditLogEntry {
  actor_user_id: string
  action: string
  target_type: string
  target_id?: string
  metadata?: any
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: any
): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Audit logging not configured, skipping log entry')
    return
  }

  try {
    const { error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        actor_user_id: actorUserId,
        action,
        target_type: targetType,
        target_id: targetId || null,
        metadata: metadata || null
      })

    if (error) {
      console.error('Failed to write audit log:', error)
      // Don't throw - audit logging failures shouldn't break the operation
    }
  } catch (error) {
    console.error('Error writing audit log:', error)
    // Don't throw - audit logging failures shouldn't break the operation
  }
}

