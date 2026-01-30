import { User, Order, Design, Product, ChatMessage } from './types'
import { printfulService, PrintfulOrderRequest } from './printful'
import { stripeService } from './stripe'
import { supabaseService } from './supabase'
import { aiAgents } from './ai-agents'
import { kvService } from './kv'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Map Supabase/API orders row (snake_case) to client Order type (exported for admin list mapping)
export function orderRowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    designId: row.design_id as string,
    productId: row.product_id as string,
    size: row.size as string,
    color: row.color as string,
    stripePaymentId: row.stripe_payment_id as string | undefined,
    stripeSessionId: row.stripe_session_id as string | undefined,
    printfulOrderId: row.printful_order_id as string | undefined,
    printfulExternalId: row.printful_external_id as string | undefined,
    status: row.status as Order['status'],
    totalAmount: Number(row.total_amount),
    shippingAddress: (row.shipping_address as Order['shippingAddress']) || {},
    trackingNumber: row.tracking_number as string | undefined,
    trackingUrl: row.tracking_url as string | undefined,
    estimatedDelivery:
      row.estimated_delivery != null
        ? typeof row.estimated_delivery === 'string'
          ? row.estimated_delivery
          : new Date(row.estimated_delivery as string).toISOString()
        : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

// Map client Order (partial) to Supabase row for insert/update
function orderToRow(order: Partial<Order>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (order.userId != null) row.user_id = order.userId
  if (order.designId != null) row.design_id = order.designId
  if (order.productId != null) row.product_id = order.productId
  if (order.size != null) row.size = order.size
  if (order.color != null) row.color = order.color
  if (order.status != null) row.status = order.status
  if (order.totalAmount != null) row.total_amount = order.totalAmount
  if (order.stripePaymentId != null) row.stripe_payment_id = order.stripePaymentId
  if (order.stripeSessionId != null) row.stripe_session_id = order.stripeSessionId
  if (order.printfulOrderId != null) row.printful_order_id = order.printfulOrderId
  if (order.printfulExternalId != null) row.printful_external_id = order.printfulExternalId
  if (order.shippingAddress != null) row.shipping_address = order.shippingAddress
  if (order.trackingNumber != null) row.tracking_number = order.trackingNumber
  if (order.trackingUrl != null) row.tracking_url = order.trackingUrl
  if (order.estimatedDelivery != null) row.estimated_delivery = order.estimatedDelivery
  return row
}

