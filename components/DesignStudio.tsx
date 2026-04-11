'use client'

import { useEffect, useState } from 'react'

export type CatalogProduct = {
  id: number
  name: string
  description: string
  imageUrl: string
  category: string
  variantCount: number
  basePrice: number | null
  currency: string
  variants: Array<{
    id: number
    name: string
    size: string
    color: string
    image: string
  }>
  localConfig: {
    displayName: string
    placements: Array<{ id: string; displayName: string }>
  } | null
}

type CatalogResponse = {
  success: boolean
  data?: CatalogProduct[]
  error?: string
  message?: string
}

export default function DesignStudio() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/printful/catalog', { cache: 'no-store' })
        const json = (await res.json()) as CatalogResponse
        if (cancelled) return
        if (!json.success) {
          setError(json.error || 'Could not load catalog')
          setProducts([])
          return
        }
        setProducts(json.data ?? [])
        setError(null)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Network error')
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl">🪿</div>
          <div>
            <h1 className="text-xl font-bold">Golden Goose Tees</h1>
            <p className="text-xs text-gray-600">Wear Your Truth. Loudly.</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-4xl font-bold">Design Your Custom Apparel</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pick a product, then chat with AI or upload art for each print area (front, back, and more).
          </p>
        </div>

        {loading && (
          <p className="text-center text-gray-500" role="status">
            Loading products…
          </p>
        )}

        {error && !loading && (
          <div
            className="max-w-xl mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm"
            role="alert"
          >
            <p className="font-medium">Catalog unavailable</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-amber-800/90">
              For production, set <code className="bg-amber-100 px-1 rounded">PRINTFUL_API_KEY</code> and{' '}
              <code className="bg-amber-100 px-1 rounded">PRINTFUL_CURATED_PRODUCT_IDS</code> on the server, then
              redeploy.
            </p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="text-center text-gray-500">No products are configured yet.</p>
        )}

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 h-full flex flex-col">
                <div className="aspect-square bg-slate-100 relative">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg text-slate-900">{product.name}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{product.category}</p>
                  {product.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3">{product.description}</p>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-500">{product.variantCount} variants</span>
                    {product.basePrice != null && (
                      <span className="font-semibold text-slate-900">
                        From ${product.basePrice.toFixed(2)} {product.currency}
                      </span>
                    )}
                  </div>
                  {product.localConfig?.placements && product.localConfig.placements.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Print areas:{' '}
                      {product.localConfig.placements.map((p) => p.displayName || p.id).join(', ')}
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
