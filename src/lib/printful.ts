import { useKV } from '@github/spark/hooks'
import { DesignFile, Product, Order } from './types'

const PRINTFUL_API_BASE = 'https://api.printful.com'

interface PrintfulConfig {
  apiKey: string
  storeId?: string
}

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

export class PrintfulService {
  private config: PrintfulConfig | null = null

  async initialize(): Promise<void> {
    const apiKey = await window.spark.kv.get<string>('printful-api-key')
    const storeId = await window.spark.kv.get<string>('printful-store-id')
    
    if (!apiKey) {
      throw new Error('Printful API key not configured')
    }

    this.config = { apiKey, storeId }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config) {
      await this.initialize()
    }

    const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Printful API error: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.result as T
  }

  async getProducts(): Promise<PrintfulProduct[]> {
    return this.request<PrintfulProduct[]>('/products')
  }

  async getProduct(productId: number): Promise<PrintfulProduct> {
    return this.request<PrintfulProduct>(`/products/${productId}`)
  }

  async getVariants(productId: number): Promise<PrintfulVariant[]> {
    return this.request<PrintfulVariant[]>(`/products/${productId}`)
  }

  async getVariant(variantId: number): Promise<PrintfulVariant> {
    return this.request<PrintfulVariant>(`/products/variant/${variantId}`)
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
    const formData = new FormData()
    formData.append('file', file, filename)

    if (!this.config) {
      await this.initialize()
    }

    const response = await fetch(`${PRINTFUL_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload file to Printful')
    }

    const data = await response.json()
    return data.result
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
