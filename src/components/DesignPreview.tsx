import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { DesignFile, Product } from '@/lib/types'
import { printfulService } from '@/lib/printful'
import { TShirt, CheckCircle, ImageSquare, Spinner, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

// T-Shirt SVG Mockup Template Component
interface TShirtMockupProps {
  color: string
  designUrl?: string
  position?: 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
}

function TShirtMockup({ color, designUrl, position = 'front' }: TShirtMockupProps) {
  // Calculate design position based on print area
  const getDesignArea = () => {
    switch (position) {
      case 'front':
        return { x: 145, y: 180, width: 210, height: 280 }
      case 'back':
        return { x: 145, y: 180, width: 210, height: 280 }
      case 'left_sleeve':
        return { x: 30, y: 140, width: 60, height: 80 }
      case 'right_sleeve':
        return { x: 410, y: 140, width: 60, height: 80 }
      default:
        return { x: 145, y: 180, width: 210, height: 280 }
    }
  }

  const designArea = getDesignArea()

  // Determine if we need light or dark outline based on color brightness
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }

  const rgb = hexToRgb(color)
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  const strokeColor = brightness < 128 ? '#666666' : '#333333'
  const stitchColor = brightness < 128 ? '#555555' : '#CCCCCC'

  return (
    <svg viewBox="0 0 500 600" className="w-full h-full" style={{ maxWidth: '400px' }}>
      <defs>
        {/* Fabric texture pattern */}
        <pattern id="fabricTexture" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill={color} />
          <circle cx="1" cy="1" r="0.5" fill="rgba(0,0,0,0.02)" />
          <circle cx="3" cy="3" r="0.5" fill="rgba(255,255,255,0.02)" />
        </pattern>

        {/* Shadow gradient */}
        <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'rgba(0,0,0,0.1)' }} />
          <stop offset="50%" style={{ stopColor: 'rgba(0,0,0,0)' }} />
          <stop offset="100%" style={{ stopColor: 'rgba(0,0,0,0.1)' }} />
        </linearGradient>

        {/* Clip path for design */}
        <clipPath id="designClip">
          <rect x={designArea.x} y={designArea.y} width={designArea.width} height={designArea.height} rx="5" />
        </clipPath>
      </defs>

      {/* T-Shirt body */}
      <path
        d="M 250 60
           C 220 60 200 70 180 80
           L 120 110
           C 100 120 80 130 60 150
           L 40 200
           C 35 220 40 240 50 250
           L 80 240
           L 90 200
           L 100 180
           L 100 520
           C 100 540 110 550 130 550
           L 370 550
           C 390 550 400 540 400 520
           L 400 180
           L 410 200
           L 420 240
           L 450 250
           C 460 240 465 220 460 200
           L 440 150
           C 420 130 400 120 380 110
           L 320 80
           C 300 70 280 60 250 60
           Z"
        fill={color}
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Fabric texture overlay */}
      <path
        d="M 250 60
           C 220 60 200 70 180 80
           L 120 110
           C 100 120 80 130 60 150
           L 40 200
           C 35 220 40 240 50 250
           L 80 240
           L 90 200
           L 100 180
           L 100 520
           C 100 540 110 550 130 550
           L 370 550
           C 390 550 400 540 400 520
           L 400 180
           L 410 200
           L 420 240
           L 450 250
           C 460 240 465 220 460 200
           L 440 150
           C 420 130 400 120 380 110
           L 320 80
           C 300 70 280 60 250 60
           Z"
        fill="url(#fabricTexture)"
        opacity="0.3"
      />

      {/* Shadow for depth */}
      <path
        d="M 250 60
           C 220 60 200 70 180 80
           L 120 110
           C 100 120 80 130 60 150
           L 40 200
           C 35 220 40 240 50 250
           L 80 240
           L 90 200
           L 100 180
           L 100 520
           C 100 540 110 550 130 550
           L 370 550
           C 390 550 400 540 400 520
           L 400 180
           L 410 200
           L 420 240
           L 450 250
           C 460 240 465 220 460 200
           L 440 150
           C 420 130 400 120 380 110
           L 320 80
           C 300 70 280 60 250 60
           Z"
        fill="url(#shadowGradient)"
      />

      {/* Collar */}
      <path
        d="M 200 70
           Q 250 100 300 70"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
      />

      {/* Collar inner */}
      <path
        d="M 210 75
           Q 250 95 290 75"
        fill="none"
        stroke={stitchColor}
        strokeWidth="1"
        strokeDasharray="3,2"
      />

      {/* Left sleeve seam */}
      <path
        d="M 100 180 L 80 240"
        stroke={stitchColor}
        strokeWidth="1"
        strokeDasharray="4,3"
      />

      {/* Right sleeve seam */}
      <path
        d="M 400 180 L 420 240"
        stroke={stitchColor}
        strokeWidth="1"
        strokeDasharray="4,3"
      />

      {/* Bottom hem stitch */}
      <path
        d="M 130 540 L 370 540"
        stroke={stitchColor}
        strokeWidth="1"
        strokeDasharray="4,3"
      />

      {/* Design placement area indicator (dashed when no design) */}
      {!designUrl && (
        <g>
          <rect
            x={designArea.x}
            y={designArea.y}
            width={designArea.width}
            height={designArea.height}
            fill="none"
            stroke={stitchColor}
            strokeWidth="1"
            strokeDasharray="8,4"
            rx="5"
            opacity="0.5"
          />
          <text
            x={designArea.x + designArea.width / 2}
            y={designArea.y + designArea.height / 2}
            textAnchor="middle"
            fill={stitchColor}
            fontSize="14"
            opacity="0.6"
          >
            Design Area
          </text>
          <text
            x={designArea.x + designArea.width / 2}
            y={designArea.y + designArea.height / 2 + 20}
            textAnchor="middle"
            fill={stitchColor}
            fontSize="11"
            opacity="0.5"
          >
            12" × 16"
          </text>
        </g>
      )}

      {/* Design image */}
      {designUrl && (
        <g clipPath="url(#designClip)">
          <image
            href={designUrl}
            x={designArea.x}
            y={designArea.y}
            width={designArea.width}
            height={designArea.height}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}

      {/* Position label */}
      <text
        x="250"
        y="580"
        textAnchor="middle"
        fill="#666"
        fontSize="14"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
      >
        {position.toUpperCase().replace('_', ' ')}
      </text>
    </svg>
  )
}

