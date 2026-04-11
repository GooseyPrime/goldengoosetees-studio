import { NextResponse } from 'next/server'
import { printfulGet } from '@/lib/printful/client'
import { getProductConfig } from '@/lib/config/products.config'
import { getCuratedCatalogProductIds } from '@/lib/offerings'

export const dynamic = 'force-dynamic'

/** Printful v2 catalog product (single) — fields vary slightly by product */
type PrintfulCatalogProductV2 = {
  id: number
  name?: string
  title?: string
  type?: string
  brand?: string | null
  model?: string | null
  image?: string
  variant_count?: number
  description?: string
  techniques?: unknown[]
  placements?: unknown[]
}

type PrintfulCatalogVariantV2 = {
  id: number
  catalog_product_id?: number
  name: string
  size?: string
  color?: string
  color_code?: string
  color_code2?: string | null
  image?: string
}

function asVariantArray(payload: unknown): PrintfulCatalogVariantV2[] {
  if (Array.isArray(payload)) return payload as PrintfulCatalogVariantV2[]
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const d = (payload as { data: unknown }).data
    if (Array.isArray(d)) return d as PrintfulCatalogVariantV2[]
  }
  return []
}

function asProduct(payload: unknown, fallbackId: number): PrintfulCatalogProductV2 | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  if ('id' in o && typeof o.id === 'number') return o as unknown as PrintfulCatalogProductV2
  if (o.data && typeof o.data === 'object' && o.data !== null && 'id' in o.data) {
    return o.data as PrintfulCatalogProductV2
  }
  return { id: fallbackId, ...(o as object) } as PrintfulCatalogProductV2
}

export async function GET() {
  if (!process.env.PRINTFUL_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'PRINTFUL_API_KEY is not configured',
        data: [],
      },
      { status: 503 }
    )
  }

  const ids = getCuratedCatalogProductIds()
  if (ids.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'No curated product IDs configured',
    })
  }

  const products: unknown[] = []

  for (const productId of ids) {
    const [productRes, variantsRes] = await Promise.all([
      printfulGet<unknown>(`/catalog-products/${productId}`),
      printfulGet<unknown>(`/catalog-products/${productId}/catalog-variants`),
    ])

    if (!productRes.success) {
      console.error(`Printful catalog-products/${productId}:`, productRes.error)
      continue
    }

    const p = asProduct(productRes.data, productId)
    if (!p) {
      console.error(`Printful catalog product ${productId}: unexpected response shape`)
      continue
    }

    const variants = variantsRes.success ? asVariantArray(variantsRes.data) : []
    const localConfig = getProductConfig(productId)
    const name = p.name ?? p.title ?? localConfig?.displayName ?? `Product ${productId}`

    products.push({
      id: p.id,
      name,
      description: (p.description as string | undefined) ?? localConfig?.description ?? '',
      imageUrl: p.image ?? variants[0]?.image ?? '',
      category: p.type ?? localConfig?.type ?? 'other',
      brand: p.brand,
      model: p.model,
      variantCount: p.variant_count ?? variants.length,
      basePrice: localConfig?.retailPriceBase ?? null,
      currency: 'USD',
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size ?? '',
        color: v.color ?? '',
        colorCode: v.color_code ?? '',
        image: v.image ?? '',
        catalogProductId: v.catalog_product_id ?? productId,
      })),
      printfulPlacements: p.placements ?? null,
      printfulTechniques: p.techniques ?? null,
      localConfig: localConfig
        ? {
            displayName: localConfig.displayName,
            shortName: localConfig.shortName,
            seoSlug: localConfig.seoSlug,
            type: localConfig.type,
            placements: localConfig.placements,
            retailPriceBase: localConfig.retailPriceBase,
            retailPriceAdjustments: localConfig.retailPriceAdjustments,
            defaultColors: localConfig.defaultColors,
          }
        : null,
      /** Raw Printful placements when no local config — client can resolve techniques */
      printfulPlacementsRaw: p.placements ?? null,
    })
  }

  return NextResponse.json({ success: true, data: products })
}
