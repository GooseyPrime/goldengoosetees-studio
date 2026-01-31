import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageEditor } from './ImageEditor'
import { ImageCombiner } from './ImageCombiner'
import { DesignFile, Product } from '@/lib/types'
import { 
  Pencil, 
  Trash, 
  CheckCircle, 
  Plus,
  Eye,
  ArrowLeft,
  Package,
  Image as ImageIcon,
  Images
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface DesignManagerPageProps {
  product: Product
  designFiles: DesignFile[]
  onUpdateDesign: (updatedDesign: DesignFile) => void
  onDeleteDesign: (printAreaId: string) => void
  onAddNewDesign: (printAreaId: string) => void
  onBack: () => void
}

export function DesignManagerPage({
  product,
  designFiles,
  onUpdateDesign,
  onDeleteDesign,
  onAddNewDesign,
  onBack
}: DesignManagerPageProps) {
  const [selectedDesign, setSelectedDesign] = useState<DesignFile | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showCombiner, setShowCombiner] = useState(false)
  const [combinerPrintAreaId, setCombinerPrintAreaId] = useState<string | null>(null)
  const [previewDesign, setPreviewDesign] = useState<DesignFile | null>(null)

  const printAreasWithDesigns = product.printAreas.map((area) => {
    const design = designFiles.find((df) => df.printAreaId === area.id)
    return {
      area,
      design,
      isComplete: !!design
    }
  })

  const completedCount = printAreasWithDesigns.filter((p) => p.isComplete).length
  const totalCount = printAreasWithDesigns.length

  const handleEditDesign = (design: DesignFile) => {
    setSelectedDesign(design)
    setShowEditor(true)
  }

  const handleSaveDesign = (updatedDesign: DesignFile) => {
    onUpdateDesign(updatedDesign)
    setShowEditor(false)
    setSelectedDesign(null)
  }

  const handleDeleteDesign = (printAreaId: string) => {
    if (confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
      onDeleteDesign(printAreaId)
      toast.success('Design deleted')
    }
  }

  const handleOpenCombiner = (printAreaId: string, existingDesign?: DesignFile) => {
    setCombinerPrintAreaId(printAreaId)
    if (existingDesign) {
      setSelectedDesign(existingDesign)
    }
    setShowCombiner(true)
  }

  const handleSaveCombinedDesign = (design: DesignFile) => {
    onUpdateDesign(design)
    setShowCombiner(false)
    setCombinerPrintAreaId(null)
    setSelectedDesign(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Design Manager</h2>
            <p className="text-muted-foreground">
              Edit and manage all design components for {product.name}
            </p>
          </div>
        </div>
        
        <Card className="px-4 py-2 glass-panel border border-white/10">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">Progress</div>
              <div className="text-xs text-muted-foreground">
                {completedCount} of {totalCount} complete
              </div>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - completedCount / totalCount)}`}
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {Math.round((completedCount / totalCount) * 100)}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-panel border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={24} weight="duotone" />
              Product Information
            </CardTitle>
            <CardDescription>
              Design specifications and requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <Badge variant="secondary" className="mt-2 font-mono">
                  ${product.basePrice}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <h4 className="font-semibold text-sm">Print Areas</h4>
              <div className="grid grid-cols-2 gap-2">
                {product.printAreas.map((area) => (
                  <div 
                    key={area.id}
                    className="p-3 border rounded-2xl glass-surface"
                  >
                    <div className="font-medium text-sm">{area.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {area.widthInches}" × {area.heightInches}"
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {area.constraints.minDPI}-{area.constraints.maxDPI} DPI
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon size={24} weight="duotone" />
              Design Preview
            </CardTitle>
            <CardDescription>
              {previewDesign 
                ? `Viewing: ${product.printAreas.find(pa => pa.id === previewDesign.printAreaId)?.name}`
                : 'Select a design to preview'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] bg-gradient-to-br from-white/5 to-black/40 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
              {previewDesign ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-full p-8"
                >
                  <img 
                    src={previewDesign.dataUrl}
                    alt="Design preview"
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              ) : (
                <div className="text-center space-y-2 p-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Eye size={36} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click on a design below to preview
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border border-white/10">
        <CardHeader>
          <CardTitle>Design Components</CardTitle>
          <CardDescription>
            Manage all design files for each print area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {printAreasWithDesigns.map(({ area, design, isComplete }) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative border rounded-2xl p-4 transition-all hover:shadow-md glass-surface ${
                  isComplete
                    ? 'border-white/15'
                    : 'border-dashed border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`relative w-24 h-24 rounded-2xl border-2 flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                      isComplete 
                        ? 'border-green-500/70 hover:border-green-500' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    onClick={() => design && setPreviewDesign(design)}
                  >
                    {design ? (
                      <>
                        <img
                          src={design.dataUrl}
                          alt={area.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Eye 
                            size={24} 
                            weight="fill" 
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">
                        No Design
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base">{area.name}</h4>
                      {isComplete && (
                        <CheckCircle size={20} weight="fill" className="text-green-500" />
                      )}
                      <Badge variant="outline" className="ml-auto text-xs border-white/20">
                        {area.position}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {area.widthInches}" × {area.heightInches}" • {area.constraints.minDPI}-{area.constraints.maxDPI} DPI
                    </p>
                    {design && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">
                          {design.format}
                        </Badge>
                        <Badge variant="secondary">
                          {design.widthPx} × {design.heightPx}px
                        </Badge>
                        <Badge variant="secondary">
                          {design.dpi} DPI
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isComplete ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => design && handleEditDesign(design)}
                          className="gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                        >
                          <Pencil size={16} />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => design && handleOpenCombiner(area.id, design)}
                          className="gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          title="Combine with other images"
                        >
                          <Images size={16} />
                          Combine
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDesign(area.id)}
                          className="gap-2 rounded-full border-white/20 bg-white/5 text-destructive hover:text-destructive hover:bg-white/10"
                        >
                          <Trash size={16} />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onAddNewDesign(area.id)}
                          className="gap-2 rounded-full"
                        >
                          <Plus size={16} weight="bold" />
                          Create Design
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCombiner(area.id)}
                          className="gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          title="Upload and combine multiple images"
                        >
                          <Images size={16} />
                          Upload Images
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {completedCount === totalCount && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle size={24} weight="fill" />
                <div>
                  <div className="font-semibold">All Designs Complete!</div>
                  <div className="text-sm">
                    All print areas have been designed. You're ready to proceed to checkout.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {selectedDesign && (
        <ImageEditor
          open={showEditor}
          onOpenChange={setShowEditor}
          design={selectedDesign}
          product={product}
          onSave={handleSaveDesign}
        />
      )}

      {combinerPrintAreaId && (
        <ImageCombiner
          open={showCombiner}
          onOpenChange={setShowCombiner}
          product={product}
          printAreaId={combinerPrintAreaId}
          onSave={handleSaveCombinedDesign}
          existingDesign={selectedDesign || undefined}
        />
      )}
    </div>
  )
}
