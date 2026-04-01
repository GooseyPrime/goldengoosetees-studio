import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProductCard } from '@/components/ProductCard'
import { Badge } from '@/components/ui/badge'
import { usePrintfulCatalog, type CatalogProductSummary } from '@/hooks/usePrintfulCatalog'
import { Product } from '@/lib/types'
import { copy } from '@/lib/copy'
import { responsiveImageSources } from '@/lib/image-urls'
import { motion } from 'framer-motion'
import { SpinnerGap } from '@phosphor-icons/react'

interface CatalogBrowserProps {
  onSelectProduct: (product: Product) => void
  fallbackProducts?: Product[]
}

function CatalogProductCard({
  summary,
  onSelect,
  isLoading,
}: {
  summary: CatalogProductSummary
  onSelect: () => void
  isLoading: boolean
}) {
  const img = responsiveImageSources(summary.imageUrl)
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="overflow-hidden cursor-pointer glass-panel transition-shadow duration-200 border border-white/10 hover:border-primary/40 hover:shadow-2xl"
        onClick={onSelect}
      >
        <div className="aspect-square overflow-hidden bg-muted relative">
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            alt={summary.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <SpinnerGap size={32} weight="bold" className="animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight">{summary.name}</h3>
            <Badge variant="secondary" className="font-mono shrink-0">
              ${summary.basePrice.toFixed(2)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {summary.category}
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

export function CatalogBrowser({
  onSelectProduct,
  fallbackProducts = [],
}: CatalogBrowserProps) {
  const {
    products,
    categories,
    selectedCategoryId,
    selectCategory,
    loading,
    loadingProduct,
    error,
    catalogAvailable,
    fetchProductById,
  } = usePrintfulCatalog()

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = async (productId: string) => {
    setSelectedId(productId)
    const fullProduct = await fetchProductById(productId)
    setSelectedId(null)
    if (fullProduct) {
      onSelectProduct(fullProduct)
    }
  }

  const useFallback = catalogAvailable === false || (catalogAvailable === null && !loading)
  const displayProducts = useFallback ? fallbackProducts : products

  if (useFallback && fallbackProducts.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fallbackProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategoryId === null ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => selectCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => selectCategory(cat.id)}
            >
              {cat.title}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <SpinnerGap size={40} weight="bold" className="animate-spin text-primary" />
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">
            {error || 'No products available. Check your connection and try again.'}
          </p>
          <Button
            variant="outline"
            onClick={() => selectCategory(selectedCategoryId)}
            className="rounded-full"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(displayProducts as CatalogProductSummary[]).map((item: CatalogProductSummary) => (
            <CatalogProductCard
              key={item.id}
              summary={item}
              onSelect={() => handleSelect(item.id)}
              isLoading={loadingProduct === item.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
