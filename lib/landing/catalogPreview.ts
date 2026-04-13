import { printfulGet } from '@/lib/printful/client'
import { getEnabledProducts } from '@/lib/config/products.config'

export type LandingProductCard = {
  id: number
  name: string
  imageUrl: string
  description: string
  priceLabel: string
  typeLabel: string
}

function extractProductImage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const o = payload as Record<string, unknown>
  const inner = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o
  const img = inner.image
  return typeof img === 'string' ? img : ''
}

/**
 * Curated preview rows for the marketing home page (same product IDs as the studio).
 */
export async function getLandingCatalogPreview(limit = 6): Promise<LandingProductCard[]> {
  const configs = getEnabledProducts().slice(0, limit)
  const hasKey = Boolean(process.env.PRINTFUL_API_KEY?.trim())

  const cards: LandingProductCard[] = []

  for (const cfg of configs) {
    let imageUrl = ''
    if (hasKey) {
      const res = await printfulGet<unknown>(`/catalog-products/${cfg.printfulProductId}`)
      if (res.success) {
        imageUrl = extractProductImage(res.data)
      }
    }

    cards.push({
      id: cfg.printfulProductId,
      name: cfg.displayName,
      imageUrl,
      description: cfg.description,
      priceLabel:
        cfg.retailPriceBase != null ? `From $${cfg.retailPriceBase.toFixed(2)}` : 'See studio for pricing',
      typeLabel: cfg.type === 'tshirt' ? 'T-shirt' : cfg.type === 'hoodie' ? 'Hoodie' : 'Apparel',
    })
  }

  return cards
}
