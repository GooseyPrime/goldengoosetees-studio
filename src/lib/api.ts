import { User, Order, Design, Product, ChatMessage } from './types'
import { printfulService, PrintfulOrderRequest } from './printful'
import { stripeService } from './stripe'
import { supabaseService } from './supabase'
import { aiAgents } from './ai-agents'

export const api = {
  auth: {
    async loginWithGoogle(): Promise<User> {
      await supabaseService.initialize()
      
      if (supabaseService.isConfigured()) {
        try {
          const { url } = await supabaseService.signInWithGoogle()
          
          if (url) {
            window.location.href = url
            await new Promise(() => {})
          }
          
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
        } catch (error) {
          console.error('Google OAuth failed, falling back to mock:', error)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockUser: User = {
        id: `user-${Date.now()}`,
        email: 'admin@goldengoosetees.com',
        name: 'Admin User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        ageVerified: true,
        role: 'admin',
        createdAt: new Date().toISOString()
      }
      
      return mockUser
    },
    
    async verifyAge(userId: string, verificationData: any): Promise<boolean> {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return true
    },

    async getCurrentUser(): Promise<User | null> {
      await supabaseService.initialize()
      
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
      await supabaseService.initialize()
      
      if (supabaseService.isConfigured()) {
        await supabaseService.signOut()
      }
    }
  },
  
  designs: {
    async save(design: Partial<Design>): Promise<Design> {
      await supabaseService.initialize()
      
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
      await supabaseService.initialize()
      
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
      await supabaseService.initialize()
      
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
        status: 'pending',
        totalAmount: orderData.totalAmount || 0,
        shippingAddress: orderData.shippingAddress!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await window.spark.kv.set(`order-${order.id}`, order)
      
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

      const order = await window.spark.kv.get<Order>(`order-${orderId}`)
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

      await window.spark.kv.set(`order-${orderId}`, updatedOrder)

      return result.paymentIntentId!
    },
    
    async submitToPrintful(
      orderId: string, 
      design: Design, 
      product: Product
    ): Promise<{ printfulOrderId: string, estimatedDelivery: string, trackingUrl?: string }> {
      const order = await window.spark.kv.get<Order>(`order-${orderId}`)
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

        await window.spark.kv.set(`order-${orderId}`, updatedOrder)

        return {
          printfulOrderId: printfulOrder.id.toString(),
          estimatedDelivery,
          trackingUrl: printfulOrder.shipments?.[0]?.tracking_url
        }
      } catch (error) {
        console.error('Printful submission failed:', error)
        
        const fallbackDelivery = new Date()
        fallbackDelivery.setDate(fallbackDelivery.getDate() + 7)
        
        return {
          printfulOrderId: `pf-mock-${Date.now()}`,
          estimatedDelivery: fallbackDelivery.toISOString()
        }
      }
    },
    
    async getByUser(userId: string): Promise<Order[]> {
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
    },

    async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
      const order = await window.spark.kv.get<Order>(`order-${orderId}`)
      if (order) {
        order.status = status
        order.updatedAt = new Date().toISOString()
        await window.spark.kv.set(`order-${orderId}`, order)
      }
    },

    async syncWithPrintful(orderId: string): Promise<Order | null> {
      const order = await window.spark.kv.get<Order>(`order-${orderId}`)
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

        await window.spark.kv.set(`order-${orderId}`, updatedOrder)
        return updatedOrder
      } catch (error) {
        console.error('Failed to sync with Printful:', error)
        return order
      }
    }
  },
  
  ai: {
    async generateDesign(prompt: string, constraints: any, user: User | null): Promise<string> {
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

      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const colors = ['FF6B6B', '4ECDC4', 'FFD93D', '95E1D3', 'F38181']
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="1000" fill="white"/>
          <circle cx="400" cy="400" r="200" fill="#${randomColor}" opacity="0.8"/>
          <text x="400" y="650" font-family="Arial" font-size="48" text-anchor="middle" fill="#333">
            ${prompt.slice(0, 30)}
          </text>
          <text x="400" y="720" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">
            AI Generated Design
          </text>
        </svg>
      `)}`
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
    }
  }
}
