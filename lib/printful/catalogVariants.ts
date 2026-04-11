import { printfulGetWithPaging, type PrintfulPaging } from '@/lib/printful/client'

const PAGE_LIMIT = 100
const MAX_PAGES = 50

export type CatalogVariantRow = {
  id: number
  catalog_product_id?: number
  name: string
  size?: string
  color?: string
  color_code?: string
  color_code2?: string | null
  image?: string
}

/**
 * Fetches every catalog variant for a product (Printful v2 paginates with offset/limit).
 */
export async function fetchAllCatalogVariants(productId: number): Promise<{
  success: boolean
  variants: CatalogVariantRow[]
  error?: string
}> {
  const all: CatalogVariantRow[] = []
  let offset = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const path = `/catalog-products/${productId}/catalog-variants?offset=${offset}&limit=${PAGE_LIMIT}`
    const res = await printfulGetWithPaging<CatalogVariantRow>(path)
    if (!res.success) {
      return { success: false, variants: all, error: res.error }
    }

    const batch = res.items.filter(
      (v): v is CatalogVariantRow => v && typeof v === 'object' && typeof (v as CatalogVariantRow).id === 'number'
    )
    all.push(...batch)

    const paging: PrintfulPaging | undefined = res.paging
    const limit = paging?.limit ?? PAGE_LIMIT
    const total = paging?.total

    if (batch.length === 0) break
    if (total != null && all.length >= total) break
    if (batch.length < limit) break

    offset += batch.length
  }

  return { success: true, variants: all }
}
