import { User, Order, Design, Product, ChatMessage } from './types'
import { printfulService, PrintfulOrderRequest } from './printful'
import { stripeService } from './stripe'
import { supabaseService } from './supabase'
import { aiAgents } from './ai-agents'
import { kvService } from './kv'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

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

    async updateUserProfile(userId: string, updates: { ageVerified?: boolean; name?: string }) {
      if (supabaseService.isConfigured()) {
        try {
          await supabaseService.updateUserProfile(userId, {
            age_verified: updates.ageVerified,
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
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const order: Order = {
        id: `order-${Date.now()}`,
        userId: orderData.userId!,
        designId: orderData.designId!,
        productId: orderData.productId!,
        size: orderData.size || 'M',
        color: orderData.color || 'White',
        status: 'pending',
        totalAmount: orderData.totalAmount || 0,
        shippingAddress: orderData.shippingAddress!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await kvService.set(`order-${order.id}`, order)
      
      return order
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

      const order = await kvService.get<Order>(`order-${orderId}`)
      if (!order) {
        throw new Error('Order not found')
      }

      const paymentIntent = await stripeService.createPaymentIntent(order)

      const result = await stripeService.confirmCardPayment(
        paymentIntent.clientSecret,
        cardDetails,
        billingDetails
      )

      if (!result.success) {
        throw new Error(result.error || 'Payment failed')
      }

      const updatedOrder: Order = {
        ...order,
        stripePaymentId: result.paymentIntentId,
        updatedAt: new Date().toISOString()
      }

      await kvService.set(`order-${orderId}`, updatedOrder)

      return result.paymentIntentId!
    },
    
    async submitToPrintful(
      orderId: string, 
      design: Design, 
      product: Product
    ): Promise<{ printfulOrderId: string, estimatedDelivery: string, trackingUrl?: string }> {
      const order = await kvService.get<Order>(`order-${orderId}`)
      if (!order) {
        throw new Error('Order not found')
      }

      try {
        const printfulFiles = await Promise.all(
          design.files.map(file => 
            printfulService.convertDesignFileToPrintfulFile(file, product)
          )
        )

        const variantId = parseInt(product.printfulSKU) || 71

        const orderRequest: PrintfulOrderRequest = {
          recipient: {
            name: order.shippingAddress.name,
            address1: order.shippingAddress.line1,
            address2: order.shippingAddress.line2,
            city: order.shippingAddress.city,
            state_code: order.shippingAddress.state,
            country_code: order.shippingAddress.country,
            zip: order.shippingAddress.postal_code,
          },
          items: [
            {
              variant_id: variantId,
              quantity: 1,
              files: printfulFiles,
            }
          ],
        }

        const printfulOrder = await printfulService.createOrder(orderRequest)
        
        await printfulService.confirmOrder(printfulOrder.id)

        const estimatedDelivery = await printfulService.getEstimatedDelivery(
          orderRequest.recipient
        )

        const updatedOrder: Order = {
          ...order,
          printfulOrderId: printfulOrder.id.toString(),
          status: 'processing',
          estimatedDelivery,
          updatedAt: new Date().toISOString()
        }

        await kvService.set(`order-${orderId}`, updatedOrder)

        return {
          printfulOrderId: printfulOrder.id.toString(),
          estimatedDelivery,
          trackingUrl: printfulOrder.shipments?.[0]?.tracking_url
        }
      } catch (error) {
        console.error('Printful submission failed:', error)
        
        // In production, do not create mock orders
        // Failed orders should be persisted with error status for manual intervention
        // Mock orders are only allowed if explicitly enabled via server-side env var ALLOW_PRINTFUL_MOCK_ORDERS
        // This check happens server-side - client should never create mock orders
        
        // Update order status to failed
        const failedOrder: Order = {
          ...order,
          status: 'failed',
          updatedAt: new Date().toISOString()
        }
        
        await kvService.set(`order-${orderId}`, failedOrder)
        
        // Re-throw error so caller can handle it appropriately
        throw new Error(`Printful submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    
    async getByUser(userId: string): Promise<Order[]> {
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
    },

    async getById(orderId: string): Promise<Order | null> {
      await new Promise(resolve => setTimeout(resolve, 300))
      const withPrefix = await kvService.get<Order>(`order-${orderId}`)
      if (withPrefix) {
        return withPrefix
      }
      return await kvService.get<Order>(orderId)
    },

    async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
      const order = await kvService.get<Order>(`order-${orderId}`)
      if (order) {
        order.status = status
        order.updatedAt = new Date().toISOString()
        await kvService.set(`order-${orderId}`, order)
      }
    },

    async syncWithPrintful(orderId: string): Promise<Order | null> {
      const order = await kvService.get<Order>(`order-${orderId}`)
      if (!order || !order.printfulOrderId) {
        return null
      }

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

        const updatedOrder: Order = {
          ...order,
          status,
          trackingNumber: printfulOrder.shipments?.[0]?.tracking_number,
          updatedAt: new Date().toISOString()
        }

        await kvService.set(`order-${orderId}`, updatedOrder)
        return updatedOrder
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
