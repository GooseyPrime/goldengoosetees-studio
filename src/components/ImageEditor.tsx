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
import { ScrollArea } from '@/components/ui/scroll-area'
import { DesignFile, Product } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Scissors,
  Sparkle,
  Square,
  Triangle,
  Star,
  Heart,
  Polygon
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { copy } from '@/lib/copy'

interface ImageEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: DesignFile
  product: Product
  onSave: (updatedDesign: DesignFile) => void
}

type EditTool = 'select' | 'crop' | 'draw' | 'erase' | 'text' | 'shape' | 'removeBackground'

interface EditHistory {
  dataUrl: string
  filters: ImageFilters
  elements: CanvasElement[]
}

interface ImageFilters {
  brightness: number
  contrast: number
  saturation: number
  blur: number
}

interface CanvasElement {
  id: string
  type: 'text' | 'shape' | 'drawing'
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  color: string
  rotation?: number
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'polygon'
  strokeWidth?: number
  points?: { x: number; y: number }[]
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageEditor({ open, onOpenChange, design, product, onSave }: ImageEditorProps) {
  const [currentDesign, setCurrentDesign] = useState<DesignFile>(design)
  const [selectedTool, setSelectedTool] = useState<EditTool>('select')
  const [history, setHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  })
  
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  
  const [textInput, setTextInput] = useState('')
  const [textColor, setTextColor] = useState('#000000')
  const [textSize, setTextSize] = useState(48)
  const [textFont, setTextFont] = useState('Space Grotesk')
  
