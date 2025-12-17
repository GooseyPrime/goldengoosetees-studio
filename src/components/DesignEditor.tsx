import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
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
  Rectangle,
  Pencil,
  TextAa,
  ArrowsOutSimple,
  ArrowsInSimple
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface DesignEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: DesignFile
  product: Product
  onSave: (updatedDesign: DesignFile) => void
}

type EditTool = 'move' | 'brightness' | 'contrast' | 'saturation' | 'erase' | 'draw' | 'text' | 'shape'

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

export function DesignEditor({ open, onOpenChange, design, product, onSave }: DesignEditorProps) {
  const [currentDesign, setCurrentDesign] = useState<DesignFile>(design)
  const [selectedTool, setSelectedTool] = useState<EditTool>('move')
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

  useEffect(() => {
    if (open && design) {
      setCurrentDesign(design)
      setHistory([{
        dataUrl: design.dataUrl,
        filters: { ...filters }
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

  const applyFilters = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const filterString = `
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      blur(${filters.blur}px)
    `.trim()

    canvas.style.filter = filterString
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

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      dataUrl,
      filters: { ...filters }
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
    const canvas = canvasRef.current
    if (!canvas) return

    const updatedDesign: DesignFile = {
      ...currentDesign,
      dataUrl: canvas.toDataURL('image/png')
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
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit Design</DialogTitle>
                <DialogDescription>
                  {printArea?.name} - {printArea?.widthInches}" × {printArea?.heightInches}"
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                >
                  <ArrowCounterClockwise size={16} className="mr-2" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                >
                  Redo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setShowAIDialog(true)}
                  className="gap-2"
                >
                  <MagicWand size={16} weight="fill" />
                  AI Edit
                </Button>
                <Button
                  onClick={handleSave}
                  className="gap-2"
                >
                  <FloppyDisk size={16} weight="fill" />
                  Save
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-6 bg-muted/30 flex items-center justify-center overflow-auto">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full border-2 border-border rounded-lg shadow-lg bg-white"
                  style={{
                    transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease'
                  }}
                />
              </div>
            </div>

            <div className="w-80 border-l bg-background overflow-y-auto">
              <Tabs defaultValue="adjustments" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="adjustments" className="flex-1">
                    Adjust
                  </TabsTrigger>
                  <TabsTrigger value="transform" className="flex-1">
                    Transform
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="adjustments" className="p-4 space-y-6">
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
                    className="w-full"
                    onClick={saveToHistory}
                  >
                    Apply Changes
                  </Button>
                </TabsContent>

                <TabsContent value="transform" className="p-4 space-y-6">
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
                      Transform adjustments are preview only. Use AI Edit or apply filters to permanently modify the design.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg">
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
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIEdit}
                disabled={isAILoading || !aiPrompt.trim()}
                className="flex-1"
              >
                {isAILoading ? 'Editing...' : 'Apply AI Edit'}
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
