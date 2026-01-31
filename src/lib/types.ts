export type UserRole = 'guest' | 'user' | 'admin'

export type ProductCategory = 'apparel' | 'drinkware' | 'accessory' | 'poster'

export type ProductVariantType = 'size' | 'volume' | 'color' | 'material'

export type ProductMockupTemplate = 'tshirt' | 'mug' | 'hat' | 'poster'

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
  dpi: number
  constraints: ProductConstraints
}

export interface ProductVariantOption {
  value: string
  label?: string
  hexCode?: string
  available: boolean
}

export interface ProductVariant {
  id: ProductVariantType
  name: string
  options: ProductVariantOption[]
}

export interface ProductConfiguration {
  id: string
  name: string
  printAreas: string[]
  priceModifier: number
  variantSelections?: Partial<Record<ProductVariantType, string>>
  size?: string
  color?: string
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
  variants: ProductVariant[]
  category: ProductCategory
  mockupTemplate: ProductMockupTemplate
  available: boolean
}

export interface DesignFile {
  id: string
  printAreaId: string
  dataUrl: string
  storageUrl?: string // Supabase Storage URL for production
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
  variantSelections?: Partial<Record<ProductVariantType, string>>
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
  variantSelections?: Partial<Record<ProductVariantType, string>>
  size?: string
  color?: string
  stripePaymentId?: string
  stripeSessionId?: string // Stripe Checkout Session ID
  printfulOrderId?: string
  printfulExternalId?: string // External ID sent to Printful
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
    email?: string
    phone?: string
  }
  trackingNumber?: string
  trackingUrl?: string
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
