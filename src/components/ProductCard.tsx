import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Product } from '@/lib/types'
import { responsiveImageSources } from '@/lib/image-urls'
import { motion } from 'framer-motion'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer glass-panel transition-shadow duration-200 border border-white/10 hover:border-primary/40 hover:shadow-2xl"
        onClick={() => onSelect(product)}
      >
        <div className="aspect-square overflow-hidden bg-muted">
          <img 
            src={img.src}
            srcSet={img.srcSet}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
            <Badge variant="secondary" className="font-mono shrink-0">
              ${product.basePrice}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {product.configurations.length} option{product.configurations.length !== 1 ? 's' : ''}
            </Badge>
            {product.configurations.length > 1 && (
              <span className="text-xs text-muted-foreground">
                from ${product.basePrice}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
