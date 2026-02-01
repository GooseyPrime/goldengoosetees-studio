/**
 * Server-side Printful API client
 * 
 * This module provides server-only access to the Printful API.
 * Never exposes API keys to the client.
 */

const PRINTFUL_API_BASE = 'https://api.printful.com'

// Environment variables - server-side only
// Supports backwards compatibility with VITE_PRINTFUL_API_KEY temporarily
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY ?? process.env.VITE_PRINTFUL_API_KEY
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID ?? process.env.VITE_PRINTFUL_STORE_ID

export interface PrintfulProduct {
  id: number
  type: string
  type_name: string
  title: string
  brand: string | null
  model: string
  image: string
  variant_count: number
  currency: string
  options: Array<{
    id: string
    title: string
    type: string
    values: Record<string, string>
    additional_price: number | null
  }>
  is_discontinued: boolean
}

export interface PrintfulVariant {
  id: number
  product_id: number
  name: string
  size: string
  color: string
  color_code: string
  image: string
  price: string
  in_stock: boolean
  availability_regions: Record<string, string>
  availability_status: Array<{
    region: string
    status: string
  }>
}

export interface PrintfulProductResponse {
  product: PrintfulProduct
  variants: PrintfulVariant[]
}

export interface PrintfulFile {
  url?: string
  type: 'default' | 'back' | 'front' | 'preview' | 'embroidery_front' | 'left_sleeve' | 'right_sleeve'
  filename?: string
  visible?: boolean
  position?: {
    area_width: number
    area_height: number
    width: number
    height: number
    top: number
    left: number
  }
}

export interface PrintfulOrderRequest {
  recipient: {
    name: string
    address1: string
    address2?: string
    city: string
    state_code: string
    country_code: string
    zip: string
    email?: string
    phone?: string
  }
  items: Array<{
    variant_id: number
    quantity: number
    files?: PrintfulFile[]
    options?: Array<{
      id: string
      value: string
    }>
  }>
  retail_costs?: {
    currency: string
    subtotal: string
    discount?: string
    shipping: string
    tax?: string
  }
}

export interface PrintfulOrderResponse {
  id: number
  external_id: string
  status: string
  shipping: string
  created: number
  updated: number
  recipient: any
  items: any[]
  costs: {
    currency: string
    subtotal: string
    discount: string
    shipping: string
    digitization: string
    additional_fee: string
    fulfillment_fee: string
    tax: string
    vat: string
    total: string
  }
  retail_costs: {
    currency: string
    subtotal: string
    discount: string
    shipping: string
    tax: string
    total: string
  }
  shipments: Array<{
    id: number
    carrier: string
    service: string
    tracking_number: string
    tracking_url: string
    created: number
    ship_date: string
    shipped_at: number
    reshipment: boolean
    items: any[]
  }>
}

/**
 * Redact sensitive information from error messages
 */
function sanitizeError(error: any): any {
  if (typeof error === 'string') {
    return error.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
  }
  if (error?.message) {
    return {
      ...error,
      message: error.message.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    }
  }
  return error
}

/**
 * Make a request to the Printful API
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('Printful API key not configured. Set PRINTFUL_API_KEY environment variable.')
  }

  const url = `${PRINTFUL_API_BASE}${endpoint}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const sanitizedError = sanitizeError(error)
      throw new Error(
        sanitizedError.error?.message || `Printful API error: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.result as T
  } catch (error: any) {
    // Never log the API key
    const sanitized = sanitizeError(error)
    console.error('Printful API request failed:', sanitized)
    throw sanitized
  }
}

/**
 * Upload a file to Printful
 */
async function uploadFile(file: Blob, filename: string): Promise<{ id: string; url: string }> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('Printful API key not configured')
  }

  const formData = new FormData()
  formData.append('file', file, filename)

  const url = `${PRINTFUL_API_BASE}/files`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const sanitizedError = sanitizeError(error)
    throw new Error(sanitizedError.error?.message || 'Failed to upload file to Printful')
  }

  const data = await response.json()
  return data.result
}

export const printfulServer = {
  /**
   * Check if Printful is configured
   */
  isConfigured(): boolean {
    return !!PRINTFUL_API_KEY
  },

  /**
   * Get store ID if configured
   */
  getStoreId(): string | undefined {
    return PRINTFUL_STORE_ID || undefined
  },

  /**
   * Get all products
   */
  async getProducts(): Promise<PrintfulProduct[]> {
    return request<PrintfulProduct[]>('/products')
  },

  /**
   * Get a specific product
   */
  async getProduct(productId: number): Promise<PrintfulProduct> {
    const result = await request<PrintfulProductResponse>(`/products/${productId}`)
    return result.product
  },

  /**
   * Get variants for a product
   */
  async getVariants(productId: number): Promise<PrintfulVariant[]> {
    const result = await request<PrintfulProductResponse>(`/products/${productId}`)
    return result.variants || []
  },

  /**
   * Get a specific variant
   */
  async getVariant(variantId: number): Promise<PrintfulVariant> {
    return request<PrintfulVariant>(`/products/variant/${variantId}`)
  },

  /**
   * Get sync products from the connected store
   */
  async getSyncProducts(): Promise<any[]> {
    return request<any[]>('/store/products')
  },

  /**
   * Get a sync product
   */
  async getSyncProduct(syncProductId: number): Promise<any> {
    return request<any>(`/store/products/${syncProductId}`)
  },

  /**
   * Get sync variants for a sync product
   */
  async getSyncVariants(syncProductId: number): Promise<any[]> {
    const product = await request<any>(`/store/products/${syncProductId}`)
    return product.sync_variants || []
  },

  /**
   * Create a mockup generation task
   */
  async createMockupTask(productId: number, payload: Record<string, unknown>): Promise<{ task_key: string }> {
    return request<{ task_key: string }>(`/mockup-generator/create-task/${productId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get mockup generation task status
   */
  async getMockupTask(taskKey: string): Promise<any> {
    return request<any>(`/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`)
  },

  /**
   * Get Printful printfiles for a product
   */
  async getPrintfiles(productId: number): Promise<any> {
    return request<any>(`/mockup-generator/printfiles/${productId}`)
  },

  /**
   * Create a Printful order
   */
  async createOrder(orderData: PrintfulOrderRequest): Promise<PrintfulOrderResponse> {
    return request<PrintfulOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },

  /**
   * Confirm a Printful order
   */
  async confirmOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return request<PrintfulOrderResponse>(`/orders/${orderId}/confirm`, {
      method: 'POST',
    })
  },

  /**
   * Get order details
   */
  async getOrder(orderId: number | string): Promise<PrintfulOrderResponse> {
    return request<PrintfulOrderResponse>(`/orders/${orderId}`)
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return request<PrintfulOrderResponse>(`/orders/${orderId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Upload a file to Printful
   */
  async uploadFile(file: Blob, filename: string): Promise<{ id: string; url: string }> {
    return uploadFile(file, filename)
  },

  /**
   * Get shipping rates
   */
  async getShippingRates(
    recipient: PrintfulOrderRequest['recipient'],
    items: PrintfulOrderRequest['items']
  ): Promise<any> {
    return request('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify({ recipient, items }),
    })
  },

  /**
   * Get estimated delivery date (7 business days)
   */
  async getEstimatedDelivery(
    recipient: PrintfulOrderRequest['recipient']
  ): Promise<string> {
    const businessDays = 7
    const today = new Date()
    let daysAdded = 0
    let currentDate = new Date(today)

    while (daysAdded < businessDays) {
      currentDate.setDate(currentDate.getDate() + 1)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++
      }
    }

    return currentDate.toISOString()
  },
}
