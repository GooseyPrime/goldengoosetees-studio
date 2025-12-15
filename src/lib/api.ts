import { User, Order, Design } from './types'

export const api = {
  auth: {
    async loginWithGoogle(): Promise<User> {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockUser: User = {
        id: `user-${Date.now()}`,
        email: 'demo@goldengoosetees.com',
        name: 'Demo User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        ageVerified: false,
        role: 'user',
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
      
      return order
    },
    
    async processPayment(orderId: string, paymentMethodId: string): Promise<string> {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return `pi_${Date.now()}`
    },
    
    async submitToPrintful(orderId: string): Promise<{ printfulOrderId: string, estimatedDelivery: string }> {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const deliveryDate = new Date()
      deliveryDate.setDate(deliveryDate.getDate() + 7)
      
      return {
        printfulOrderId: `pf-${Date.now()}`,
        estimatedDelivery: deliveryDate.toISOString()
      }
    },
    
    async getByUser(userId: string): Promise<Order[]> {
      await new Promise(resolve => setTimeout(resolve, 500))
      return []
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
