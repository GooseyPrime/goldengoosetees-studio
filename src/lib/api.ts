import { User, Order, Design, Product } from './types'
import { printfulService, PrintfulOrderRequest } from './printful'
import { stripeService } from './stripe'

export const api = {
  auth: {
    async loginWithGoogle(): Promise<User> {
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
    }
  },
  
  designs: {
    async save(design: Partial<Design>): Promise<Design> {
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
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
    },
    
    async getCatalog(section?: string): Promise<Design[]> {
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
    async generateDesign(prompt: string, constraints: any): Promise<string> {
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
    
    async chat(messages: Array<{ role: string, content: string }>): Promise<string> {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || ''
      
      if (lastMessage.includes('hello') || lastMessage.includes('hi') || messages.length === 1) {
        return "Hey there! 👋 I'm your AI design assistant. I'll help you create an awesome custom T-shirt design. Tell me what kind of design you're imagining - any theme, style, colors, or message you want to see on your shirt?"
      }
      
      if (lastMessage.includes('price') || lastMessage.includes('cost')) {
        return "Great question! Pricing depends on the product you choose. Our Classic Cotton Tee starts at $24.99, Premium Heavyweight at $29.99, and Long Sleeve at $32.99. The final price includes the custom print!"
      }
      
      if (lastMessage.includes('approve') || lastMessage.includes('looks good')) {
        return "Awesome! Your design looks great. When you're ready, click the 'Proceed to Checkout' button to complete your order, or 'Publish to Catalog' to share it with the community!"
      }
      
      return `I love the idea of "${lastMessage}"! Let me create a design based on that. I'll make sure it meets all the print requirements for your selected product. Give me just a moment...`
    }
  }
}
