import { DesignFile, Product, ProductCategory, ProductMockupTemplate, ProductVariantType } from './types'
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

export interface PrintfulCatalogProduct extends PrintfulProduct {
  category: ProductCategory
  mockupTemplate: ProductMockupTemplate
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

const DEFAULT_MOCKUP_AREA = {
  width: 1800,
  height: 2400,
}

const normalizeToken = (value?: string): string => {
  if (!value) return ''
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

const inferCategoryFromPrintful = (product: PrintfulProduct): ProductCategory => {
  const descriptor = `${product.type} ${product.type_name} ${product.title} ${product.model}`.toLowerCase()
  if (descriptor.includes('mug') || descriptor.includes('cup') || descriptor.includes('tumbler') || descriptor.includes('bottle')) {
    return 'drinkware'
  }
  if (descriptor.includes('hat') || descriptor.includes('cap') || descriptor.includes('beanie')) {
    return 'accessory'
  }
  if (descriptor.includes('poster') || descriptor.includes('canvas') || descriptor.includes('print')) {
    return 'poster'
  }
  return 'apparel'
}

const mockupTemplateForCategory = (category: ProductCategory): ProductMockupTemplate => {
  switch (category) {
    case 'drinkware':
      return 'mug'
    case 'accessory':
      return 'hat'
    case 'poster':
      return 'poster'
    default:
      return 'tshirt'
  }
}

const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const resolvePrintfiles = (response: any): Array<Record<string, unknown>> => {
  if (!response) return []
  if (Array.isArray(response)) return response as Array<Record<string, unknown>>
  const topLevel = response['printfiles']
  if (Array.isArray(topLevel)) return topLevel as Array<Record<string, unknown>>

  const result = response.result as Record<string, unknown> | undefined
  const resultPrintfiles = result ? (result as any)['printfiles'] : undefined
  if (Array.isArray(resultPrintfiles)) return resultPrintfiles as Array<Record<string, unknown>>

  if (Array.isArray(response.files)) return response.files as Array<Record<string, unknown>>
  if (Array.isArray(result?.files)) return result.files as Array<Record<string, unknown>>
  return []
}

const resolvePlacementAliases = (placement: string): string[] => {
  const normalized = normalizeToken(placement)
  switch (normalized) {
    case 'front':
      return ['front', 'default', 'embroideryfront']
    case 'back':
      return ['back']
    case 'leftsleeve':
      return ['leftsleeve', 'left_sleeve']
    case 'rightsleeve':
      return ['rightsleeve', 'right_sleeve']
    default:
      return [normalized]
  }
}

const resolvePrintfilePlacement = (
  placement: string,
  printfiles: Array<Record<string, unknown>>
): { placement: string; areaWidth: number; areaHeight: number } => {
  const desired = resolvePlacementAliases(placement).map(normalizeToken)
  const match = printfiles.find((file) => {
    const type = normalizeToken(String(file.type ?? file.placement ?? file.name ?? ''))
    return desired.includes(type)
  })

  const areaWidth = toNumber(match?.print_area_width ?? match?.area_width ?? match?.width ?? match?.width_px)
  const areaHeight = toNumber(match?.print_area_height ?? match?.area_height ?? match?.height ?? match?.height_px)

  return {
    placement: String(match?.type ?? match?.placement ?? placement),
    areaWidth: areaWidth ?? DEFAULT_MOCKUP_AREA.width,
    areaHeight: areaHeight ?? DEFAULT_MOCKUP_AREA.height,
  }
}

const matchesVariantSelections = (
  variant: PrintfulVariant,
  selections?: Partial<Record<ProductVariantType, string>>
): boolean => {
  if (!selections) return true
  const entries = Object.entries(selections).filter(([, value]) => value)
  if (entries.length === 0) return true

  const nameToken = normalizeToken(variant.name)
  const sizeToken = normalizeToken(variant.size)
  const colorToken = normalizeToken(variant.color)

  for (const [key, value] of entries) {
    const token = normalizeToken(value)
    if (!token) continue

    if (key === 'size') {
      if (!sizeToken.includes(token) && !nameToken.includes(token)) return false
      continue
    }
    if (key === 'color') {
      if (!colorToken.includes(token) && !nameToken.includes(token)) return false
      continue
    }

    if (!nameToken.includes(token) && !sizeToken.includes(token) && !colorToken.includes(token)) {
      return false
    }
  }

  return true
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

  async getProducts(): Promise<PrintfulProduct[]> {
    const response = await this.request<{ products: PrintfulProduct[] }>('/products/list', { method: 'GET' })
    return response.products || []
  }

  async getProduct(productId: number): Promise<PrintfulProduct> {
    const response = await this.request<{ product: PrintfulProduct }>(`/products/get?productId=${productId}`, { method: 'GET' })
    return response.product
  }

  async getVariants(productId: number): Promise<PrintfulVariant[]> {
    const response = await this.request<{ variants: PrintfulVariant[] }>(`/products/variants?productId=${productId}`, { method: 'GET' })
    return response.variants || []
  }

  private async tryGetVariant(variantId: number): Promise<PrintfulVariant | null> {
    try {
      const response = await this.request<{ variant: PrintfulVariant }>(
        `/variants/get?variantId=${variantId}`,
        { method: 'GET' }
      )
      return response.variant
    } catch {
      return null
    }
  }

  async getVariant(variantId: number): Promise<PrintfulVariant> {
    const direct = await this.tryGetVariant(variantId)
    if (direct) {
      return direct
    }

    const fallbackVariants = await this.getVariants(variantId)
    if (fallbackVariants.length > 0) {
      return fallbackVariants[0]
    }

    throw new Error('Printful variant not found.')
  }

  async getSyncProducts(): Promise<any[]> {
    const response = await this.request<{ products: any[] }>('/sync-products/list', { method: 'GET' })
    return response.products || []
  }

  async getSyncProduct(syncProductId: number): Promise<any> {
    const response = await this.request<{ product: any }>(
      `/sync-products/get?syncProductId=${syncProductId}`,
      { method: 'GET' }
    )
    return response.product
  }

  async getSyncVariants(syncProductId: number): Promise<any[]> {
    const response = await this.request<{ variants: any[] }>(
      `/sync-products/variants?syncProductId=${syncProductId}`,
      { method: 'GET' }
    )
    return response.variants || []
  }

  async getCatalogProducts(): Promise<PrintfulCatalogProduct[]> {
    const products = await this.getProducts()
    return products.map((product) => {
      const category = inferCategoryFromPrintful(product)
      return {
        ...product,
        category,
        mockupTemplate: mockupTemplateForCategory(category),
      }
    })
  }

  async resolveVariantId(
    product: Product,
    selections?: Partial<Record<ProductVariantType, string>>
  ): Promise<{ variantId: number; productId: number; variant: PrintfulVariant }> {
    const skuValue = Number(product.printfulSKU)
    if (!Number.isFinite(skuValue)) {
      throw new Error('Missing or invalid Printful SKU for this product.')
    }

    const directVariant = await this.tryGetVariant(skuValue)
    const productId = directVariant?.product_id ?? skuValue
    const shouldResolveSelections = selections && Object.values(selections).some(Boolean)

    let variants: PrintfulVariant[] = []
    if (!directVariant || shouldResolveSelections) {
      variants = await this.getVariants(productId)
    }

    let resolvedVariant = directVariant
    if (variants.length > 0 && shouldResolveSelections) {
      const matched = variants.find((variant) => matchesVariantSelections(variant, selections))
      if (matched) {
        resolvedVariant = matched
      } else if (directVariant) {
        console.warn('Printful variant selections did not match; falling back to SKU variant.')
      } else {
        console.warn('Printful variant selections did not match; falling back to first variant.')
      }
    }

    if (!resolvedVariant && variants.length > 0) {
      resolvedVariant = variants[0]
    }

    if (!resolvedVariant) {
      throw new Error('Unable to resolve a Printful variant for this product.')
    }

    return {
      variantId: resolvedVariant.id,
      productId,
      variant: resolvedVariant,
    }
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
    const placement = options?.placement || 'front'
    let resolvedPlacement = placement
    let areaWidth = DEFAULT_MOCKUP_AREA.width
    let areaHeight = DEFAULT_MOCKUP_AREA.height

    try {
      const printfilesResponse = await this.getPrintfiles(productId)
      const printfiles = resolvePrintfiles(printfilesResponse)
      if (printfiles.length > 0) {
        const resolved = resolvePrintfilePlacement(placement, printfiles)
        resolvedPlacement = resolved.placement
        areaWidth = resolved.areaWidth
        areaHeight = resolved.areaHeight
      }
    } catch (error) {
      console.warn('Failed to resolve Printful printfiles, using defaults.', error)
    }

    const mockupTaskResponse = await apiRequest<{ task_key: string }>('/mockup-generator/create-task/' + productId, {
      method: 'POST',
      body: JSON.stringify({
        variant_ids: [variantId],
        format: options?.format || 'jpg',
        width: options?.width || 1000,
        files: [
          {
            placement: resolvedPlacement,
            image_url: designUrl,
            position: {
              area_width: Math.round(areaWidth),
              area_height: Math.round(areaHeight),
              width: Math.round(areaWidth),
              height: Math.round(areaHeight),
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

      const result = await apiRequest<any>(`/mockup-generator/task?task_key=${taskKey}`)

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
    return apiRequest<any>(`/mockup-generator/printfiles/${productId}`)
  }

  async getShippingRates(
    recipient: PrintfulOrderRequest['recipient'],
    items: PrintfulOrderRequest['items']
  ): Promise<any> {
    return apiRequest('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify({ recipient, items }),
    })
  }

  async createOrder(orderData: PrintfulOrderRequest): Promise<PrintfulOrderResponse> {
    return apiRequest<PrintfulOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async confirmOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return apiRequest<PrintfulOrderResponse>(`/orders/${orderId}/confirm`, {
      method: 'POST',
    })
  }

  async getOrder(orderId: number | string): Promise<PrintfulOrderResponse> {
    return apiRequest<PrintfulOrderResponse>(`/orders/${orderId}`)
  }

  async cancelOrder(orderId: number): Promise<PrintfulOrderResponse> {
    return apiRequest<PrintfulOrderResponse>(`/orders/${orderId}`, {
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
    if (product.mockupTemplate === 'hat' && printArea.position === 'front') {
      type = 'embroidery_front'
    } else {
      switch (printArea.position) {
        case 'front':
          type = 'front'
          break
        case 'back':
          type = 'back'
          break
        case 'left_sleeve':
          type = 'left_sleeve'
          break
        case 'right_sleeve':
          type = 'right_sleeve'
          break
        default:
          type = 'default'
      }
    }

    const areaDpi = printArea.dpi || designFile.dpi
    const areaWidthPx = printArea.widthInches * areaDpi
    const areaHeightPx = printArea.heightInches * areaDpi

    const scale = Math.min(
      areaWidthPx / designFile.widthPx,
      areaHeightPx / designFile.heightPx,
      1
    )
    const scaledWidth = Math.round(designFile.widthPx * scale)
    const scaledHeight = Math.round(designFile.heightPx * scale)

    return {
      url: fileUrl,
      type,
      visible: true,
      position: {
        area_width: Math.round(areaWidthPx),
        area_height: Math.round(areaHeightPx),
        width: scaledWidth,
        height: scaledHeight,
        top: Math.round((areaHeightPx - scaledHeight) / 2),
        left: Math.round((areaWidthPx - scaledWidth) / 2),
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