export const api = {
  auth: {
    async loginWithGoogle(): Promise<User> {
      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service not configured. Please contact support.')
      }

      try {
        const { url } = await supabaseService.signInWithGoogle()

        if (url) {
          // Redirect to Google OAuth - the auth state change listener will handle the callback
          window.location.href = url
          // This promise will never resolve as the page redirects
          return await new Promise(() => {})
        }

        // If we're here, we might be returning from OAuth - check session
        const supabaseUser = await supabaseService.getUser()
        if (supabaseUser) {
          const userData = await supabaseService.saveUser(supabaseUser)

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar,
            ageVerified: userData.age_verified || false,
            role: userData.role as 'guest' | 'user' | 'admin',
            createdAt: userData.created_at
          }

          return user
        }

        throw new Error('Authentication failed. Please try again.')
      } catch (error: any) {
        console.error('Google OAuth failed:', error)
        throw new Error(error?.message || 'Google authentication failed. Please try again.')
      }
    },

    async signUpWithEmail(email: string, password: string, name?: string): Promise<User> {
      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service not configured. Please contact support.')
      }

      try {
        const { user: supabaseUser } = await supabaseService.signUpWithEmail(email, password, name)
        if (!supabaseUser) {
          throw new Error('Sign up failed. Please try again.')
        }

        const userData = await supabaseService.saveUser(supabaseUser)
        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          ageVerified: userData.age_verified || false,
          role: userData.role as 'guest' | 'user' | 'admin',
          createdAt: userData.created_at
        }
      } catch (error: any) {
        console.error('Email sign-up failed:', error)
        // Provide user-friendly error messages
        if (error?.message?.includes('already registered')) {
          throw new Error('An account with this email already exists. Try signing in instead.')
        }
        if (error?.message?.includes('password')) {
          throw new Error('Password must be at least 6 characters long.')
        }
        throw new Error(error?.message || 'Sign up failed. Please try again.')
      }
    },

    async signInWithEmail(email: string, password: string): Promise<User> {
      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service not configured. Please contact support.')
      }

      try {
        const { user: supabaseUser } = await supabaseService.signInWithEmail(email, password)
        if (!supabaseUser) {
          throw new Error('Sign in failed. Please check your credentials.')
        }

        const userData = await supabaseService.saveUser(supabaseUser)
        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          ageVerified: userData.age_verified || false,
          role: userData.role as 'guest' | 'user' | 'admin',
          createdAt: userData.created_at
        }
      } catch (error: any) {
        console.error('Email sign-in failed:', error)
        // Provide user-friendly error messages
        if (error?.message?.includes('Invalid login')) {
          throw new Error('Invalid email or password. Please try again.')
        }
        if (error?.message?.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account first.')
        }
        throw new Error(error?.message || 'Sign in failed. Please try again.')
      }
    },
    
    async verifyAge(userId: string, verificationData: any): Promise<boolean> {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return true
    },

    async updateUserProfile(userId: string, updates: { ageVerified?: boolean; birthdate?: string; name?: string }) {
      if (supabaseService.isConfigured()) {
        try {
          await supabaseService.updateUserProfile(userId, {
            age_verified: updates.ageVerified,
            birthdate: updates.birthdate,
            name: updates.name
          })
        } catch (error) {
          console.error('Failed to update user profile:', error)
        }
      }
    },

    async getCurrentUser(): Promise<User | null> {
      if (supabaseService.isConfigured()) {
        try {
          const session = await supabaseService.getSession()
          if (session?.user) {
            const supabaseUser = session.user
            const userData = await supabaseService.saveUser(supabaseUser)
            
            return {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
              ageVerified: userData.age_verified || false,
              role: userData.role as 'guest' | 'user' | 'admin',
              createdAt: userData.created_at
            }
          }
        } catch (error) {
          console.error('Failed to get current user:', error)
        }
      }
      
      return null
    },

    async signOut(): Promise<void> {
      if (supabaseService.isConfigured()) {
        await supabaseService.signOut()
      }
    },

    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
      return supabaseService.onAuthStateChange(callback)
    }
  },
  
  designs: {
    async save(design: Partial<Design>): Promise<Design> {
      if (supabaseService.isConfigured()) {
        try {
          const designData = {
            id: design.id || `design-${Date.now()}`,
            user_id: design.userId,
            product_id: design.productId,
            files: design.files,
            is_public: design.isPublic || false,
            is_nsfw: design.isNSFW || false,
            title: design.title || 'Untitled Design',
            description: design.description,
            catalog_section: design.catalogSection,
            created_at: design.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const saved = await supabaseService.saveDesign(designData)
          
          return {
            id: saved.id,
            userId: saved.user_id,
            productId: saved.product_id,
            files: saved.files,
            isPublic: saved.is_public,
            isNSFW: saved.is_nsfw,
            title: saved.title,
            description: saved.description,
            catalogSection: saved.catalog_section,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at
          }
        } catch (error) {
          console.error('Failed to save to Supabase, using fallback:', error)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const savedDesign: Design = {
        id: `design-${Date.now()}`,
        userId: design.userId,
        productId: design.productId!,
        files: design.files || [],
        isPublic: design.isPublic || false,
        isNSFW: design.isNSFW || false,
        title: design.title || 'Untitled Design',
        description: design.description,
        catalogSection: design.catalogSection,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return savedDesign
    },
    
    async getByUser(userId: string): Promise<Design[]> {
      if (supabaseService.isConfigured()) {
        try {
          const designs = await supabaseService.getDesignsByUser(userId)
          return designs.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            productId: d.product_id,
            files: d.files,
            isPublic: d.is_public,
            isNSFW: d.is_nsfw,
            title: d.title,
            description: d.description,
            catalogSection: d.catalog_section,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }))
        } catch (error) {
          console.error('Failed to get designs from Supabase:', error)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
    },
    
    async getCatalog(section?: string): Promise<Design[]> {
      if (supabaseService.isConfigured()) {
        try {
          const designs = await supabaseService.getCatalogDesigns(section)
          return designs.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            productId: d.product_id,
            files: d.files,
            isPublic: d.is_public,
            isNSFW: d.is_nsfw,
            title: d.title,
            description: d.description,
            catalogSection: d.catalog_section,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }))
        } catch (error) {
          console.error('Failed to get catalog from Supabase:', error)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
    }
  },
  
  orders: {
    async create(orderData: Partial<Order>): Promise<Order> {
      if (!supabaseService.isConfigured()) {
        throw new Error('Order service not configured. Please contact support.')
      }

      const row = orderToRow({
        ...orderData,
        status: 'pending',
        size: orderData.size || 'M',
        color: orderData.color || 'White',
        totalAmount: orderData.totalAmount ?? 0,
        shippingAddress: orderData.shippingAddress!
      })
      const inserted = await supabaseService.saveOrder(row)
      return orderRowToOrder(inserted as Record<string, unknown>)
    },

    async processPayment(
      orderId: string,
      cardDetails: {
        number: string
        exp_month: number
        exp_year: number
        cvc: string
      },
      billingDetails: {
        name: string
        email: string
        address?: {
          line1: string
          line2?: string
          city: string
          state: string
          postal_code: string
          country: string
        }
      }
    ): Promise<string> {
      await stripeService.initialize()

      if (!stripeService.isConfigured()) {
        throw new Error('Stripe is not configured. Please contact support.')
      }

      const row = await supabaseService.getOrderById(orderId)
      if (!row) {
        throw new Error('Order not found')
      }
      const order = orderRowToOrder(row as Record<string, unknown>)

      const paymentIntent = await stripeService.createPaymentIntent(order)

      const result = await stripeService.confirmCardPayment(
        paymentIntent.clientSecret,
        cardDetails,
        billingDetails
      )

      if (!result.success) {
        throw new Error(result.error || 'Payment failed')
      }

      if (supabaseService.isConfigured()) {
        await supabaseService.updateOrder(orderId, {
          stripe_payment_id: result.paymentIntentId,
          updated_at: new Date().toISOString()
        })
      }

      return result.paymentIntentId!
    },

    async submitToPrintful(
      orderId: string,
      design: Design,
      product: Product
    ): Promise<{ printfulOrderId: string; estimatedDelivery: string; trackingUrl?: string }> {
      const row = await supabaseService.getOrderById(orderId)
      if (!row) {
        throw new Error('Order not found')
      }
      const orderObj = orderRowToOrder(row as Record<string, unknown>)

      try {
        const printfulFiles = await Promise.all(
          design.files.map(file =>
            printfulService.convertDesignFileToPrintfulFile(file, product)
          )
        )

        const variantId = parseInt(product.printfulSKU) || 71

        const orderRequest: PrintfulOrderRequest = {
          recipient: {
            name: orderObj.shippingAddress.name,
            address1: orderObj.shippingAddress.line1,
            address2: orderObj.shippingAddress.line2,
            city: orderObj.shippingAddress.city,
            state_code: orderObj.shippingAddress.state,
            country_code: orderObj.shippingAddress.country,
            zip: orderObj.shippingAddress.postal_code
          },
          items: [
            {
              variant_id: variantId,
              quantity: 1,
              files: printfulFiles
            }
          ]
        }

        const printfulOrder = await printfulService.createOrder(orderRequest)

        await printfulService.confirmOrder(printfulOrder.id)

        const estimatedDelivery = await printfulService.getEstimatedDelivery(
          orderRequest.recipient
        )

        if (supabaseService.isConfigured()) {
          await supabaseService.updateOrder(orderId, {
            printful_order_id: printfulOrder.id.toString(),
            status: 'processing',
            estimated_delivery: estimatedDelivery,
            updated_at: new Date().toISOString()
          })
        }

        return {
          printfulOrderId: printfulOrder.id.toString(),
          estimatedDelivery,
          trackingUrl: printfulOrder.shipments?.[0]?.tracking_url
        }
      } catch (error) {
        console.error('Printful submission failed:', error)
        if (supabaseService.isConfigured()) {
          await supabaseService.updateOrder(orderId, {
            status: 'failed' as const,
            updated_at: new Date().toISOString()
          })
        }
        throw new Error(
          `Printful submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    },

    async getByUser(userId: string): Promise<Order[]> {
      if (!supabaseService.isConfigured()) {
        return []
      }
      const rows = await supabaseService.getOrdersByUser(userId)
      return (rows as Record<string, unknown>[]).map(r => orderRowToOrder(r))
    },

    async getById(orderId: string): Promise<Order | null> {
      if (!supabaseService.isConfigured()) {
        return null
      }
      const row = await supabaseService.getOrderById(orderId)
      if (!row) return null
      return orderRowToOrder(row as Record<string, unknown>)
    },

    async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
      if (!supabaseService.isConfigured()) return
      await supabaseService.updateOrder(orderId, {
        status,
        updated_at: new Date().toISOString()
      })
    },

    async syncWithPrintful(orderId: string): Promise<Order | null> {
      const row = await supabaseService.getOrderById(orderId)
      if (!row) return null
      const order = orderRowToOrder(row as Record<string, unknown>)
      if (!order.printfulOrderId) return null

      try {
        const printfulOrder = await printfulService.getOrder(order.printfulOrderId)

        let status: Order['status'] = order.status
        if (printfulOrder.status === 'fulfilled') {
          status = 'fulfilled'
        } else if (printfulOrder.status === 'shipped') {
          status = 'shipped'
        } else if (printfulOrder.status === 'failed') {
          status = 'failed'
        }

        const updates: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString()
        }
        if (printfulOrder.shipments?.[0]?.tracking_number) {
          updates.tracking_number = printfulOrder.shipments[0].tracking_number
        }

        if (supabaseService.isConfigured()) {
          await supabaseService.updateOrder(orderId, updates)
        }
        return {
          ...order,
          status,
          trackingNumber: (updates.tracking_number as string) ?? order.trackingNumber,
          updatedAt: updates.updated_at as string
        }
      } catch (error) {
        console.error('Failed to sync with Printful:', error)
        return order
      }
    }
  },
  
  ai: {
    async generateDesign(prompt: string, constraints: any, user: User | null): Promise<string> {
      // Image generation: Gemini is primary, OpenAI is fallback.
      if (!aiAgents.hasGemini() && !aiAgents.hasOpenAI()) {
        throw new Error('Image generation service not configured. Please set up Gemini (preferred) or OpenAI as fallback.')
      }

      const hasOpenRouter = aiAgents.hasOpenRouter()

      // Content moderation check (skip if OpenRouter not configured)
      if (hasOpenRouter) {
        const moderationResult = await aiAgents.contentModerator.moderate(prompt, user)

        if (!moderationResult.approved) {
          throw new Error(
            `Content not approved: ${moderationResult.violations.join(', ')}. ${
              moderationResult.suggestions?.length
                ? `Try: ${moderationResult.suggestions[0]}`
                : ''
            }`
          )
        }

        // IP/Copyright check
        const ipResult = await aiAgents.ipChecker.check(prompt)

        if (ipResult.hasViolation && ipResult.riskLevel === 'high') {
          throw new Error(
            `Potential trademark/copyright issue detected: ${ipResult.detectedItems.join(', ')}. ${
              ipResult.recommendations?.length
                ? `Try: ${ipResult.recommendations[0]}`
                : ''
            }`
          )
        }
      }

      // Generate with DALL-E 3
      return await aiAgents.designGenerator.generate(prompt, constraints)
    },
    
    async chat(
      messages: ChatMessage[], 
      product?: Product,
      currentPrintArea?: string,
      user?: User | null
    ): Promise<string> {
      if (!product || !currentPrintArea) {
        return "Please select a product first to start designing!"
      }

      try {
        const response = await aiAgents.designAssistant.chat(
          messages,
          product,
          currentPrintArea,
          user || null
        )
        
        return response
      } catch (error) {
        console.error('LLM chat failed:', error)
        
        return "I'm having trouble connecting right now. Could you try rephrasing that? I'm here to help you create an awesome design! 🎨"
      }
    },

    shouldGenerateDesign(message: string): boolean {
      return aiAgents.designAssistant.detectGenerationIntent(message)
    },

    shouldShowApproval(message: string): boolean {
      return aiAgents.designAssistant.detectApprovalIntent(message)
    },

    async getInitialMessage(product: Product): Promise<string> {
      return await aiAgents.designAssistant.getInitialMessage(product)
    },

    async getApprovalMessage(): Promise<string> {
      return await aiAgents.designAssistant.getApprovalMessage()
    },

    async editDesign(
      currentImageUrl: string,
      editPrompt: string,
      constraints: any
    ): Promise<string> {
      // Prefer Gemini for editing; fallback to OpenAI when available.
      if (!aiAgents.hasGemini() && !aiAgents.hasOpenAI()) {
        throw new Error('Image editing service not configured. Please set up Gemini (preferred) or OpenAI as fallback.')
      }

      return await aiAgents.designGenerator.edit(currentImageUrl, editPrompt)
    },

    async removeBackground(imageDataUrl: string): Promise<string> {
      // Prefer Gemini for background removal; fallback to OpenAI when available.
      if (!aiAgents.hasGemini() && !aiAgents.hasOpenAI()) {
        throw new Error('Background removal service not configured. Please set up Gemini (preferred) or OpenAI as fallback.')
      }

      return await aiAgents.designGenerator.removeBackground(imageDataUrl)
    }
  }
}
