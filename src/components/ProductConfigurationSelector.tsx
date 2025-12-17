import { useState } from 'react'
import { Product, ProductConfiguration } from '@/lib/types'
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

  const handleContinue = () => {
    const config = product.configurations.find(c => c.id === selectedConfig)
    if (config) {
      onSelect(config)
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
      className="max-w-4xl mx-auto"
    >
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-6"
      >
        ← Back to Products
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Card className="overflow-hidden border-2">
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

        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Choose Print Location</h2>
            <p className="text-muted-foreground">
              Select where you'd like your custom design printed
            </p>
          </div>

          <RadioGroup value={selectedConfig} onValueChange={setSelectedConfig}>
            <div className="space-y-3">
              {product.configurations.map((config) => {
                const price = getConfigurationPrice(config)
                const isSelected = selectedConfig === config.id
                
                return (
                  <motion.div
                    key={config.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      htmlFor={config.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <RadioGroupItem value={config.id} id={config.id} />
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1">
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
                          className="font-mono text-base px-3 py-1"
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

          <div className="mt-8 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex gap-3">
              <Sparkle size={24} weight="duotone" className="text-accent shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-accent-foreground mb-1">
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
            className="w-full mt-6 text-lg h-14"
            onClick={handleContinue}
            disabled={!selectedConfig}
          >
            Start Designing
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            No refunds or cancellations after order completion
          </p>
        </div>
      </div>
    </motion.div>
  )
}
