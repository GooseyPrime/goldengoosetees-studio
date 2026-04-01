import { useState, useCallback, useEffect } from 'react'
import type { Product } from '@/lib/types'

export interface CatalogCategory {
  id: number
  parent_id?: number
  title: string
  image_url?: string
}

export interface CatalogProductSummary {
  id: string
  name: string
  imageUrl: string
  category: string
  basePrice: number
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function catalogLoadError(res: Response, data: Record<string, unknown> | null): string {
  const serverErr = data && typeof data.error === 'string' ? data.error.trim() : ''
  if (serverErr) return serverErr
  if (!res.ok) return `Catalog request failed (HTTP ${res.status}). Please try again.`
  return 'Catalog returned an invalid response. Please try again.'
}

export function usePrintfulCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/printful/catalog/categories')
      const data = await parseJsonSafe(res)
      if (!res.ok) {
        setCategories([])
        return
      }
      const cats = (data?.categories as CatalogCategory[] | undefined) || []
      setCategories(Array.isArray(cats) ? cats : [])
    } catch {
      setCategories([])
    }
  }, [])

  const fetchProducts = useCallback(async (categoryId?: number | null) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryId != null) params.set('category_id', String(categoryId))
      const url = `/api/printful/catalog/list${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url)
      const data = await parseJsonSafe(res)
      if (data && data.success === true && Array.isArray(data.products)) {
        const list = data.products as Product[]
        setProducts(list)
        const msg = typeof data.message === 'string' ? data.message.trim() : ''
        setError(list.length === 0 && msg ? msg : null)
        return
      }
      setProducts([])
      setError(catalogLoadError(res, data))
    } catch {
      setProducts([])
      setError('Could not reach the catalog. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProductById = useCallback(async (productId: string): Promise<Product | null> => {
    setLoadingProduct(productId)
    setError(null)
    try {
      const res = await fetch(`/api/printful/catalog/product/${productId}`)
      const data = await parseJsonSafe(res)
      if (data && data.success === true && data.product && typeof data.product === 'object') {
        return data.product as Product
      }
      setError((data?.error as string) || catalogLoadError(res, data))
      return null
    } catch {
      setError('Failed to load product. Check your connection and try again.')
      return null
    } finally {
      setLoadingProduct(null)
    }
  }, [])

  const selectCategory = useCallback(
    (categoryId: number | null) => {
      setSelectedCategoryId(categoryId)
      fetchProducts(categoryId)
    },
    [fetchProducts]
  )

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts(selectedCategoryId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId])

  return {
    products,
    categories,
    selectedCategoryId,
    selectCategory,
    loading,
    loadingProduct,
    error,
    fetchProductById,
  }
}
