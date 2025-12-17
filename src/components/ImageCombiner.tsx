import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  FloppyDisk,
  UploadSimple,
  Trash,
  ArrowsOutSimple,
  ArrowCounterClockwise,
  Eye,
  EyeSlash,
  ArrowUp,
  ArrowDown,
  Plus
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { DesignFile, Product } from '@/lib/types'

interface ImageCombinerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  printAreaId: string
  onSave: (design: DesignFile) => void
  existingDesign?: DesignFile
}

interface UploadedImage {
  id: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotation: number
  opacity: number
  visible: boolean
  zIndex: number
  name: string
}

export function ImageCombiner({ 
  open, 
  onOpenChange, 
  product, 
  printAreaId, 
  onSave,
  existingDesign 
}: ImageCombinerProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const printArea = product.printAreas.find(pa => pa.id === printAreaId)
  const canvasWidth = printArea ? printArea.widthInches * printArea.constraints.minDPI : 2400
  const canvasHeight = printArea ? printArea.heightInches * printArea.constraints.minDPI : 3000

  useEffect(() => {
    if (open) {
      if (existingDesign) {
        const img: UploadedImage = {
          id: 'existing-0',
          dataUrl: existingDesign.dataUrl,
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          originalWidth: canvasWidth,
          originalHeight: canvasHeight,
          rotation: 0,
          opacity: 100,
          visible: true,
          zIndex: 0,
          name: 'Existing Design'
        }
        setImages([img])
      } else {
        setImages([])
      }
      setSelectedImageId(null)
    }
  }, [open, existingDesign])

  useEffect(() => {
    renderCanvas()
  }, [images])

  const renderCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex)

    sortedImages.forEach(img => {
      if (!img.visible) return

      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        ctx.save()
        ctx.globalAlpha = img.opacity / 100

        const centerX = img.x + img.width / 2
        const centerY = img.y + img.height / 2

        ctx.translate(centerX, centerY)
        ctx.rotate((img.rotation * Math.PI) / 180)
        ctx.translate(-centerX, -centerY)

        ctx.drawImage(image, img.x, img.y, img.width, img.height)

        if (selectedImageId === img.id) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 4
          ctx.setLineDash([10, 5])
          ctx.strokeRect(img.x - 5, img.y - 5, img.width + 10, img.height + 10)
        }

        ctx.restore()
      }
      image.src = img.dataUrl
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        
        const img = new Image()
        img.onload = () => {
          const aspectRatio = img.width / img.height
          let width = Math.min(img.width, canvasWidth * 0.5)
          let height = width / aspectRatio

          if (height > canvasHeight * 0.5) {
            height = canvasHeight * 0.5
            width = height * aspectRatio
          }

          const newImage: UploadedImage = {
            id: `img-${Date.now()}-${index}`,
            dataUrl,
            x: (canvasWidth - width) / 2,
            y: (canvasHeight - height) / 2,
            width,
            height,
            originalWidth: img.width,
            originalHeight: img.height,
            rotation: 0,
            opacity: 100,
            visible: true,
            zIndex: images.length + index,
            name: file.name
          }

          setImages(prev => [...prev, newImage])
          toast.success(`Added ${file.name}`)
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const sortedImages = [...images].sort((a, b) => b.zIndex - a.zIndex)
    
    for (const img of sortedImages) {
      if (!img.visible) continue
      
      if (x >= img.x && x <= img.x + img.width && 
          y >= img.y && y <= img.y + img.height) {
        setSelectedImageId(img.id)
        return
      }
    }

    setSelectedImageId(null)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedImageId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsDragging(true)
    setDragStartPos({ x, y })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedImageId || !dragStartPos) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const deltaX = x - dragStartPos.x
    const deltaY = y - dragStartPos.y

    setImages(prev => prev.map(img => 
      img.id === selectedImageId
        ? { ...img, x: img.x + deltaX, y: img.y + deltaY }
        : img
    ))

    setDragStartPos({ x, y })
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setDragStartPos(null)
  }

  const selectedImage = images.find(img => img.id === selectedImageId)

  const updateSelectedImage = (updates: Partial<UploadedImage>) => {
    if (!selectedImageId) return

    setImages(prev => prev.map(img =>
      img.id === selectedImageId ? { ...img, ...updates } : img
    ))
  }

  const deleteSelectedImage = () => {
    if (!selectedImageId) return
    
    setImages(prev => prev.filter(img => img.id !== selectedImageId))
    setSelectedImageId(null)
    toast.success('Image removed')
  }

  const moveImageUp = () => {
    if (!selectedImageId) return
    
    setImages(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const selectedIndex = sorted.findIndex(img => img.id === selectedImageId)
      if (selectedIndex === sorted.length - 1) return prev

      const temp = sorted[selectedIndex].zIndex
      sorted[selectedIndex].zIndex = sorted[selectedIndex + 1].zIndex
      sorted[selectedIndex + 1].zIndex = temp

      return sorted
    })
  }

  const moveImageDown = () => {
    if (!selectedImageId) return
    
    setImages(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const selectedIndex = sorted.findIndex(img => img.id === selectedImageId)
      if (selectedIndex === 0) return prev

      const temp = sorted[selectedIndex].zIndex
      sorted[selectedIndex].zIndex = sorted[selectedIndex - 1].zIndex
      sorted[selectedIndex - 1].zIndex = temp

      return sorted
    })
  }

  const handleSave = () => {
    if (images.length === 0) {
      toast.error('Please add at least one image')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvasWidth
    finalCanvas.height = canvasHeight
    const ctx = finalCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

    const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex)
    
    let loadedCount = 0
    const totalImages = sortedImages.filter(img => img.visible).length

    if (totalImages === 0) {
      toast.error('Please make at least one image visible')
      return
    }

    sortedImages.forEach(img => {
      if (!img.visible) return

      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        ctx.save()
        ctx.globalAlpha = img.opacity / 100

        const centerX = img.x + img.width / 2
        const centerY = img.y + img.height / 2

        ctx.translate(centerX, centerY)
        ctx.rotate((img.rotation * Math.PI) / 180)
        ctx.translate(-centerX, -centerY)

        ctx.drawImage(image, img.x, img.y, img.width, img.height)
        ctx.restore()

        loadedCount++
        
        if (loadedCount === totalImages) {
          const design: DesignFile = {
            id: existingDesign?.id || `design-${Date.now()}`,
            printAreaId,
            dataUrl: finalCanvas.toDataURL('image/png'),
            format: 'PNG',
            widthPx: canvasWidth,
            heightPx: canvasHeight,
            dpi: printArea?.constraints.minDPI || 300,
            createdAt: existingDesign?.createdAt || new Date().toISOString()
          }

          onSave(design)
          toast.success('Combined design saved!')
          onOpenChange(false)
        }
      }
      image.src = img.dataUrl
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Plus size={24} weight="bold" className="text-primary" />
                Combine Multiple Images
              </DialogTitle>
              <DialogDescription>
                Upload and arrange multiple images to create your design - {printArea?.name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadSimple size={16} className="mr-2" />
                Upload Images
              </Button>
              <Button
                onClick={handleSave}
                disabled={images.length === 0}
                className="gap-2"
              >
                <FloppyDisk size={16} weight="fill" />
                Save Combined Design
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 p-6 bg-muted/30 flex items-center justify-center overflow-auto">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="max-w-full max-h-full border-2 border-border rounded-lg shadow-lg bg-white cursor-move"
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              
              {images.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-8 bg-background/90 rounded-lg border-2 border-dashed border-muted-foreground/30">
                    <UploadSimple size={48} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">No images added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Upload Images" to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-80 border-l bg-background overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-2">Layers ({images.length})</h3>
              <p className="text-xs text-muted-foreground">
                Click an image on the canvas or in the list to select it
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {images.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No images added
                  </div>
                ) : (
                  images.sort((a, b) => b.zIndex - a.zIndex).map((img) => (
                    <Card
                      key={img.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedImageId === img.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedImageId(img.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded border overflow-hidden flex-shrink-0">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{img.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Layer {img.zIndex + 1}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            const newVisible = !img.visible
                            setImages(prev =>
                              prev.map(i =>
                                i.id === img.id ? { ...i, visible: newVisible } : i
                              )
                            )
                          }}
                        >
                          {img.visible ? (
                            <Eye size={16} />
                          ) : (
                            <EyeSlash size={16} className="text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {selectedImage && (
              <div className="border-t p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Edit Selected</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={moveImageUp}
                      title="Move layer up"
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={moveImageDown}
                      title="Move layer down"
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={deleteSelectedImage}
                      title="Delete layer"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">Width</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {Math.round(selectedImage.width)}px
                      </Badge>
                    </div>
                    <Slider
                      value={[selectedImage.width]}
                      onValueChange={([width]) => {
                        const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight
                        updateSelectedImage({ width, height: width / aspectRatio })
                      }}
                      min={50}
                      max={canvasWidth}
                      step={10}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">Rotation</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {selectedImage.rotation}°
                      </Badge>
                    </div>
                    <Slider
                      value={[selectedImage.rotation]}
                      onValueChange={([rotation]) => updateSelectedImage({ rotation })}
                      min={-180}
                      max={180}
                      step={1}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">Opacity</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {selectedImage.opacity}%
                      </Badge>
                    </div>
                    <Slider
                      value={[selectedImage.opacity]}
                      onValueChange={([opacity]) => updateSelectedImage({ opacity })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight
                      let width = Math.min(selectedImage.originalWidth, canvasWidth * 0.5)
                      let height = width / aspectRatio

                      if (height > canvasHeight * 0.5) {
                        height = canvasHeight * 0.5
                        width = height * aspectRatio
                      }

                      updateSelectedImage({
                        width,
                        height,
                        x: (canvasWidth - width) / 2,
                        y: (canvasHeight - height) / 2,
                        rotation: 0,
                        opacity: 100
                      })
                    }}
                  >
                    <ArrowCounterClockwise size={14} className="mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </DialogContent>
    </Dialog>
  )
}
