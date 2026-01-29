import { DesignFile, Product, Order } from './types'
import { supabaseService } from './supabase'

// Client-side wrapper for server-side Printful API
// All actual Printful API calls are made server-side via /api/printful/* endpoints

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

export interface PrintfulFile {
  url?: string
  type: 'default' | 'back' | 'front' | 'preview' | 'embroidery_front'
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
 * Get authorization header for admin API calls
 */
async function getAuthHeader(): Promise<string> {
  const session = await supabaseService.getSession()
  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in.')
  }
  return `Bearer ${session.access_token}`
}

/**
 * Make a request to our backend Printful API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch(`/api/printful${endpoint}`, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.error || `Printful API error: ${response.statusText}`
    )
  }

  const data = await response.json()
  return data.result || data.order || data.file || data
}

export class PrintfulService {
  /**
   * Check if Printful is configured on the server
   */
  async isConfigured(): Promise<boolean> {
    try {
      const authHeader = await getAuthHeader()
      const response = await fetch('/api/printful/status', {
        headers: {
          'Authorization': authHeader,
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.configured === true
    } catch {
      return false
    }
  }

  /**
   * Internal helper to make requests to backend Printful API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiRequest<T>(endpoint, options)
  }

  // Note: These methods require backend endpoints to be implemented
  // For now, they throw errors indicating server-side implementation needed
  async getProducts(): Promise<PrintfulProduct[]> {
    throw new Error('getProducts() requires server-side implementation. Use /api/printful/products endpoint.')
  }

  async getProduct(productId: number): Promise<PrintfulProduct> {
    throw new Error('getProduct() requires server-side implementation.')
  }

  async getVariants(productId: number): Promise<PrintfulVariant[]> {
    throw new Error('getVariants() requires server-side implementation.')
  }

  async getVariant(variantId: number): Promise<PrintfulVariant> {
    throw new Error('getVariant() requires server-side implementation.')
  }

  async getSyncProducts(): Promise<any[]> {
    throw new Error('getSyncProducts() requires server-side implementation.')
  }

  async getSyncProduct(syncProductId: number): Promise<any> {
    throw new Error('getSyncProduct() requires server-side implementation.')
  }

  async getSyncVariants(syncProductId: number): Promise<any[]> {
    throw new Error('getSyncVariants() requires server-side implementation.')
  }

  // Mockup generation
  async generateMockup(
    productId: number,
    variantId: number,
    designUrl: string,
    options?: {
      format?: 'jpg' | 'png'
      width?: number
      placement?: 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
    }
  ): Promise<{ mockup_url: string; extra: any[] }> {
    const mockupTaskResponse = await this.request<{ task_key: string }>('/mockup-generator/create-task/' + productId, {
      method: 'POST',
      body: JSON.stringify({
        variant_ids: [variantId],
        format: options?.format || 'jpg',
        width: options?.width || 1000,
        files: [
          {
            placement: options?.placement || 'front',
            image_url: designUrl,
            position: {
              area_width: 1800,
              area_height: 2400,
              width: 1800,
              height: 2400,
              top: 0,
              left: 0
            }
          }
        ]
      })
    })

    // Poll for mockup completion (max 30 seconds)
    const taskKey = mockupTaskResponse.task_key
    let attempts = 0
    const maxAttempts = 30

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const result = await this.request<any>(`/mockup-generator/task?task_key=${taskKey}`)

      if (result.status === 'completed') {
        return {
          mockup_url: result.mockups?.[0]?.mockup_url || '',
          extra: result.mockups || []
        }
      }

      if (result.status === 'failed') {
        throw new Error('Mockup generation failed')
      }

      attempts++
    }

    throw new Error('Mockup generation timed out')
  }

  // Get printfiles info for a product
  async getPrintfiles(productId: number): Promise<any> {
    return this.request<any>(`/mockup-generator/printfiles/${productId}`)
  }

  async getShippingRates(
    recipient: PrintfulOrderRequest['recipient'],
    items: PrintfulOrderRequest['items']
  ): Promise<any> {
    return this.request('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify({ recipient, items }),
    })
  }

  async createOrder(orderData: PrintfulOrderRequest): Promise<PrintfulOrderResponse> {
    return this.request<PrintfulOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async confirmOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return this.request<PrintfulOrderResponse>(`/orders/${orderId}/confirm`, {
      method: 'POST',
    })
  }

  async getOrder(orderId: number | string): Promise<PrintfulOrderResponse> {
    return this.request<PrintfulOrderResponse>(`/orders/${orderId}`)
  }

  async cancelOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return this.request<PrintfulOrderResponse>(`/orders/${orderId}`, {
      method: 'DELETE',
    })
  }

  async uploadFile(file: Blob, filename: string): Promise<{ id: string; url: string }> {
    // Convert blob to base64 data URL
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    return apiRequest<{ id: string; url: string }>('/files/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileData: dataUrl,
        filename,
      }),
    })
  }

  async convertDesignFileToPrintfulFile(
    designFile: DesignFile,
    product: Product
  ): Promise<PrintfulFile> {
    const printArea = product.printAreas.find(pa => pa.id === designFile.printAreaId)
    
    if (!printArea) {
      throw new Error(`Print area ${designFile.printAreaId} not found`)
    }

    let fileUrl = designFile.dataUrl

    if (designFile.dataUrl.startsWith('data:')) {
      const response = await fetch(designFile.dataUrl)
      const blob = await response.blob()
      const uploaded = await this.uploadFile(blob, `design-${designFile.id}.${designFile.format.toLowerCase()}`)
      fileUrl = uploaded.url
    }

    let type: PrintfulFile['type'] = 'default'
    switch (printArea.position) {
      case 'front':
        type = 'front'
        break
      case 'back':
        type = 'back'
        break
      default:
        type = 'default'
    }

    const areaWidthPx = printArea.widthInches * designFile.dpi
    const areaHeightPx = printArea.heightInches * designFile.dpi

    return {
      url: fileUrl,
      type,
      visible: true,
      position: {
        area_width: Math.round(areaWidthPx),
        area_height: Math.round(areaHeightPx),
        width: designFile.widthPx,
        height: designFile.heightPx,
        top: Math.round((areaHeightPx - designFile.heightPx) / 2),
        left: Math.round((areaWidthPx - designFile.widthPx) / 2),
      }
    }
  }

  async getEstimatedDelivery(
    recipient: PrintfulOrderRequest['recipient']
  ): Promise<string> {
    // Calculate estimated delivery (7 business days)
    // This is a simple calculation that doesn't require API call
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
  }
}

export const printfulService = new PrintfulService()
