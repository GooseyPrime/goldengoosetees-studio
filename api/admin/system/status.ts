import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
import { createClient } from '@supabase/supabase-js'
import { printfulServer } from '../../_lib/printful'

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

async function checkSupabase(): Promise<{ status: 'ok' | 'error', message: string }> {
  if (!supabaseAdmin) {
    return { status: 'error', message: 'Supabase not configured' }
  }

  try {
    const { error } = await supabaseAdmin.from('users').select('count').limit(1)
    if (error) {
      return { status: 'error', message: `Connection failed: ${error.message}` }
    }
    return { status: 'ok', message: 'Connected' }
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Connection failed' }
  }
}

async function checkStripe(): Promise<{ status: 'ok' | 'error', message: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey && !publishableKey) {
    return { status: 'error', message: 'Stripe not configured' }
  }

  const missing = []
  if (!secretKey) missing.push('STRIPE_SECRET_KEY')
  if (!publishableKey) missing.push('VITE_STRIPE_PUBLISHABLE_KEY')
  if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET')

  if (missing.length > 0) {
    return { status: 'error', message: `Missing: ${missing.join(', ')}` }
  }

  return { status: 'ok', message: 'Configured' }
}

async function checkPrintful(): Promise<{ status: 'ok' | 'error', message: string }> {
  if (!printfulServer.isConfigured()) {
    return { status: 'error', message: 'Printful API key not configured' }
  }

  try {
    await printfulServer.getProducts()
    return { status: 'ok', message: 'Connected' }
  } catch (error: any) {
    return { status: 'error', message: `Connection failed: ${error.message}` }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Require admin authentication
    await requireAdmin(req)

    // Check all services in parallel
    const [supabase, stripe, printful] = await Promise.all([
      checkSupabase(),
      checkStripe(),
      checkPrintful()
    ])

    res.status(200).json({
      services: {
        supabase,
        stripe,
        printful
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Failed to get system status'
    
    res.status(statusCode).json({ error: message })
  }
}
