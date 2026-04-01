/**
 * Application Configuration Management
 * Stores and retrieves app config from Supabase app_config table
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Check if Supabase is configured
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY

// Create Supabase client with service role for server-side operations
// Use placeholder values if not configured to avoid client creation errors
const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export interface AppConfig {
  conversational_provider?: 'gemini' | 'openai' | 'openrouter'
  conversational_model_id?: string
  image_model_primary?: string
  image_model_fallback?: string
  openrouter_enabled?: boolean
  alert_email?: string
  alert_phone?: string
  alert_system_errors?: boolean
  alert_rate_limiting?: boolean
  alert_ai_failures?: boolean
  alert_payment_orders?: boolean
  alert_external_services?: boolean
  [key: string]: unknown
}

/**
 * Get the application configuration
 * Returns default values if config table doesn't exist or is empty
 */
export async function getAppConfig(): Promise<AppConfig> {
  // If Supabase is not configured, return defaults immediately
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, using default app config')
    return getDefaultConfig()
  }

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // If table doesn't exist or no data, return defaults
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('app_config table not found, using defaults')
        return getDefaultConfig()
      }
      throw error
    }

    return data || getDefaultConfig()
  } catch (error: any) {
    console.warn('Failed to fetch app config:', error.message)
    return getDefaultConfig()
  }
}

/**
 * Update application configuration
 * Creates or updates the config row
 */
export async function setAppConfig(updates: Partial<AppConfig>): Promise<void> {
  // If Supabase is not configured, throw error
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured - cannot update app config')
  }

  try {
    // First, try to get existing config
    const { data: existing } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single()

    if (existing) {
      // Update existing config (updated_at is handled by trigger)
      const { error } = await supabase
        .from('app_config')
        .update(updates)
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Insert new config (timestamps are handled by database defaults)
      const { error } = await supabase
        .from('app_config')
        .insert(updates)

      if (error) throw error
    }
  } catch (error: any) {
    console.error('Failed to update app config:', error.message)
    throw new Error(`Failed to update configuration: ${error.message}`)
  }
}

/**
 * Get default configuration values
 */
function getDefaultConfig(): AppConfig {
  return {
    conversational_provider: 'gemini',
    conversational_model_id: 'gemini-2.0-flash',
    image_model_primary: 'gemini-2.0-flash-exp-image-generation',
    image_model_fallback: 'gemini-2.0-flash-exp',
    openrouter_enabled: false,
    alert_email: process.env.MAILJET_EMAIL_FROM || '',
    alert_phone: '',
    alert_system_errors: true,
    alert_rate_limiting: true,
    alert_ai_failures: true,
    alert_payment_orders: true,
    alert_external_services: true,
  }
}

