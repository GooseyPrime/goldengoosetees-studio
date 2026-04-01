/**
 * Build Printful order items from Supabase design rows (server-only).
 */
import { printfulToProduct, type Product } from './printful-transform'
import { printfulServer, type PrintfulFile, type PrintfulOrderRequest } from './printful'

/** Minimal design file shape stored in Supabase `designs.files` jsonb */
interface DesignFileRow {
  id: string
  printAreaId: string
  dataUrl: string
  storageUrl?: string
  format: string
  widthPx: number
  heightPx: number
  dpi: number
}

type DesignRow = {
  files?: unknown
  configuration_id?: string | null
  variant_selections?: Partial<Record<string, string>> | null
  size?: string | null
  color?: string | null
  product_id?: string | null
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/i)
  if (!m) throw new Error('Invalid design data URL')
  return Buffer.from(m[2], 'base64')
}

function matchesVariantSelections(
  variant: { name: string; color: string; size: string },
  selections: Partial<Record<string, string>> | undefined
): boolean {
  if (!selections) return true
  const tokens = `${variant.name} ${variant.color} ${variant.size}`.toLowerCase()
  const size = selections.size?.toLowerCase()
  const color = selections.color?.toLowerCase()
  if (size && !tokens.includes(size)) return false
  if (color && !tokens.includes(color)) return false
  return true
}

export async function resolveVariantForProduct(
  appProduct: Product,
  variantId: number,
  selections?: Partial<Record<string, string>>
): Promise<{ variantId: number; productId: number }> {
  const pid = parseInt(appProduct.id, 10)
  const variants = await printfulServer.getVariants(pid)
  const byId = variants.find((v) => v.id === variantId)
  if (byId) {
    return { variantId: byId.id, productId: byId.product_id }
  }
  if (selections && Object.values(selections).some(Boolean)) {
    const matched = variants.find((v) => matchesVariantSelections(v, selections))
    if (matched) return { variantId: matched.id, productId: matched.product_id }
  }
  if (variants[0]) {
    return { variantId: variants[0].id, productId: variants[0].product_id }
  }
  throw new Error('Unable to resolve Printful variant')
}

async function designFileToPrintfulFile(
  designFile: DesignFileRow,
  product: Product
): Promise<PrintfulFile> {
  const printArea = product.printAreas.find((pa) => pa.id === designFile.printAreaId)
  if (!printArea) {
    throw new Error(`Print area ${designFile.printAreaId} not found`)
  }

  let fileUrl = designFile.storageUrl || ''
  if (!fileUrl || !fileUrl.startsWith('http')) {
    const src = designFile.dataUrl
    if (!src || !src.startsWith('data:')) {
      throw new Error('Design file missing public URL or data URL for Printful')
    }
    const buf = dataUrlToBuffer(src)
    const blob = new Blob([buf], { type: `image/${designFile.format || 'png'}` })
    const uploaded = await printfulServer.uploadFile(blob, `design-${designFile.id}.${(designFile.format || 'png').toLowerCase()}`)
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
  const scale = Math.min(areaWidthPx / designFile.widthPx, areaHeightPx / designFile.heightPx, 1)
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
    },
  }
}

export async function loadAppProductFromPrintful(productIdStr: string): Promise<Product> {
  const id = parseInt(productIdStr, 10)
  if (!Number.isFinite(id)) throw new Error('Invalid product id')
  const [p, variants] = await Promise.all([printfulServer.getProduct(id), printfulServer.getVariants(id)])
  return printfulToProduct(p as any, variants as any)
}

export async function buildPrintfulItemsFromDesign(params: {
  designRow: DesignRow
  variantId: number
  quantity: number
}): Promise<{ items: PrintfulOrderRequest['items']; appProduct: Product; resolvedVariantId: number }> {
  const productId = params.designRow.product_id
  if (!productId) {
    throw new Error('Design missing product_id')
  }

  const appProduct = await loadAppProductFromPrintful(productId)
  const filesRaw = params.designRow.files
  const designFiles = Array.isArray(filesRaw) ? (filesRaw as DesignFileRow[]) : []
  if (designFiles.length === 0) {
    throw new Error('Design has no files')
  }

  const selections = {
    ...(params.designRow.variant_selections || {}),
    ...(params.designRow.size ? { size: params.designRow.size } : {}),
    ...(params.designRow.color ? { color: params.designRow.color } : {}),
  }

  const { variantId: resolvedVariantId } = await resolveVariantForProduct(
    appProduct,
    params.variantId,
    selections
  )

  const printfulFiles = await Promise.all(
    designFiles.map((f) => designFileToPrintfulFile(f, appProduct))
  )

  return {
    items: [
      {
        variant_id: resolvedVariantId,
        quantity: Math.max(1, params.quantity),
        files: printfulFiles,
      },
    ],
    appProduct,
    resolvedVariantId,
  }
}

export function recipientForQuote(shipping: {
  name?: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  email?: string
  phone?: string
}): PrintfulOrderRequest['recipient'] {
  return {
    name: shipping.name || 'Customer',
    address1: shipping.line1,
    address2: shipping.line2,
    city: shipping.city,
    state_code: shipping.state,
    country_code: shipping.country,
    zip: shipping.postal_code,
    email: shipping.email,
    phone: shipping.phone,
  }
}

export function fileUrlsHash(files: DesignFileRow[]): string {
  return files
    .map((f) => f.storageUrl || f.dataUrl?.slice(0, 80) || f.id)
    .sort()
    .join('|')
}
