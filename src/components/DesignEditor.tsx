import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DesignFile, Product } from '@/lib/types'
import { 
  X, 
  ArrowCounterClockwise, 
  FloppyDisk,
  MagicWand,
  Eraser,
  Palette,
  SunDim,
  Drop,
  Circle,
  ArrowsOutSimple
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { copy } from '@/lib/copy'

interface DesignEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: DesignFile
  product: Product
  products: Product[]
  onSwitchProduct: (productId: string) => void
  onSave: (updatedDesign: DesignFile) => void
}

interface EditHistory {
  dataUrl: string
  filters: ImageFilters
}

interface ImageFilters {
  brightness: number
  contrast: number
  saturation: number
  blur: number
}

export function DesignEditor({
  open,
  onOpenChange,
  design,
  product,
  products,
  onSwitchProduct,
  onSave
}: DesignEditorProps) {
  const [currentDesign, setCurrentDesign] = useState<DesignFile>(design)
  const [history, setHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [showAIDialog, setShowAIDialog] = useState(false)
  
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  })
  
  const [scale, setScale] = useState(100)
  const [rotation, setRotation] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const printArea = product.printAreas.find(pa => pa.id === design.printAreaId)
  const canvasAspectRatio = printArea ? printArea.widthInches / printArea.heightInches : 1

  useEffect(() => {
    if (open && design) {
      setCurrentDesign(design)
      setScale(100)
      setRotation(0)
      setFilters({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
      })
      setHistory([{
        dataUrl: design.dataUrl,
        filters: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0
        }
      }])
      setHistoryIndex(0)
      loadImageToCanvas(design.dataUrl)
    }
  }, [open, design])

  const loadImageToCanvas = (imageUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    img.src = imageUrl
  }

  const getFilterString = () => `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturation}%)
    blur(${filters.blur}px)
  `.trim()

  const applyFilters = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.filter = getFilterString()
  }

  useEffect(() => {
    applyFilters()
  }, [filters])

  const handleFilterChange = (filterName: keyof ImageFilters, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  const renderCanvas = (options: { scale?: number; rotation?: number; applyFilters?: boolean }) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const scaleFactor = (options.scale ?? 100) / 100
    const rotationDegrees = options.rotation ?? 0
    const radians = (rotationDegrees * Math.PI) / 180
    const sourceWidth = canvas.width
    const sourceHeight = canvas.height
    const scaledWidth = sourceWidth * scaleFactor
    const scaledHeight = sourceHeight * scaleFactor
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))
    const outputWidth = Math.max(1, Math.round(scaledWidth * cos + scaledHeight * sin))
    const outputHeight = Math.max(1, Math.round(scaledWidth * sin + scaledHeight * cos))

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputWidth
    outputCanvas.height = outputHeight

    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return null

    ctx.filter = options.applyFilters ? getFilterString() : 'none'
    ctx.translate(outputWidth / 2, outputHeight / 2)
    ctx.rotate(radians)
    ctx.drawImage(canvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

    return outputCanvas
  }

  const saveToHistory = () => {
    const outputCanvas = renderCanvas({ applyFilters: true })
    if (!outputCanvas) return

    const dataUrl = outputCanvas.toDataURL('image/png')
    loadImageToCanvas(dataUrl)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      dataUrl,
      filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0 }
    })

    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0
    })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const prevState = history[prevIndex]
      setHistoryIndex(prevIndex)
      loadImageToCanvas(prevState.dataUrl)
      setFilters(prevState.filters)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      setHistoryIndex(nextIndex)
      loadImageToCanvas(nextState.dataUrl)
      setFilters(nextState.filters)
    }
  }

  const handleAIEdit = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to change')
      return
    }

    setIsAILoading(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const currentImage = canvas.toDataURL()
      
      const editedImageUrl = await api.ai.editDesign(
        currentImage,
        aiPrompt,
        printArea?.constraints || { minDPI: 300, maxDPI: 300, formats: ['PNG'], maxFileSizeMB: 10, colorMode: 'RGB' }
      )

      loadImageToCanvas(editedImageUrl)
      saveToHistory()
      setAiPrompt('')
      setShowAIDialog(false)
      toast.success('AI edit applied!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply AI edit')
    } finally {
      setIsAILoading(false)
    }
  }

  const handleSave = () => {
    const outputCanvas = renderCanvas({ scale, rotation, applyFilters: true })
    if (!outputCanvas) return

    const widthPx = outputCanvas.width
    const heightPx = outputCanvas.height
    const dpi = printArea
      ? Math.round(Math.min(widthPx / printArea.widthInches, heightPx / printArea.heightInches))
      : currentDesign.dpi

    const updatedDesign: DesignFile = {
      ...currentDesign,
      dataUrl: outputCanvas.toDataURL('image/png'),
      widthPx,
      heightPx,
      dpi
    }

    onSave(updatedDesign)
    toast.success('Design saved!')
    onOpenChange(false)
  }

  const handleReset = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0
    })
    setScale(100)
    setRotation(0)
    loadImageToCanvas(design.dataUrl)
    toast.info('Reset to original')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="relative max-w-6xl h-[90vh] p-0 pb-20 flex flex-col overflow-hidden glass-panel border border-white/10">
          <DialogHeader className="px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold">{copy.editDesign}</DialogTitle>
                <DialogDescription>
                  {printArea?.name} - {printArea?.widthInches}" x {printArea?.heightInches}"
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={product.id} onValueChange={onSwitchProduct}>
                  <SelectTrigger className="h-8 rounded-full border-white/20 bg-white/5 px-3 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full text-foreground/70 hover:text-foreground"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-6 bg-white/5 flex items-center justify-center overflow-auto">
              <div className="relative" style={{ aspectRatio: `${canvasAspectRatio}` }}>
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full border border-white/10 rounded-2xl shadow-2xl bg-white"
                  style={{
                    transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease'
                  }}
                />
              </div>
            </div>

            <div className="w-80 border-l border-white/10 bg-white/5 overflow-y-auto">
              <Tabs defaultValue="adjustments" className="w-full">
                <TabsList className="w-full justify-start rounded-full border border-white/10 bg-white/5 p-1 mx-4 mt-4">
                  <TabsTrigger
                    value="adjustments"
                    className="flex-1 rounded-full data-[state=active]:bg-primary/20 data-[state=active]:text-foreground"
                  >
                    Adjust
                  </TabsTrigger>
                  <TabsTrigger
                    value="transform"
                    className="flex-1 rounded-full data-[state=active]:bg-primary/20 data-[state=active]:text-foreground"
                  >
                    Transform
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="adjustments" className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <SunDim size={18} />
                      <Label>Brightness</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {filters.brightness}%
                      </Badge>
                    </div>
                    <Slider
                      value={[filters.brightness]}
                      onValueChange={([value]) => handleFilterChange('brightness', value)}
                      min={0}
                      max={200}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Circle size={18} />
                      <Label>Contrast</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {filters.contrast}%
                      </Badge>
                    </div>
                    <Slider
                      value={[filters.contrast]}
                      onValueChange={([value]) => handleFilterChange('contrast', value)}
                      min={0}
                      max={200}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Palette size={18} />
                      <Label>Saturation</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {filters.saturation}%
                      </Badge>
                    </div>
                    <Slider
                      value={[filters.saturation]}
                      onValueChange={([value]) => handleFilterChange('saturation', value)}
                      min={0}
                      max={200}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Drop size={18} />
                      <Label>Blur</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {filters.blur}px
                      </Badge>
                    </div>
                    <Slider
                      value={[filters.blur]}
                      onValueChange={([value]) => handleFilterChange('blur', value)}
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                    onClick={saveToHistory}
                  >
                    {copy.applyChanges}
                  </Button>
                </TabsContent>

                <TabsContent value="transform" className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ArrowsOutSimple size={18} />
                      <Label>Scale</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {scale}%
                      </Badge>
                    </div>
                    <Slider
                      value={[scale]}
                      onValueChange={([value]) => setScale(value)}
                      min={10}
                      max={200}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Circle size={18} />
                      <Label>Rotation</Label>
                      <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {rotation}°
                      </Badge>
                    </div>
                    <Slider
                      value={[rotation]}
                      onValueChange={([value]) => setRotation(value)}
                      min={-180}
                      max={180}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Transform adjustments are applied when you save. Use AI Edit or Apply Changes to permanently modify the design.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="rounded-full text-foreground/70 hover:text-foreground"
                title="Undo"
              >
                <ArrowCounterClockwise size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="rounded-full text-foreground/70 hover:text-foreground"
                title="Redo"
              >
                <ArrowCounterClockwise size={18} className="rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="rounded-full text-foreground/70 hover:text-foreground"
                title="Reset"
              >
                <Eraser size={18} />
              </Button>
              <div className="h-6 w-px bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIDialog(true)}
                className="rounded-full px-4 text-foreground/80 hover:text-foreground"
              >
                <MagicWand size={16} weight="fill" className="mr-2 text-primary" />
                AI Edit
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="rounded-full px-4 font-semibold"
              >
                <FloppyDisk size={16} weight="fill" className="mr-2" />
                {copy.saveChanges}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg glass-panel border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MagicWand size={24} weight="fill" className="text-primary" />
              AI Edit Design
            </DialogTitle>
            <DialogDescription>
              Describe what you'd like to change or add to your design
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Edit Instructions</Label>
              <Textarea
                id="ai-prompt"
                placeholder="e.g., 'Add a glowing effect', 'Change colors to warm tones', 'Remove background', 'Add sparkles around the edges'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="resize-none bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIDialog(false)}
                className="flex-1 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIEdit}
                disabled={isAILoading || !aiPrompt.trim()}
                className="flex-1 rounded-full"
              >
                {isAILoading ? copy.brewingMagic : copy.applyAiEdit}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Tip: Be specific about what you want. The AI works best with clear, detailed instructions.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
