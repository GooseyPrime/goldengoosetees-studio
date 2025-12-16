import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductCard } from '@/components/ProductCard'
import { ChatInterface } from '@/components/ChatInterface'
import { DesignPreview } from '@/components/DesignPreview'
import { AuthDialog } from '@/components/AuthDialog'
import { CheckoutFlow } from '@/components/CheckoutFlow'
import { AdminDashboard } from '@/components/AdminDashboard'
import { MOCK_PRODUCTS } from '@/lib/mock-data'
import { MOCK_ORDERS, MOCK_PENDING_DESIGNS } from '@/lib/admin-mock-data'
import { api } from '@/lib/api'
import { 
  Product, 
  User, 
  ChatMessage, 
  DesignFile,
  Design,
  DesignSession 
} from '@/lib/types'
import { 
  TShirt, 
  Sparkle, 
  User as UserIcon,
  ShoppingCart,
  UploadSimple,
  Gear
} from '@phosphor-icons/react'
import { toast, Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [currentUser, setCurrentUser] = useKV<User | null>('current-user', null)
  const [savedDesigns, setSavedDesigns] = useKV<Design[]>('saved-designs', [])
  const [activeView, setActiveView] = useState<'products' | 'design' | 'catalog'>('products')
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([])
  const [currentPrintArea, setCurrentPrintArea] = useState<string>()
  
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [requiresAgeVerification, setRequiresAgeVerification] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [pendingAction, setPendingAction] = useState<'checkout' | 'publish' | null>(null)
  
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null)

  useEffect(() => {
    const initializeAdminData = async () => {
      const products = await window.spark.kv.get<Product[]>('admin-products')
      if (!products || products.length === 0) {
        await window.spark.kv.set('admin-products', MOCK_PRODUCTS)
      }

      const orders = await window.spark.kv.get('admin-orders')
      if (!orders) {
        await window.spark.kv.set('admin-orders', MOCK_ORDERS)
      }

      const pendingDesigns = await window.spark.kv.get('pending-designs')
      if (!pendingDesigns) {
        await window.spark.kv.set('pending-designs', MOCK_PENDING_DESIGNS)
      }

      const existingUser = await api.auth.getCurrentUser()
      if (existingUser && !currentUser) {
        setCurrentUser(existingUser)
      }
    }

    initializeAdminData()
  }, [])

  useEffect(() => {
    if (selectedProduct && messages.length === 0) {
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: api.ai.getInitialMessage(selectedProduct),
        timestamp: new Date().toISOString()
      }
      setMessages([initialMessage])
      setCurrentPrintArea(selectedProduct.printAreas[0]?.id)
    }
  }, [selectedProduct, messages.length])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setActiveView('design')
    setMessages([])
    setDesignFiles([])
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    
    setMessages((prev) => [...prev, userMessage])
    setIsAILoading(true)

    try {
      const response = await api.ai.chat(
        [...messages, userMessage],
        selectedProduct || undefined,
        currentPrintArea
      )
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }
      
      setMessages((prev) => [...prev, assistantMessage])

      if (api.ai.shouldGenerateDesign(content)) {
        await generateDesign(content)
      } else if (api.ai.shouldShowApproval(content) && designFiles.length > 0) {
        const approvalMessage: ChatMessage = {
          id: `msg-${Date.now() + 2}`,
          role: 'assistant',
          content: api.ai.getApprovalMessage(),
          timestamp: new Date().toISOString()
        }
        setMessages((prev) => [...prev, approvalMessage])
      }
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setIsAILoading(false)
    }
  }

  const generateDesign = async (prompt: string) => {
    if (!selectedProduct || !currentPrintArea) return

    toast.info('Generating your design...', { duration: 2000 })

    try {
      const printArea = selectedProduct.printAreas.find(pa => pa.id === currentPrintArea)
      if (!printArea) return

      const designUrl = await api.ai.generateDesign(prompt, printArea.constraints)
      
      const newDesign: DesignFile = {
        id: `design-${Date.now()}`,
        printAreaId: currentPrintArea,
        dataUrl: designUrl,
        format: 'SVG',
        widthPx: printArea.widthInches * printArea.constraints.minDPI,
        heightPx: printArea.heightInches * printArea.constraints.minDPI,
        dpi: printArea.constraints.minDPI,
        createdAt: new Date().toISOString()
      }

      setDesignFiles((prev) => {
        const filtered = prev.filter(df => df.printAreaId !== currentPrintArea)
        return [...filtered, newDesign]
      })

      toast.success('Design generated! Check the preview.')
    } catch (error) {
      toast.error('Failed to generate design')
    }
  }

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setPendingAction('checkout')
      setShowAuthDialog(true)
      return
    }

    if (currentDesign) {
      setShowCheckout(true)
    } else {
      saveDesignAndCheckout()
    }
  }

  const handlePublishToCatalog = () => {
    if (!currentUser) {
      setPendingAction('publish')
      setShowAuthDialog(true)
      return
    }

    saveDesignToCatalog()
  }

  const saveDesignAndCheckout = async () => {
    if (!selectedProduct) return

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      files: designFiles,
      isPublic: false,
      isNSFW: false,
      title: `Custom ${selectedProduct.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const saved = await api.designs.save(design)
      setCurrentDesign(saved)
      setShowCheckout(true)
    } catch (error) {
      toast.error('Failed to save design')
    }
  }

  const saveDesignToCatalog = async () => {
    if (!selectedProduct) return

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      files: designFiles,
      isPublic: true,
      isNSFW: false,
      title: `Custom ${selectedProduct.name}`,
      catalogSection: 'sfw-graphics',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const saved = await api.designs.save(design)
      setSavedDesigns((prev) => [...(prev || []), saved])
      toast.success('Design published to catalog!')
      
      setSelectedProduct(null)
      setActiveView('products')
      setMessages([])
      setDesignFiles([])
    } catch (error) {
      toast.error('Failed to publish design')
    }
  }

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user)
    
    if (pendingAction === 'checkout') {
      saveDesignAndCheckout()
    } else if (pendingAction === 'publish') {
      saveDesignToCatalog()
    }
    
    setPendingAction(null)
  }

  const handleCheckoutComplete = (orderId: string) => {
    toast.success('Order complete! Check your email for tracking info.')
    setSelectedProduct(null)
    setActiveView('products')
    setMessages([])
    setDesignFiles([])
    setCurrentDesign(null)
  }

  const hasDesignsForAllRequiredAreas = () => {
    if (!selectedProduct) return false
    return selectedProduct.printAreas.every(area => 
      designFiles.some(df => df.printAreaId === area.id)
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      
      {showAdminDashboard ? (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      ) : (
        <>
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <TShirt size={24} weight="duotone" className="text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">GoldenGooseTees</h1>
                  <p className="text-xs text-muted-foreground">AI Design Kiosk</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentUser?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdminDashboard(true)}
                  >
                    <Gear size={16} className="mr-2" />
                    Admin
                  </Button>
                )}
                {currentUser ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                    <UserIcon size={16} weight="fill" />
                    <span className="text-sm font-medium">{currentUser.name}</span>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAuthDialog(true)}
                  >
                    <UserIcon size={16} className="mr-2" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="container mx-auto px-6 py-8">
            <AnimatePresence mode="wait">
              {activeView === 'products' && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="mb-8 text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl font-bold mb-3 tracking-tight">
                      Design Your Perfect Tee
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Choose a product and let our AI assistant help you create a custom design
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {MOCK_PRODUCTS.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={handleProductSelect}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {activeView === 'design' && selectedProduct && (
                <motion.div
                  key="design"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveView('products')
                        setSelectedProduct(null)
                        setMessages([])
                        setDesignFiles([])
                      }}
                    >
                      ← Back to Products
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handlePublishToCatalog}
                        disabled={designFiles.length === 0}
                      >
                        <UploadSimple size={20} className="mr-2" />
                        Publish to Catalog
                      </Button>
                      <Button
                        onClick={handleProceedToCheckout}
                        disabled={!hasDesignsForAllRequiredAreas()}
                        className="gap-2"
                      >
                        <ShoppingCart size={20} weight="fill" />
                        Proceed to Checkout
                        <Badge variant="secondary" className="font-mono">
                          ${selectedProduct.basePrice}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6 min-h-[600px]">
                    <DesignPreview
                      product={selectedProduct}
                      designFiles={designFiles}
                      currentArea={currentPrintArea}
                    />

                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isAILoading}
                    />
                  </div>

                  {!hasDesignsForAllRequiredAreas() && designFiles.length > 0 && selectedProduct && (
                    <div className="p-4 bg-accent/10 border border-accent rounded-lg text-center">
                      <p className="text-sm text-accent-foreground">
                        Complete designs for all print areas before checkout: {
                          selectedProduct.printAreas
                            .filter(pa => !designFiles.some(df => df.printAreaId === pa.id))
                            .map(pa => pa.name)
                            .join(', ')
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <AuthDialog
            open={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            onAuthenticated={handleAuthenticated}
            requiresAgeVerification={requiresAgeVerification}
          />

          {showCheckout && currentUser && selectedProduct && currentDesign && (
            <CheckoutFlow
              open={showCheckout}
              onOpenChange={setShowCheckout}
              design={currentDesign}
              product={selectedProduct}
              user={currentUser}
              onComplete={handleCheckoutComplete}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App