interface DesignPreviewProps {
  product?: Product
  designFiles: DesignFile[]
  currentArea?: string
  showMockupOption?: boolean
  selectedColor?: string
  selectedSize?: string
}

export function DesignPreview({
  product,
  designFiles,
  currentArea,
  showMockupOption = false,
  selectedColor,
  selectedSize
}: DesignPreviewProps) {
  const [useMockup, setUseMockup] = useState(false)
  const [mockupPreferenceSet, setMockupPreferenceSet] = useState(false)
  const [mockupUrl, setMockupUrl] = useState<string | null>(null)
  const [isLoadingMockup, setIsLoadingMockup] = useState(false)
  const [mockupError, setMockupError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const uploadedUrlCacheRef = useRef<Map<string, string>>(new Map())

  // Prefer Printful mockup by default (required), but don't fight explicit user choice.
  useEffect(() => {
    if (mockupPreferenceSet) return
    
    const checkPrintfulConfig = async () => {
      if (showMockupOption && designFiles.length > 0) {
        const isConfigured = await printfulService.isConfigured()
        if (isConfigured) {
          setUseMockup(true)
          setMockupPreferenceSet(true)
        }
      }
    }
    
    checkPrintfulConfig()
  }, [designFiles.length, mockupPreferenceSet, showMockupOption])

  // Generate Printful mockup when enabled and design is available
  useEffect(() => {
    if (!useMockup || !product || designFiles.length === 0) {
      return
    }

    const generateMockup = async () => {
      setIsLoadingMockup(true)
      setMockupError(null)

      try {
        // Use the current print area design when possible (so placement matches)
        const currentDesignFile =
          designFiles.find(df => df.printAreaId === currentArea) || designFiles[0]
        if (!currentDesignFile) {
          setMockupError('No design available')
          setIsLoadingMockup(false)
          return
        }

        // Determine placement from the product's print area definition (default front).
        const printArea = product.printAreas.find(pa => pa.id === currentDesignFile.printAreaId)
        const placement =
          (printArea?.position as 'front' | 'back' | 'left_sleeve' | 'right_sleeve') || 'front'

        // Product.printfulSKU is documented as the Printful *variant id*.
        const variantId = parseInt(product.printfulSKU, 10)
        if (!Number.isFinite(variantId)) {
          throw new Error('Missing or invalid Printful variant ID for this product.')
        }

        // Printful mockup generator requires both product_id and variant_id.
        const variant = await printfulService.getVariant(variantId)
        const productId = variant.product_id

        // Printful mockup generator requires a remotely accessible image URL.
        // If we only have a data URL, upload it to Printful Files first.
        let designUrl = currentDesignFile.storageUrl || currentDesignFile.dataUrl
        if (designUrl.startsWith('data:')) {
          const cached = uploadedUrlCacheRef.current.get(currentDesignFile.id)
          if (cached) {
            designUrl = cached
          } else {
            const response = await fetch(designUrl)
            const blob = await response.blob()
            const ext = blob.type.includes('jpeg') ? 'jpg' : 'png'
            const uploaded = await printfulService.uploadFile(blob, `preview-${currentDesignFile.id}.${ext}`)
            uploadedUrlCacheRef.current.set(currentDesignFile.id, uploaded.url)
            designUrl = uploaded.url
          }
        }

        const result = await printfulService.generateMockup(
          productId,
          variantId,
          designUrl,
          { placement }
        )

        if (!result.mockup_url) {
          throw new Error('Printful did not return a mockup image.')
        }
        setMockupUrl(result.mockup_url)
      } catch (error) {
        console.error('Mockup generation failed:', error)
        setMockupUrl(null)
        setMockupError('Printful mockup unavailable right now — showing simple preview instead.')
        // Graceful fallback: switch to simple view but keep the warning visible.
        setUseMockup(false)
      } finally {
        setIsLoadingMockup(false)
      }
    }

    generateMockup()
  }, [useMockup, product, designFiles, currentArea])

  useEffect(() => {
    setZoom(100)
  }, [currentArea, useMockup])
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
  
  // Get the selected color object for display
  const selectedColorObj = selectedColor 
    ? product.availableColors.find(c => c.name === selectedColor)
    : product.availableColors[0] || { name: 'White', hexCode: '#FFFFFF', available: true }

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {currentPrintArea ? currentPrintArea.name : 'Design Preview'}
            </p>
            {selectedColor && selectedSize && (
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: selectedColorObj?.hexCode }}
                  title={selectedColor}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedColor} • {selectedSize}
                </span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="font-mono">
            ${product.basePrice}
          </Badge>
        </div>
      </div>

      <div className="flex-1 relative bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-8 overflow-auto">
          {/* Mockup view */}
          {useMockup && mockupUrl ? (
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full max-w-md"
              >
                <img
                  src={mockupUrl}
                  alt="Product mockup"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Printful Mockup
                </Badge>
              </motion.div>
            </div>
          ) : useMockup && isLoadingMockup ? (
            <div className="text-center space-y-4">
              <Spinner size={48} className="animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Generating mockup...</p>
            </div>
          ) : (
            /* T-Shirt Mockup Template View */
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-md flex items-center justify-center p-4"
              >
                <div className="w-full bg-gradient-to-b from-white/50 to-gray-100/50 rounded-xl p-4 shadow-lg">
                  <TShirtMockup
                    color={selectedColorObj?.hexCode || '#FFFFFF'}
                    designUrl={currentDesign ? (currentDesign.storageUrl || currentDesign.dataUrl) : undefined}
                    position={currentArea?.includes('back') ? 'back' :
                             currentArea?.includes('left') ? 'left_sleeve' :
                             currentArea?.includes('right') ? 'right_sleeve' : 'front'}
                  />
                  {mockupError && (
                    <div className="mt-3 flex items-center justify-center">
                      <Badge variant="outline" className="text-xs">
                        {mockupError}
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Mockup toggle button */}
        {showMockupOption && printfulService.isConfigured() && designFiles.length > 0 && (
          <div className="absolute top-4 left-4">
            <Button
              variant={useMockup ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setUseMockup((v) => !v)
                setMockupPreferenceSet(true)
              }}
              disabled={isLoadingMockup}
            >
              <ImageSquare size={16} className="mr-2" />
              {useMockup ? 'Use Simple Preview' : 'Show Printful Mockup'}
            </Button>
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-background/90 border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Zoom</span>
            <span className="text-xs font-mono">{zoom}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
            >
              <MagnifyingGlassMinus size={14} />
            </Button>
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={50}
              max={200}
              step={10}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
            >
              <MagnifyingGlassPlus size={14} />
            </Button>
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