  const [shapeType, setShapeType] = useState<'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'polygon'>('rectangle')
  const [shapeColor, setShapeColor] = useState('#000000')
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)
  
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([])
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const printArea = product.printAreas.find(pa => pa.id === design.printAreaId)

  useEffect(() => {
    if (open && design) {
      setCurrentDesign(design)
      setHistory([{
        dataUrl: design.dataUrl,
        filters: { ...filters },
        elements: []
      }])
      setHistoryIndex(0)
      setElements([])
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
      renderOverlay()
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

  useEffect(() => {
    renderOverlay()
  }, [elements, selectedElement, cropArea])

  const renderOverlay = () => {
    const overlay = overlayCanvasRef.current
    const canvas = canvasRef.current
    if (!overlay || !canvas) return

    overlay.width = canvas.width
    overlay.height = canvas.height
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    elements.forEach(element => {
      ctx.save()
      
      if (element.type === 'text' && element.text) {
        ctx.font = `${element.fontSize || 48}px ${element.fontFamily || 'Space Grotesk'}`
        ctx.fillStyle = element.color
        ctx.fillText(element.text, element.x, element.y)
        
        if (selectedElement === element.id) {
          const metrics = ctx.measureText(element.text)
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 5, element.y - (element.fontSize || 48) - 5, 
                        metrics.width + 10, (element.fontSize || 48) + 10)
        }
      } else if (element.type === 'shape') {
        ctx.fillStyle = element.color
        ctx.strokeStyle = element.color
        ctx.lineWidth = element.strokeWidth || 2

        const centerX = element.x + (element.width || 100) / 2
        const centerY = element.y + (element.height || 100) / 2

        ctx.translate(centerX, centerY)
        if (element.rotation) {
          ctx.rotate((element.rotation * Math.PI) / 180)
        }
        ctx.translate(-centerX, -centerY)

        switch (element.shapeType) {
          case 'rectangle':
            ctx.fillRect(element.x, element.y, element.width || 100, element.height || 100)
            break
          case 'circle':
            ctx.beginPath()
            ctx.arc(element.x + (element.width || 100) / 2, 
                   element.y + (element.height || 100) / 2,
                   (element.width || 100) / 2, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'triangle':
            ctx.beginPath()
            ctx.moveTo(element.x + (element.width || 100) / 2, element.y)
            ctx.lineTo(element.x + (element.width || 100), element.y + (element.height || 100))
            ctx.lineTo(element.x, element.y + (element.height || 100))
            ctx.closePath()
            ctx.fill()
            break
          case 'star':
            drawStar(ctx, element.x + (element.width || 100) / 2, 
                    element.y + (element.height || 100) / 2, 5, 
                    (element.width || 100) / 2, (element.width || 100) / 4)
            ctx.fill()
            break
          case 'heart':
            drawHeart(ctx, element.x + (element.width || 100) / 2, 
                     element.y + (element.height || 100) / 2, 
                     (element.width || 100) / 2)
            ctx.fill()
            break
        }

        if (selectedElement === element.id) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 5, element.y - 5, 
                        (element.width || 100) + 10, (element.height || 100) + 10)
        }
      } else if (element.type === 'drawing' && element.points) {
        ctx.strokeStyle = element.color
        ctx.lineWidth = element.strokeWidth || 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        ctx.beginPath()
        element.points.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.stroke()
      }

      ctx.restore()
    })

    if (cropArea && isCropping) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, overlay.width, overlay.height)
      ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
      
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
    }
  }

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  }

  const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath()
    const topCurveHeight = size * 0.3
    ctx.moveTo(cx, cy + topCurveHeight)
    ctx.bezierCurveTo(
      cx, cy, 
      cx - size / 2, cy - topCurveHeight,
      cx - size / 2, cy + topCurveHeight
    )
    ctx.bezierCurveTo(
      cx - size / 2, cy + (size + topCurveHeight) / 2,
      cx, cy + (size + topCurveHeight * 1.3) / 2,
      cx, cy + size
    )
    ctx.bezierCurveTo(
      cx, cy + (size + topCurveHeight * 1.3) / 2,
      cx + size / 2, cy + (size + topCurveHeight) / 2,
      cx + size / 2, cy + topCurveHeight
    )
    ctx.bezierCurveTo(
      cx + size / 2, cy - topCurveHeight,
      cx, cy,
      cx, cy + topCurveHeight
    )
    ctx.closePath()
  }

  const handleFilterChange = (filterName: keyof ImageFilters, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvas.width
    finalCanvas.height = canvas.height
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) return

    finalCtx.filter = canvas.style.filter
    finalCtx.drawImage(canvas, 0, 0)
    
    const overlay = overlayCanvasRef.current
    if (overlay) {
      finalCtx.filter = 'none'
      finalCtx.drawImage(overlay, 0, 0)
    }

    const dataUrl = finalCanvas.toDataURL('image/png')
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      dataUrl,
      filters: { ...filters },
      elements: [...elements]
    })
    
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    toast.success('Changes applied')
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const prevState = history[prevIndex]
      setHistoryIndex(prevIndex)
      loadImageToCanvas(prevState.dataUrl)
      setFilters(prevState.filters)
      setElements(prevState.elements)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      setHistoryIndex(nextIndex)
      loadImageToCanvas(nextState.dataUrl)
      setFilters(nextState.filters)
      setElements(nextState.elements)
    }
  }

  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const newElement: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: textInput,
      x: canvas.width / 2 - 100,
      y: canvas.height / 2,
      fontSize: textSize,
      fontFamily: textFont,
      color: textColor,
      rotation: 0
    }

    setElements(prev => [...prev, newElement])
    setTextInput('')
    toast.success('Text added')
  }

  const handleAddShape = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const newElement: CanvasElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      shapeType,
      x: canvas.width / 2 - 50,
      y: canvas.height / 2 - 50,
      width: 100,
      height: 100,
      color: shapeColor,
      strokeWidth: shapeStrokeWidth,
      rotation: 0
    }

    setElements(prev => [...prev, newElement])
    toast.success('Shape added')
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height

    if (selectedTool === 'crop') {
      setIsCropping(true)
      setCropArea({ x, y, width: 0, height: 0 })
    } else if (selectedTool === 'draw') {
      setIsDrawing(true)
      setDrawPoints([{ x, y }])
    } else if (selectedTool === 'erase') {
      const mainCanvas = canvasRef.current
      if (!mainCanvas) return
      const ctx = mainCanvas.getContext('2d')
      if (!ctx) return
      
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, drawSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height

    if (isCropping && cropArea) {
      setCropArea({
        ...cropArea,
        width: x - cropArea.x,
        height: y - cropArea.y
      })
    } else if (isDrawing && selectedTool === 'draw') {
      setDrawPoints(prev => [...prev, { x, y }])
    } else if (selectedTool === 'erase' && e.buttons === 1) {
      const mainCanvas = canvasRef.current
      if (!mainCanvas) return
      const ctx = mainCanvas.getContext('2d')
      if (!ctx) return
      
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, drawSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const handleCanvasMouseUp = () => {
    if (isCropping && cropArea && cropArea.width > 10 && cropArea.height > 10) {
      applyCrop()
    }
    
    if (isDrawing && drawPoints.length > 1) {
      const newElement: CanvasElement = {
        id: `drawing-${Date.now()}`,
        type: 'drawing',
        x: 0,
        y: 0,
        color: drawColor,
        strokeWidth: drawSize,
        points: drawPoints
      }
      setElements(prev => [...prev, newElement])
    }
    
    setIsCropping(false)
    setIsDrawing(false)
    setDrawPoints([])
  }

  const applyCrop = () => {
    if (!cropArea) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
    
    canvas.width = cropArea.width
    canvas.height = cropArea.height
    ctx.putImageData(imageData, 0, 0)
    
    setCropArea(null)
    setIsCropping(false)
    saveToHistory()
  }

  const handleRemoveBackground = async () => {
    setIsProcessing(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const imageData = canvas.toDataURL()
      const result = await api.ai.removeBackground(imageData)
      
      loadImageToCanvas(result)
      saveToHistory()
      toast.success('Background removed! Your design is ready.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove background')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteElement = () => {
    if (selectedElement) {
      setElements(prev => prev.filter(el => el.id !== selectedElement))
      setSelectedElement(null)
      toast.success('Element deleted')
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvas.width
    finalCanvas.height = canvas.height
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) return

    finalCtx.filter = canvas.style.filter
    finalCtx.drawImage(canvas, 0, 0)
    
    const overlay = overlayCanvasRef.current
    if (overlay) {
      finalCtx.filter = 'none'
      finalCtx.drawImage(overlay, 0, 0)
    }

    const updatedDesign: DesignFile = {
      ...currentDesign,
      dataUrl: finalCanvas.toDataURL('image/png')
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
    setElements([])
    setCropArea(null)
    loadImageToCanvas(design.dataUrl)
    toast.info('Reset to original')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Advanced Image Editor</DialogTitle>
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
                {copy.resetAll}
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2"
              >
                <FloppyDisk size={16} weight="fill" />
                {copy.saveChanges}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-20 border-r bg-muted/30 flex flex-col items-center py-4 gap-2">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('select')}
              title="Select"
            >
              <ArrowsOutSimple size={20} />
            </Button>
            <Button
              variant={selectedTool === 'crop' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('crop')}
              title="Crop"
            >
              <Scissors size={20} />
            </Button>
            <Button
              variant={selectedTool === 'removeBackground' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                setSelectedTool('removeBackground')
                handleRemoveBackground()
              }}
              disabled={isProcessing}
              title="Remove Background"
            >
              <Sparkle size={20} weight="fill" />
            </Button>
            <Button
              variant={selectedTool === 'draw' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('draw')}
              title="Draw"
            >
              <Pencil size={20} />
            </Button>
            <Button
              variant={selectedTool === 'erase' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('erase')}
              title="Erase"
            >
              <Eraser size={20} />
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('text')}
              title="Add Text"
            >
              <TextAa size={20} />
            </Button>
            <Button
              variant={selectedTool === 'shape' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setSelectedTool('shape')}
              title="Add Shape"
            >
              <Square size={20} />
            </Button>
            {selectedElement && (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDeleteElement}
                title="Delete Selected"
                className="mt-auto"
              >
                <X size={20} />
              </Button>
            )}
          </div>

          <div className="flex-1 p-6 bg-muted/30 flex items-center justify-center overflow-auto">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full border-2 border-border rounded-lg shadow-lg bg-white"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 max-w-full max-h-full border-2 border-transparent rounded-lg pointer-events-auto"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{ cursor: selectedTool === 'draw' || selectedTool === 'erase' ? 'crosshair' : 'default' }}
              />
            </div>
          </div>

          <div className="w-80 border-l bg-background overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Tabs defaultValue="adjustments" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="adjustments" className="flex-1 text-xs">
                    Adjust
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1 text-xs">
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="shapes" className="flex-1 text-xs">
                    Shapes
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

                  {selectedTool === 'draw' && (
                    <>
                      <div className="pt-4 border-t space-y-3">
                        <Label>Draw Color</Label>
                        <Input
                          type="color"
                          value={drawColor}
                          onChange={(e) => setDrawColor(e.target.value)}
                          className="h-12 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Label>Brush Size</Label>
                          <Badge variant="secondary" className="ml-auto font-mono text-xs">
                            {drawSize}px
                          </Badge>
                        </div>
                        <Slider
                          value={[drawSize]}
                          onValueChange={([value]) => setDrawSize(value)}
                          min={1}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  {selectedTool === 'erase' && (
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Label>Eraser Size</Label>
                        <Badge variant="secondary" className="ml-auto font-mono text-xs">
                          {drawSize}px
                        </Badge>
                      </div>
                      <Slider
                        value={[drawSize]}
                        onValueChange={([value]) => setDrawSize(value)}
                        min={5}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={saveToHistory}
                  >
                    {copy.applyChanges}
                  </Button>
                </TabsContent>

                <TabsContent value="text" className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-input">Text Content</Label>
                    <Input
                      id="text-input"
                      placeholder="Enter text..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-font">Font</Label>
                    <Select value={textFont} onValueChange={setTextFont}>
                      <SelectTrigger id="text-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Size</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {textSize}px
                      </Badge>
                    </div>
                    <Slider
                      value={[textSize]}
                      onValueChange={([value]) => setTextSize(value)}
                      min={12}
                      max={200}
                      step={2}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-color">Color</Label>
                    <Input
                      id="text-color"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-12 cursor-pointer"
                    />
                  </div>

                  <Button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="w-full"
                  >
                    <TextAa size={20} className="mr-2" />
                    Add Text
                  </Button>
                </TabsContent>

                <TabsContent value="shapes" className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Shape Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={shapeType === 'rectangle' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('rectangle')}
                        className="aspect-square p-2"
                      >
                        <Rectangle size={24} />
                      </Button>
                      <Button
                        variant={shapeType === 'circle' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('circle')}
                        className="aspect-square p-2"
                      >
                        <Circle size={24} />
                      </Button>
                      <Button
                        variant={shapeType === 'triangle' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('triangle')}
                        className="aspect-square p-2"
                      >
                        <Triangle size={24} />
                      </Button>
                      <Button
                        variant={shapeType === 'star' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('star')}
                        className="aspect-square p-2"
                      >
                        <Star size={24} />
                      </Button>
                      <Button
                        variant={shapeType === 'heart' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('heart')}
                        className="aspect-square p-2"
                      >
                        <Heart size={24} />
                      </Button>
                      <Button
                        variant={shapeType === 'polygon' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeType('polygon')}
                        className="aspect-square p-2"
                      >
                        <Polygon size={24} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shape-color">Color</Label>
                    <Input
                      id="shape-color"
                      type="color"
                      value={shapeColor}
                      onChange={(e) => setShapeColor(e.target.value)}
                      className="h-12 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Stroke Width</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {shapeStrokeWidth}px
                      </Badge>
                    </div>
                    <Slider
                      value={[shapeStrokeWidth]}
                      onValueChange={([value]) => setShapeStrokeWidth(value)}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <Button
                    onClick={handleAddShape}
                    className="w-full"
                  >
                    <Square size={20} className="mr-2" />
                    Add Shape
                  </Button>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
