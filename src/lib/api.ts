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
      await supabaseService.initialize()
      
      if (supabaseService.isConfigured()) {
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
        } catch (error) {
          console.error('Google OAuth failed:', error)
          throw new Error('Google authentication failed. Please try again.')
        }
      }
      
      throw new Error('Supabase not configured. Please check your environment variables.')
    },

    async signUpWithEmail(email: string, password: string, name?: string): Promise<User> {
      await supabaseService.initialize()

      if (supabaseService.isConfigured()) {
        try {
          const { user: supabaseUser } = await supabaseService.signUpWithEmail(email, password, name)
          if (supabaseUser) {
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
          console.error('Email sign-up failed, falling back to mock:', error)
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        id: `user-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
        ageVerified: false,
        role: 'user',
        createdAt: new Date().toISOString()
      }
    },

    async signInWithEmail(email: string, password: string): Promise<User> {
      await supabaseService.initialize()

      if (supabaseService.isConfigured()) {
        try {
          const { user: supabaseUser } = await supabaseService.signInWithEmail(email, password)
          if (supabaseUser) {
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
          console.error('Email sign-in failed, falling back to mock:', error)
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
        ageVerified: false,
        role: 'user',
        createdAt: new Date().toISOString()
      }
    },
    
    async verifyAge(userId: string, verificationData: any): Promise<boolean> {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return true
    },

    async updateUserProfile(userId: string, updates: { ageVerified?: boolean; name?: string }) {
      await supabaseService.initialize()
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
    },

    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
      return supabaseService.onAuthStateChange(callback)
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
      // Content moderation check
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

      // Generate with DALL-E 3 if configured, otherwise use fallback
      if (aiAgents.hasOpenAI()) {
        try {
          return await aiAgents.designGenerator.generate(prompt, constraints)
        } catch (error) {
          console.error('DALL-E generation failed, using fallback:', error)
        }
      }

      // Fallback to mock SVG if DALL-E not available
      console.warn('OpenAI not configured. Using mock design generation.')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate a more visually interesting mock design based on the prompt
      const generateMockDesign = (designPrompt: string): string => {
        const colors = {
          primary: ['FF6B6B', '4ECDC4', 'FFD93D', '95E1D3', 'F38181', '6C5CE7', 'A8E6CF', 'FF8C94'],
          secondary: ['333333', '2D3436', '636E72', '74B9FF', 'FD79A8', 'FDCB6E']
        }
        const primaryColor = colors.primary[Math.floor(Math.random() * colors.primary.length)]
        const secondaryColor = colors.secondary[Math.floor(Math.random() * colors.secondary.length)]
        const accentColor = colors.primary[Math.floor(Math.random() * colors.primary.length)]

        // Extract key elements from prompt for display
        const promptLower = designPrompt.toLowerCase()
        const extractedText = designPrompt.match(/"([^"]+)"/)?.[1] ||
                             designPrompt.match(/text[:\s]+([^,\.]+)/i)?.[1] ||
                             ''
        const displayText = extractedText.slice(0, 20).toUpperCase() || designPrompt.slice(0, 25).toUpperCase()

        // Determine style based on keywords
        const isRetro = promptLower.includes('retro') || promptLower.includes('vintage')
        const isMinimal = promptLower.includes('minimal') || promptLower.includes('simple')
        const isWestern = promptLower.includes('western') || promptLower.includes('cowboy') || promptLower.includes('rodeo')
        const hasCircle = promptLower.includes('circle') || promptLower.includes('sun') || promptLower.includes('moon')

        let svgContent = ''

        if (isWestern) {
          // Western/Rodeo style mock
          svgContent = `
            <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="1000" fill="#FDF6E3"/>
              <rect x="100" y="150" width="600" height="700" rx="20" fill="#${primaryColor}" opacity="0.15"/>
              <rect x="120" y="170" width="560" height="660" rx="15" fill="none" stroke="#${secondaryColor}" stroke-width="4"/>
              <rect x="140" y="190" width="520" height="620" rx="10" fill="none" stroke="#${secondaryColor}" stroke-width="2"/>

              <!-- Star decorations -->
              <polygon points="200,250 210,280 240,280 215,300 225,330 200,310 175,330 185,300 160,280 190,280" fill="#${accentColor}"/>
              <polygon points="600,250 610,280 640,280 615,300 625,330 600,310 575,330 585,300 560,280 590,280" fill="#${accentColor}"/>

              <!-- Main text area -->
              <text x="400" y="420" font-family="Georgia, serif" font-size="52" text-anchor="middle" fill="#${secondaryColor}" font-weight="bold">
                ${displayText}
              </text>

              <!-- Decorative elements -->
              <line x1="180" y1="500" x2="340" y2="500" stroke="#${secondaryColor}" stroke-width="3"/>
              <line x1="460" y1="500" x2="620" y2="500" stroke="#${secondaryColor}" stroke-width="3"/>
              <circle cx="400" cy="500" r="15" fill="#${accentColor}"/>

              <text x="400" y="600" font-family="Georgia, serif" font-size="28" text-anchor="middle" fill="#${secondaryColor}" opacity="0.8">
                WESTERN STYLE
              </text>

              <text x="400" y="750" font-family="Arial" font-size="16" text-anchor="middle" fill="#888">
                Mock Design - Connect DALL-E for custom generation
              </text>
            </svg>
          `
        } else if (isRetro) {
          // Retro style mock
          svgContent = `
            <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="1000" fill="#2D3436"/>

              <!-- Retro sun/circle -->
              <circle cx="400" cy="350" r="180" fill="#${primaryColor}"/>
              <circle cx="400" cy="350" r="140" fill="#${accentColor}"/>
              <circle cx="400" cy="350" r="100" fill="#${primaryColor}"/>

              <!-- Horizontal lines -->
              <line x1="150" y1="550" x2="650" y2="550" stroke="#${primaryColor}" stroke-width="8"/>
              <line x1="180" y1="580" x2="620" y2="580" stroke="#${accentColor}" stroke-width="6"/>
              <line x1="210" y1="610" x2="590" y2="610" stroke="#${primaryColor}" stroke-width="4"/>

              <!-- Text -->
              <text x="400" y="720" font-family="Impact, sans-serif" font-size="48" text-anchor="middle" fill="#${primaryColor}" letter-spacing="4">
                ${displayText}
              </text>

              <text x="400" y="850" font-family="Arial" font-size="16" text-anchor="middle" fill="#888">
                Mock Design - Connect DALL-E for custom generation
              </text>
            </svg>
          `
        } else if (isMinimal) {
          // Minimal style mock
          svgContent = `
            <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="1000" fill="white"/>

              <!-- Simple geometric shape -->
              <circle cx="400" cy="380" r="150" fill="none" stroke="#${secondaryColor}" stroke-width="3"/>

              <!-- Clean text -->
              <text x="400" y="620" font-family="Helvetica, Arial, sans-serif" font-size="36" text-anchor="middle" fill="#${secondaryColor}" font-weight="300" letter-spacing="2">
                ${displayText}
              </text>

              <text x="400" y="850" font-family="Arial" font-size="16" text-anchor="middle" fill="#888">
                Mock Design - Connect DALL-E for custom generation
              </text>
            </svg>
          `
        } else {
          // Default colorful style
          svgContent = `
            <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#${primaryColor};stop-opacity:0.2" />
                  <stop offset="100%" style="stop-color:#${accentColor};stop-opacity:0.2" />
                </linearGradient>
              </defs>

              <rect width="800" height="1000" fill="white"/>
              <rect width="800" height="1000" fill="url(#bgGrad)"/>

              <!-- Abstract shapes -->
              <circle cx="300" cy="300" r="120" fill="#${primaryColor}" opacity="0.8"/>
              <circle cx="500" cy="350" r="100" fill="#${accentColor}" opacity="0.6"/>
              <rect x="250" y="450" width="300" height="200" rx="20" fill="#${secondaryColor}" opacity="0.1"/>

              <!-- Main text -->
              <text x="400" y="580" font-family="Arial Black, sans-serif" font-size="42" text-anchor="middle" fill="#${secondaryColor}">
                ${displayText}
              </text>

              <!-- Subtitle showing prompt concept -->
              <text x="400" y="650" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">
                ${designPrompt.slice(0, 40)}${designPrompt.length > 40 ? '...' : ''}
              </text>

              <text x="400" y="850" font-family="Arial" font-size="16" text-anchor="middle" fill="#888">
                Mock Design - Connect DALL-E for custom generation
              </text>
            </svg>
          `
        }

        return svgContent
      }

      return `data:image/svg+xml,${encodeURIComponent(generateMockDesign(prompt))}`
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
      // Use DALL-E 3 if configured
      if (aiAgents.hasOpenAI()) {
        try {
          return await aiAgents.designGenerator.edit(currentImageUrl, editPrompt)
        } catch (error) {
          console.error('DALL-E edit failed, using fallback:', error)
        }
      }

      // Fallback to mock SVG
      console.warn('OpenAI not configured. Using mock design edit.')
      await new Promise(resolve => setTimeout(resolve, 2000))

      const colors = ['FF6B6B', '4ECDC4', 'FFD93D', '95E1D3', 'F38181', 'A8E6CF', 'FFD6A5']
      const primaryColor = colors[Math.floor(Math.random() * colors.length)]
      const secondaryColor = colors[Math.floor(Math.random() * colors.length)]
      const displayText = editPrompt.slice(0, 25).toUpperCase()

      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="editGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#${primaryColor};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#${secondaryColor};stop-opacity:0.3" />
            </linearGradient>
          </defs>

          <rect width="800" height="1000" fill="white"/>
          <rect width="800" height="1000" fill="url(#editGrad)"/>

          <!-- Edit indicator -->
          <rect x="150" y="200" width="500" height="400" rx="20" fill="none" stroke="#${primaryColor}" stroke-width="3" stroke-dasharray="10,5"/>

          <!-- Main shape -->
          <circle cx="400" cy="380" r="140" fill="#${primaryColor}" opacity="0.7"/>
          <circle cx="400" cy="380" r="100" fill="#${secondaryColor}" opacity="0.5"/>

          <!-- Edit text -->
          <text x="400" y="630" font-family="Arial Black, sans-serif" font-size="36" text-anchor="middle" fill="#333">
            ${displayText}
          </text>

          <text x="400" y="700" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">
            Edited Version
          </text>

          <text x="400" y="850" font-family="Arial" font-size="16" text-anchor="middle" fill="#888">
            Mock Edit - Connect DALL-E for AI editing
          </text>
        </svg>
      `)}`
    },

    async removeBackground(imageDataUrl: string): Promise<string> {
      // Use DALL-E 3 if configured (generates new clean design)
      if (aiAgents.hasOpenAI()) {
        try {
          return await aiAgents.designGenerator.removeBackground(imageDataUrl)
        } catch (error) {
          console.error('Background removal failed, using fallback:', error)
        }
      }

      // Fallback to mock SVG
      console.warn('OpenAI not configured. Using mock background removal.')
      await new Promise(resolve => setTimeout(resolve, 2000))

      const colors = ['FF6B6B', '4ECDC4', 'FFD93D', '95E1D3', 'F38181']
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#${randomColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:#${randomColor};stop-opacity:0" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="400" r="180" fill="url(#grad1)"/>
          <text x="400" y="700" font-family="Arial" font-size="28" text-anchor="middle" fill="#333">
            Background Removed
          </text>
        </svg>
      `)}`
    }
  }
}
