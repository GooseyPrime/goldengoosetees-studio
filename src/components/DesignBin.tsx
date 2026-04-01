import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { copy } from '@/lib/copy'
import { Badge } from '@/components/ui/badge'
import { DesignFile, Product } from '@/lib/types'
import { Pencil, Trash, CheckCircle, FolderOpen, UploadSimple } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface DesignBinProps {
  product: Product
  designFiles: DesignFile[]
  currentPrintArea?: string
  onSelectDesign: (printAreaId: string) => void
  onDeleteDesign: (printAreaId: string) => void
  onEditDesign?: (printAreaId: string) => void
  onUploadDesign?: (printAreaId: string) => void
  onOpenManager?: () => void
}

export function DesignBin({
  product,
  designFiles,
  currentPrintArea,
  onSelectDesign,
  onDeleteDesign,
  onEditDesign,
  onUploadDesign,
  onOpenManager,
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
    <Card className="p-4 glass-panel border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{copy.designProgress}</h3>
          <p className="text-sm text-muted-foreground">
            {copy.areasComplete(completedCount, totalCount)}
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
            className={`relative border rounded-2xl p-3 transition-all ${
              isCurrent
                ? 'border-primary/60 bg-primary/15'
                : isComplete
                ? 'border-white/15 bg-white/5'
                : 'border-dashed border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center overflow-hidden ${
                  isComplete ? 'border-green-500/70' : 'border-white/10'
                }`}
              >
                {design ? (
                  <img
                    src={design.dataUrl}
                    alt={area.name}
                    loading="lazy"
                    decoding="async"
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
                  {onUploadDesign && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUploadDesign(area.id)}
                      className="h-8 w-8 p-0"
                      title="Upload a new image"
                    >
                      <UploadSimple size={14} />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditDesign ? onEditDesign(area.id) : onSelectDesign(area.id)}
                    className="h-8 w-8 p-0"
                    title="Edit design"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteDesign(area.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete design"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              )}

              {!isComplete && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectDesign(area.id)}
                  >
                    Design
                  </Button>
                  {onUploadDesign && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUploadDesign(area.id)}
                      className="gap-1"
                    >
                      <UploadSimple size={14} />
                      Upload
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {completedCount > 0 && onOpenManager && (
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
            onClick={onOpenManager}
          >
            <FolderOpen size={18} />
            {copy.openDesignManager}
          </Button>
          <p className="text-xs text-muted-foreground text-center px-2">
            {copy.moreControlTip}
          </p>
        </div>
      )}

      {completedCount === totalCount && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle size={20} weight="fill" />
            <span className="font-medium">{copy.allAreasComplete}</span>
          </div>
        </motion.div>
      )}
    </Card>
  )
}
