import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DesignFile, Product } from '@/lib/types'
import { TShirt, CheckCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface DesignPreviewProps {
  product?: Product
  designFiles: DesignFile[]
  currentArea?: string
}

export function DesignPreview({ product, designFiles, currentArea }: DesignPreviewProps) {
  if (!product) {
    return (
      <Card className="flex-1 flex items-center justify-center p-12 bg-muted/30">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <TShirt size={48} weight="duotone" className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Select a Product</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a T-shirt to start designing
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const currentDesign = designFiles.find(df => df.printAreaId === currentArea)
  const currentPrintArea = product.printAreas.find(pa => pa.id === currentArea)

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {currentPrintArea ? currentPrintArea.name : 'Design Preview'}
            </p>
          </div>
          <Badge variant="secondary" className="font-mono">
            ${product.basePrice}
          </Badge>
        </div>
      </div>

      <div className="flex-1 relative bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative w-full max-w-md aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {currentDesign && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center p-12"
              >
                <div className="w-3/5 aspect-[3/4] flex items-center justify-center">
                  <img 
                    src={currentDesign.dataUrl} 
                    alt="Design preview"
                    className="max-w-full max-h-full object-contain drop-shadow-lg"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t bg-muted/10">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Print Areas</h4>
          <div className="flex flex-wrap gap-2">
            {product.printAreas.map((area) => {
              const hasDesign = designFiles.some(df => df.printAreaId === area.id)
              const isActive = area.id === currentArea
              
              return (
                <Badge
                  key={area.id}
                  variant={isActive ? 'default' : hasDesign ? 'secondary' : 'outline'}
                  className="flex items-center gap-1"
                >
                  {hasDesign && <CheckCircle size={14} weight="fill" />}
                  {area.name}
                </Badge>
              )
            })}
          </div>
          {currentPrintArea && (
            <div className="text-xs text-muted-foreground pt-2">
              Max: {currentPrintArea.widthInches}" × {currentPrintArea.heightInches}" • 
              {currentPrintArea.constraints.minDPI}-{currentPrintArea.constraints.maxDPI} DPI • 
              {currentPrintArea.constraints.formats.join(', ')}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
