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

export function usePrintfulCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [catalogAvailable, setCatalogAvailable] = useState<boolean | null>(null)

  const parseJsonResponse = async (res: Response): Promise<any> => {
    const text = await res.text()
    if (!text?.trim()) {
      throw new Error(
        res.ok
          ? 'Catalog returned an empty response. Please try again.'
          : 'Catalog service is temporarily unavailable. Please try again.'
      )
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(
        res.ok
          ? 'Catalog returned an invalid response. Please try again.'
          : 'Catalog service is temporarily unavailable. Please try again.'
      )
    }
  }

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/printful/catalog/categories')
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to fetch categories')
      setCategories(data.categories || [])
      setCatalogAvailable((data.categories?.length ?? 0) > 0)
    } catch (err) {
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
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to fetch products')
      const list = data.products || []
      setProducts(list)
      setCatalogAvailable(list.length >= 0)
    } catch (err: any) {
      setError(err?.message || 'Failed to load catalog')
      setProducts([])
      setCatalogAvailable(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProductById = useCallback(async (productId: string): Promise<Product | null> => {
    setLoadingProduct(productId)
    setError(null)
    try {
      const res = await fetch(`/api/printful/catalog/product/${productId}`)
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to fetch product')
      return data.product as Product
    } catch (err: any) {
      setError(err?.message || 'Failed to load product')
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
