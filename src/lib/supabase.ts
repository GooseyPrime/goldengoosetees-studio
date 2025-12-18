import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null
let isConfigured = false

// Environment variables (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseService = {
  initialize() {
    if (supabaseClient) return

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Using mock mode.')
      isConfigured = false
      return
    }

    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
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

  // ==========================================
  // Supabase Storage Functions
  // ==========================================

  async uploadDesignFile(
    userId: string,
    designId: string,
    fileData: string, // base64 data URL
    filename: string
  ): Promise<{ url: string; path: string }> {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    // Extract base64 data from data URL
    const base64Data = fileData.split(',')[1]
    if (!base64Data) {
      throw new Error('Invalid file data')
    }

    // Determine content type
    const contentTypeMatch = fileData.match(/data:([^;]+);/)
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png'

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })

    // Upload to Storage
    const filePath = `${userId}/${designId}/${filename}`

    const { data, error } = await supabaseClient!.storage
      .from('designs')
      .upload(filePath, blob, {
        contentType,
        upsert: true
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabaseClient!.storage
      .from('designs')
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path
    }
  },

  async getDesignFileUrl(path: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    const { data: { publicUrl } } = supabaseClient!.storage
      .from('designs')
      .getPublicUrl(path)

    return publicUrl
  },

  async deleteDesignFile(path: string): Promise<void> {
    if (!this.isConfigured()) {
      return
    }

    const { error } = await supabaseClient!.storage
      .from('designs')
      .remove([path])

    if (error) throw error
  },

  async listUserDesignFiles(userId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      return []
    }

    const { data, error } = await supabaseClient!.storage
      .from('designs')
      .list(userId)

    if (error) throw error
    return data || []
  },

  // ==========================================
  // Admin/Analytics Functions (for Admin Agent)
  // ==========================================

  async getOrdersCount(): Promise<number> {
    if (!this.isConfigured()) return 0

    const { count, error } = await supabaseClient!
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (error) return 0
    return count || 0
  },

  async getDesignsCount(): Promise<number> {
    if (!this.isConfigured()) return 0

    const { count, error } = await supabaseClient!
      .from('designs')
      .select('*', { count: 'exact', head: true })

    if (error) return 0
    return count || 0
  },

  async getRecentOrders(limit: number = 10): Promise<any[]> {
    if (!this.isConfigured()) return []

    const { data, error } = await supabaseClient!
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  },

  async getTotalRevenue(): Promise<number> {
    if (!this.isConfigured()) return 0

    const { data, error } = await supabaseClient!
      .from('orders')
      .select('total_amount')
      .in('status', ['fulfilled', 'shipped', 'delivered'])

    if (error) return 0
    return data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
  },

  async getOrdersByStatus(): Promise<Record<string, number>> {
    if (!this.isConfigured()) return {}

    const { data, error } = await supabaseClient!
      .from('orders')
      .select('status')

    if (error) return {}

    const counts: Record<string, number> = {}
    data?.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1
    })
    return counts
  }
}
