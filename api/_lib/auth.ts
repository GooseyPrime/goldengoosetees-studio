/**
 * Admin authentication helper for Vercel serverless functions
 * 
 * Verifies Supabase JWT tokens and ensures the user has admin role.
 */

import type { VercelRequest } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase not configured for admin auth. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

/**
 * Extract and verify admin user from request
 * 
 * @param req Vercel request object
 * @returns Admin user object
 * @throws Error with status code if not authorized
 */
export async function requireAdmin(req: VercelRequest) {
  if (!supabaseAdmin) {
    throw new Error('Admin authentication not configured')
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error: any = new Error('Unauthorized: Missing or invalid authorization header')
    error.statusCode = 401
    throw error
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      const error: any = new Error('Unauthorized: Invalid token')
      error.statusCode = 401
      throw error
    }

    // Check user role in public.profiles table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      const error: any = new Error('Unauthorized: User not found')
      error.statusCode = 401
      throw error
    }

    // Verify admin role
    if (userData.role !== 'admin') {
      const error: any = new Error('Forbidden: Admin access required')
      error.statusCode = 403
      throw error
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role
    }
  } catch (error: any) {
    // Re-throw with status code if it already has one
    if (error.statusCode) {
      throw error
    }
    // Otherwise wrap in a generic error
    const authError: any = new Error('Unauthorized: Authentication failed')
    authError.statusCode = 401
    authError.originalError = error
    throw authError
  }
}

/**
 * Get current user from request (non-admin, for general auth)
 */
export async function requireAuth(req: VercelRequest) {
  if (!supabaseAdmin) {
    throw new Error('Authentication not configured')
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error: any = new Error('Unauthorized: Missing authorization header')
    error.statusCode = 401
    throw error
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    const error: any = new Error('Unauthorized: Invalid token')
    error.statusCode = 401
    throw error
  }

  return user
}


