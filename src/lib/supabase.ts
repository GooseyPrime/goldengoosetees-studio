import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null
let isConfigured = false
let initializationPromise: Promise<void> | null = null

// Environment variables (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseService = {
  initialize() {
    // Return existing promise if already initializing
    if (initializationPromise) return initializationPromise
    if (supabaseClient) return Promise.resolve()

    initializationPromise = new Promise<void>((resolve) => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Using mock mode.')
        isConfigured = false
        resolve()
        return
      }

      try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            // Automatically detect OAuth callback in URL
            detectSessionInUrl: true,
            // Persist session in localStorage
            persistSession: true,
            // Auto refresh token before expiry
            autoRefreshToken: true,
          }
        })
        isConfigured = true
        console.log('Supabase initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Supabase:', error)
        isConfigured = false
      }
      resolve()
    })

    return initializationPromise
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
    await this.initialize()
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabaseClient!.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // Request offline access for refresh tokens
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw error
    return data
  },

  async signUpWithEmail(email: string, password: string, name?: string) {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabaseClient!.auth.signUp({
      email,
      password,
      options: {
        data: name ? { full_name: name } : undefined
      }
    })

    if (error) throw error
    return data
  },

  async signInWithEmail(email: string, password: string) {
    if (!this.isConfigured()) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabaseClient!.auth.signInWithPassword({
      email,
      password
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
    // Initialize first if not done
    this.initialize()

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

    // Define user profile type for type safety
    type UserProfile = {
      id: string
      email: string
      name: string
      avatar: string | null
      age_verified: boolean
      role: string
      created_at: string
    } | null

    // First, check if user exists by ID
    let existingUserById: UserProfile = null
    try {
      const { data } = await supabaseClient!
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      existingUserById = data
    } catch {
      existingUserById = null
    }

    // Also check if user exists by email (for account linking)
    let existingUserByEmail: UserProfile = null
    if (user.email && !existingUserById) {
      try {
        const { data } = await supabaseClient!
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single()
        existingUserByEmail = data
      } catch {
        existingUserByEmail = null
      }
    }

    // Use existing user data if found (preserve history from linked account)
    const existingUser: UserProfile = existingUserById || existingUserByEmail

    // If there's an existing user by email with a different ID,
    // we need to link the accounts by updating the ID
    if (existingUserByEmail && existingUserByEmail.id !== user.id) {
      // Update the existing user record to use the new auth ID
      // This links the Google auth to the existing email account
      const { data: linkedData, error: linkError } = await supabaseClient!
        .from('users')
        .update({
          id: user.id,
          avatar: user.user_metadata?.avatar_url || existingUserByEmail.avatar,
          name: user.user_metadata?.full_name || existingUserByEmail.name,
        })
        .eq('email', user.email)
        .select()
        .single()

      if (!linkError && linkedData) {
        console.log('Account linked successfully:', user.email)
        return linkedData
      }
      // If update fails, fall through to create/upsert
    }

    const { data, error } = await supabaseClient!
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || existingUser?.name || user.email?.split('@')[0],
        avatar: user.user_metadata?.avatar_url || existingUser?.avatar,
        age_verified: existingUser?.age_verified ?? false,
        role: existingUser?.role ?? 'user',
        created_at: existingUser?.created_at ?? user.created_at,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getUserProfile(userId: string) {
    if (!this.isConfigured()) {
      return null
    }

    const { data, error } = await supabaseClient!
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateUserProfile(userId: string, updates: Record<string, any>) {
    if (!this.isConfigured()) {
      return null
    }

    const { data, error } = await supabaseClient!
      .from('users')
      .update(updates)
      .eq('id', userId)
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
