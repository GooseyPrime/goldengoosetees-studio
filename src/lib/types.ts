export type UserRole = 'guest' | 'user' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  ageVerified: boolean
  birthdate?: string
  role: UserRole
  createdAt: string
}

export interface ProductConstraints {
  minDPI: number
  maxDPI: number
  formats: string[]
  maxFileSizeMB: number
  colorMode: 'RGB' | 'CMYK'
}

export interface PrintArea {
  id: string
  name: string
  position: 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  widthInches: number
  heightInches: number
  constraints: ProductConstraints
}

export interface ProductConfiguration {
  id: string
  name: string
  printAreas: string[]
  priceModifier: number
  size?: string
  color?: string
}

export interface ProductColor {
  name: string
  hexCode: string
  available: boolean
}

export interface Product {
  id: string
  name: string
  description: string
  printfulSKU: string
  basePrice: number
  imageUrl: string
  printAreas: PrintArea[]
  configurations: ProductConfiguration[]
  availableSizes: string[]
  availableColors: ProductColor[]
  category: string
  available: boolean
}

export interface DesignFile {
  id: string
  printAreaId: string
  dataUrl: string
  format: string
  widthPx: number
  heightPx: number
  dpi: number
  createdAt: string
}

export interface Design {
  id: string
  userId?: string
  productId: string
  configurationId?: string
  size?: string
  color?: string
  files: DesignFile[]
  isPublic: boolean
  isNSFW: boolean
  title: string
  description?: string
  catalogSection?: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus = 'pending' | 'processing' | 'fulfilled' | 'shipped' | 'delivered' | 'failed'

export interface Order {
  id: string
  userId: string
  designId: string
  productId: string
  size: string
  color: string
  stripePaymentId?: string
  printfulOrderId?: string
  status: OrderStatus
  totalAmount: number
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  trackingNumber?: string
  estimatedDelivery?: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DesignSession {
  id: string
  productId?: string
  messages: ChatMessage[]
  currentDesigns: DesignFile[]
  stage: 'product_selection' | 'design_creation' | 'iteration' | 'approval' | 'complete'
  createdAt: string
  updatedAt: string
}

export interface CatalogSection {
  id: string
  name: string
  rating: 'sfw' | 'nsfw'
  designType: string
}
