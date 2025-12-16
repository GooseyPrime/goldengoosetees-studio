import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null
let isConfigured = false

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export const supabaseService = {
  async initialize() {
    if (supabaseClient) return

    const config = await window.spark.kv.get<SupabaseConfig>('supabase-config')
    
    if (!config?.url || !config?.anonKey) {
      console.warn('Supabase not configured. Using mock mode.')
      isConfigured = false
      return
    }

    try {
      supabaseClient = createClient(config.url, config.anonKey)
      isConfigured = true
      console.log('Supabase initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Supabase:', error)
      isConfigured = false
    }
  },

  isConfigured() {
    return isConfigured && supabaseClient !== null
  },

  getClient() {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized')
    }
    return supabaseClient
  },

  async signInWithGoogle() {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabaseClient!.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) throw error
    return data
  },

  async signOut() {
    if (!this.isConfigured()) {
      return
    }

    const { error } = await supabaseClient!.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    if (!this.isConfigured()) {
      return null
    }

    const { data: { session }, error } = await supabaseClient!.auth.getSession()
    if (error) throw error
    return session
  },

  async getUser() {
    if (!this.isConfigured()) {
      return null
    }

    const { data: { user }, error } = await supabaseClient!.auth.getUser()
    if (error) throw error
    return user
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!this.isConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }

    return supabaseClient!.auth.onAuthStateChange(callback)
  },

  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      const { error } = await supabaseClient!.from('users').select('count').limit(1)
      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        return { success: true, needsSetup: true }
      }
      return { success: true, needsSetup: false }
    } catch (error: any) {
      throw new Error(error.message || 'Connection test failed')
    }
  },

  async saveUser(user: any) {
    if (!this.isConfigured()) {
      return user
    }

    const { data, error } = await supabaseClient!
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar: user.user_metadata?.avatar_url,
        age_verified: false,
        role: 'user',
        created_at: user.created_at,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async saveDesign(design: any) {
    if (!this.isConfigured()) {
      return design
    }

    const { data, error } = await supabaseClient!
      .from('designs')
      .insert(design)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getDesignsByUser(userId: string) {
    if (!this.isConfigured()) {
      return []
    }

    const { data, error } = await supabaseClient!
      .from('designs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getCatalogDesigns(section?: string) {
    if (!this.isConfigured()) {
      return []
    }

    let query = supabaseClient!
      .from('designs')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (section) {
      query = query.eq('catalog_section', section)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async saveOrder(order: any) {
    if (!this.isConfigured()) {
      return order
    }

    const { data, error } = await supabaseClient!
      .from('orders')
      .insert(order)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateOrder(orderId: string, updates: any) {
    if (!this.isConfigured()) {
      return
    }

    const { error } = await supabaseClient!
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (error) throw error
  },

  async getOrdersByUser(userId: string) {
    if (!this.isConfigured()) {
      return []
    }

    const { data, error } = await supabaseClient!
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}
