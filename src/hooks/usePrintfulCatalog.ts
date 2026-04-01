import { useState, useCallback, useEffect } from 'react'
import type { Product } from '@/lib/types'
import { getEmergencyCatalogProducts, getEmergencyProductById } from '@/lib/catalog-emergency'

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

export function usePrintfulCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [catalogAvailable, setCatalogAvailable] = useState<boolean | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/printful/catalog/categories')
      const data = await parseJsonSafe(res)
      const cats = (data?.categories as CatalogCategory[] | undefined) || []
      setCategories(Array.isArray(cats) ? cats : [])
      setCatalogAvailable((cats?.length ?? 0) > 0)
    } catch {
      setCatalogAvailable(false)
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
        setProducts(data.products as Product[])
        setCatalogAvailable(true)
        return
      }
      setProducts(getEmergencyCatalogProducts())
      setCatalogAvailable(true)
    } catch {
      setProducts(getEmergencyCatalogProducts())
      setCatalogAvailable(true)
      setError(null)
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
      const offline = getEmergencyProductById(productId)
      if (offline) {
        return offline
      }
      setError((data?.error as string) || 'Failed to load product')
      return null
    } catch {
      const offline = getEmergencyProductById(productId)
      if (offline) return offline
      setError('Failed to load product')
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
    catalogAvailable,
    fetchProductById,
  }
}
