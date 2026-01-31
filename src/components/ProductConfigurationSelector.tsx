import { useState } from 'react'
import { Product, ProductConfiguration, ProductColor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Sparkle, ArrowRight, Check } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProductConfigurationSelectorProps {
  product: Product
  onSelect: (config: ProductConfiguration) => void
  onBack: () => void
}

export function ProductConfigurationSelector({ 
  product, 
  onSelect, 
  onBack 
}: ProductConfigurationSelectorProps) {
  const [selectedConfig, setSelectedConfig] = useState<string>(product.configurations[0]?.id || '')
  const [selectedSize, setSelectedSize] = useState<string>(product.availableSizes[0] || '')
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.availableColors[0])

  const handleContinue = () => {
    const config = product.configurations.find(c => c.id === selectedConfig)
    if (config) {
      const configWithSelections: ProductConfiguration = {
        ...config,
        size: selectedSize,
        color: selectedColor.name
      }
      onSelect(configWithSelections)
    }
  }

  const getConfigurationPrice = (config: ProductConfiguration) => {
    return product.basePrice + config.priceModifier
  }

  const getPrintAreasDescription = (config: ProductConfiguration) => {
    const areas = product.printAreas.filter(pa => config.printAreas.includes(pa.id))
    return areas.map(a => a.name).join(' + ')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto"
    >
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-6 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
      >
        ← Back to Products
      </Button>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
          <Card className="overflow-hidden glass-panel sticky top-24 border border-white/10">
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{product.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {product.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-lg shrink-0">
                  ${product.basePrice}+
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Select Size</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred size
            </p>
            
            <div className="flex flex-wrap gap-2">
              {product.availableSizes.map((size) => (
                <motion.button
                  key={size}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "px-5 py-2.5 rounded-full border text-sm font-medium transition-all min-w-[70px] backdrop-blur",
                    selectedSize === size
                      ? "border-primary/60 bg-primary/20 text-foreground shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      : "border-white/10 bg-white/5 text-foreground/80 hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Select Color</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred color
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {product.availableColors.map((color) => (
                <motion.button
                  key={color.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedColor(color)}
                  disabled={!color.available}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-full border transition-all backdrop-blur",
                    selectedColor.name === color.name
                      ? "border-primary/60 bg-primary/15"
                      : "border-white/10 bg-white/5 hover:border-primary/40",
                    !color.available && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: color.hexCode }}
                  />
                  <span className="font-medium text-sm">{color.name}</span>
                  {selectedColor.name === color.name && (
                    <Check size={16} weight="bold" className="ml-auto text-primary" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Choose Print Location</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select where you'd like your custom design printed
            </p>

            <RadioGroup value={selectedConfig} onValueChange={setSelectedConfig}>
              <div className="space-y-3">
                {product.configurations.map((config) => {
                  const price = getConfigurationPrice(config)
                  const isSelected = selectedConfig === config.id
                  
                  return (
                    <motion.div
                      key={config.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Label
                        htmlFor={config.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all glass-surface",
                          isSelected 
                            ? "border-primary/60 bg-primary/10" 
                            : "border-white/10 hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <RadioGroupItem value={config.id} id={config.id} />
                          <div className="flex-1">
                            <div className="font-semibold text-base mb-1">
                              {config.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getPrintAreasDescription(config)}
                            </div>
                            {config.priceModifier > 0 && (
                              <div className="text-xs text-accent mt-1 font-medium">
                                +${config.priceModifier.toFixed(2)} additional
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={isSelected ? "default" : "secondary"}
                            className="font-mono px-3 py-1 rounded-full"
                          >
                            ${price.toFixed(2)}
                          </Badge>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                            >
                              <Check size={16} weight="bold" className="text-primary-foreground" />
                            </motion.div>
                          )}
                        </div>
                      </Label>
                    </motion.div>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          <div className="p-4 rounded-2xl glass-surface border border-white/10">
            <div className="flex gap-3">
              <Sparkle size={24} weight="duotone" className="text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  AI Design Assistant Ready
                </p>
                <p className="text-muted-foreground">
                  Our AI will guide you through creating the perfect design for your selected print areas
                </p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-lg h-14 rounded-full"
            onClick={handleContinue}
            disabled={!selectedConfig || !selectedSize || !selectedColor}
          >
            Start Designing
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            No refunds or cancellations after order completion
          </p>
        </div>
      </div>
    </motion.div>
  )
}
