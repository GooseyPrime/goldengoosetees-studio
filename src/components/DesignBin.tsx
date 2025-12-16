import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DesignFile, Product } from '@/lib/types'
import { Pencil, Trash, CheckCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface DesignBinProps {
  product: Product
  designFiles: DesignFile[]
  currentPrintArea?: string
  onSelectDesign: (printAreaId: string) => void
  onDeleteDesign: (printAreaId: string) => void
}

export function DesignBin({
  product,
  designFiles,
  currentPrintArea,
  onSelectDesign,
  onDeleteDesign,
}: DesignBinProps) {
  const printAreasWithDesigns = product.printAreas.map((area) => {
    const design = designFiles.find((df) => df.printAreaId === area.id)
    return {
      area,
      design,
      isComplete: !!design,
      isCurrent: area.id === currentPrintArea,
    }
  })

  const completedCount = printAreasWithDesigns.filter((p) => p.isComplete).length
  const totalCount = printAreasWithDesigns.length

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Design Progress</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} areas complete
          </p>
        </div>
        <Badge variant={completedCount === totalCount ? 'default' : 'secondary'}>
          {Math.round((completedCount / totalCount) * 100)}%
        </Badge>
      </div>

      <div className="space-y-3">
        {printAreasWithDesigns.map(({ area, design, isComplete, isCurrent }) => (
          <motion.div
            key={area.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative border rounded-lg p-3 transition-all ${
              isCurrent
                ? 'border-primary bg-primary/5'
                : isComplete
                ? 'border-border bg-background'
                : 'border-dashed border-muted-foreground/30 bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-16 h-16 rounded border-2 flex items-center justify-center overflow-hidden ${
                  isComplete ? 'border-green-500' : 'border-muted-foreground/30'
                }`}
              >
                {design ? (
                  <img
                    src={design.dataUrl}
                    alt={area.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-1">
                    No Design
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{area.name}</h4>
                  {isComplete && (
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {area.widthInches}" × {area.heightInches}" ({area.position})
                </p>
                {design && (
                  <p className="text-xs text-muted-foreground">
                    {design.format} • {design.dpi} DPI
                  </p>
                )}
              </div>

              {isComplete && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectDesign(area.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteDesign(area.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              )}

              {!isComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectDesign(area.id)}
                  className="shrink-0"
                >
                  Design
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {completedCount === totalCount && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle size={20} weight="fill" />
            <span className="font-medium">All areas complete! Ready for checkout.</span>
          </div>
        </motion.div>
      )}
    </Card>
  )
}
