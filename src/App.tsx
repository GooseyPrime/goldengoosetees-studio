import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppKV } from '@/hooks/useAppKV'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/ProductCard'
import { ProductConfigurationSelector } from '@/components/ProductConfigurationSelector'
import { ChatInterface } from '@/components/ChatInterface'
import { DesignPreview } from '@/components/DesignPreview'
import { DesignBin } from '@/components/DesignBin'
import { DesignEditor } from '@/components/DesignEditor'
import { AuthDialog } from '@/components/AuthDialog'
import { CheckoutFlow } from '@/components/CheckoutFlow'
import { AdminDashboard } from '@/components/AdminDashboard'
import { DesignManagerPage } from '@/components/DesignManagerPage'
import { DesignPreferencesForm, DesignPreferences, preferencesToPrompt } from '@/components/DesignPreferencesForm'
import { AccountDialog } from '@/components/AccountDialog'
import { MOCK_PRODUCTS } from '@/lib/mock-data'
import { MOCK_PENDING_DESIGNS } from '@/lib/admin-mock-data'
import { api } from '@/lib/api'
import { kvService } from '@/lib/kv'
import {
  Product,
  ProductConfiguration,
  PrintArea,
  User,
  ChatMessage,
  DesignFile,
  Design
} from '@/lib/types'
import {
  TShirt,
  Sparkle,
  User as UserIcon,
  ShoppingCart,
  UploadSimple,
  Gear,
  FolderOpen,
  MagicWand,
} from '@phosphor-icons/react'
import { toast, Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import logoImage from '@/assets/images/GoldenGooseTees.jpg'

// Helper to detect if we're returning from OAuth redirect
const isOAuthRedirect = () => {
  return window.location.hash?.includes('access_token') ||
         window.location.search?.includes('code=')
}

function App() {
  const [currentUser, setCurrentUser] = useAppKV<User | null>('current-user', null)
  const [, setSavedDesigns] = useAppKV<Design[]>('saved-designs', [])
  const [activeView, setActiveView] = useState<'products' | 'configuration' | 'brief' | 'design' | 'manager' | 'catalog'>('products')
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedConfiguration, setSelectedConfiguration] = useState<ProductConfiguration | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([])
  const [currentPrintArea, setCurrentPrintArea] = useState<string>()

  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [requiresAgeVerification, setRequiresAgeVerification] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [pendingAction, setPendingAction] = useState<'checkout' | 'publish' | null>(null)

  const [currentDesign, setCurrentDesign] = useState<Design | null>(null)

  // Design editing state
  const [showDesignEditor, setShowDesignEditor] = useState(false)
  const [editingDesign, setEditingDesign] = useState<DesignFile | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Design preferences from form (used to provide context to AI)
  const [designPreferences, setDesignPreferences] = useState<DesignPreferences | null>(null)
  const [uploadTargetArea, setUploadTargetArea] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleSignOut = async () => {
    try {
      console.log('handleSignOut: Starting sign out process')
      await api.auth.signOut()
      console.log('handleSignOut: Sign out completed, clearing user state')
      setCurrentUser(null)
      toast.success('Signed out successfully.')
    } catch (error) {
      console.error('handleSignOut: Sign out error:', error)
      // Clear user state locally even if remote sign-out fails
      setCurrentUser(null)
      toast.success('Signed out successfully.')
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize admin product list (catalog) from KV fallback when empty
      const products = await kvService.get<Product[]>('admin-products')
      if (!products || products.length === 0) {
        await kvService.set('admin-products', MOCK_PRODUCTS)
      }

      const pendingDesigns = await kvService.get('pending-designs')
      if (!pendingDesigns) {
        await kvService.set('pending-designs', MOCK_PENDING_DESIGNS)
      }

      // Check for existing user session
      // This handles both returning from OAuth and existing sessions
      try {
        const existingUser = await api.auth.getCurrentUser()
        if (existingUser) {
          setCurrentUser(existingUser)
          // Show welcome message if we just returned from OAuth
          if (isOAuthRedirect()) {
            toast.success(`Welcome, ${existingUser.name || existingUser.email}!`)
            // Clean up URL hash/params
            window.history.replaceState(null, '', window.location.pathname)
          }
        }
      } catch (error) {
        console.error('Failed to get current user:', error)
      }
    }

    initializeApp()
  }, [])

  // Set up auth state change listener for OAuth flows
  useEffect(() => {
    // Set up the listener with proper event handling
    const subscription = api.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)

      try {
        if (event === 'SIGNED_IN') {
          // User signed in - get or create user profile
          // Don't check session?.user as it might not be populated immediately
          console.log('Processing SIGNED_IN event, fetching user...')
          const user = await api.auth.getCurrentUser()
          if (user) {
            console.log('Setting current user from auth state change:', user.email)
            setCurrentUser(user)
            // Show welcome toast only on new sign-in (not on page refresh)
            if (!isOAuthRedirect()) {
              toast.success(`Welcome, ${user.name || user.email}!`)
            }
          } else {
            console.warn('SIGNED_IN event but no user returned from getCurrentUser')
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Processing SIGNED_OUT event')
          setCurrentUser(null)
        } else if (event === 'TOKEN_REFRESHED') {
          // Session was refreshed - silently update user data if needed
          console.log('Processing TOKEN_REFRESHED event')
          const user = await api.auth.getCurrentUser()
          if (user) {
            setCurrentUser(user)
          }
        } else if (event === 'USER_UPDATED') {
          // User data was updated - refresh the user object
          console.log('Processing USER_UPDATED event')
          const user = await api.auth.getCurrentUser()
          if (user) {
            setCurrentUser(user)
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
      }
    })

    return () => {
      if (subscription?.data?.subscription) {
        subscription.data.subscription.unsubscribe()
      }
    }
  }, [setCurrentUser])

  // Only auto-load initial message if we skip the brief form and land directly in design view
  // This is a fallback for edge cases - normally handleSkipToChat or handleDesignPreferencesSubmit handle this
  useEffect(() => {
    if (activeView === 'design' && selectedProduct && selectedConfiguration && messages.length === 0) {
      const loadInitialMessage = async () => {
        const configuredProduct = {
          ...selectedProduct,
          printAreas: selectedProduct.printAreas.filter(pa =>
            selectedConfiguration.printAreas.includes(pa.id)
          )
        }
        const content = await api.ai.getInitialMessage(configuredProduct)
        const initialMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: new Date().toISOString()
        }
        setMessages([initialMessage])
        setCurrentPrintArea(configuredProduct.printAreas[0]?.id)
      }
      loadInitialMessage()
    }
  }, [activeView, selectedProduct, selectedConfiguration, messages.length])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    if (product.configurations.length === 1) {
      setSelectedConfiguration(product.configurations[0])
      setActiveView('brief')  // Go to design brief form first
      setMessages([])
      setDesignFiles([])
      setDesignPreferences(null)
    } else {
      setActiveView('configuration')
    }
  }

  const handleConfigurationSelect = (config: ProductConfiguration) => {
    setSelectedConfiguration(config)
    setActiveView('brief')  // Go to design brief form first
    setMessages([])
    setDesignFiles([])
    setDesignPreferences(null)
  }

  // Handle design preferences form submission - generate immediately
  const handleDesignPreferencesSubmit = async (preferences: DesignPreferences) => {
    setDesignPreferences(preferences)
    setActiveView('design')

    // Set up the print area
    if (selectedProduct && selectedConfiguration) {
      const configuredProduct = {
        ...selectedProduct,
        printAreas: selectedProduct.printAreas.filter(pa =>
          selectedConfiguration.printAreas.includes(pa.id)
        )
      }
      setCurrentPrintArea(configuredProduct.printAreas[0]?.id)

      // Add initial context message from preferences
      const prompt = preferencesToPrompt(preferences)
      const contextMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      }

      const generatingMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `Creating your design now! 🎨 I'm working on: ${preferences.concept}${preferences.style ? ` in a ${preferences.style} style` : ''}${preferences.text ? ` with "${preferences.text}"` : ''}. Watch the preview!`,
        timestamp: new Date().toISOString()
      }

      setMessages([contextMessage, generatingMessage])

      // Generate the design immediately
      await generateDesign(prompt, configuredProduct.printAreas[0]?.id)

      // Add follow-up message
      const followUpMessage: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        role: 'assistant',
        content: "Your design is ready! Take a look at the preview. Want me to tweak anything? Just describe what you'd like changed.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, followUpMessage])
    }
  }

  // Skip the form and go directly to chat
  const handleSkipToChat = async () => {
    setActiveView('design')

    // Set up the print area and load initial message
    if (selectedProduct && selectedConfiguration) {
      const configuredProduct = {
        ...selectedProduct,
        printAreas: selectedProduct.printAreas.filter(pa =>
          selectedConfiguration.printAreas.includes(pa.id)
        )
      }
      setCurrentPrintArea(configuredProduct.printAreas[0]?.id)

      // Load AI initial message
      const content = await api.ai.getInitialMessage(configuredProduct)
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString()
      }
      setMessages([initialMessage])
    }
  }

  const handleBackToProducts = () => {
    setActiveView('products')
    setSelectedProduct(null)
    setSelectedConfiguration(null)
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
      // CHECK FOR GENERATION INTENT FIRST - before AI response
      const shouldGenerate = api.ai.shouldGenerateDesign(content)
      const conversationLength = messages.filter(m => m.role === 'user').length

      // Auto-generate after enough conversation OR if explicit generation intent
      const autoGenerate = shouldGenerate || (conversationLength >= 2 && content.length > 20)

      if (autoGenerate && selectedProduct && currentPrintArea) {
        // Generate design immediately - don't wait for AI to ask more questions
        const generatingMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: "Creating your design now! 🎨 Watch the preview on the left - your custom creation will appear there in just a moment.",
          timestamp: new Date().toISOString()
        }
        setMessages((prev) => [...prev, generatingMessage])

        // Extract the full design concept from conversation
        const designConcept = extractDesignConcept([...messages, userMessage])
        await generateDesign(designConcept)

        // After generation, add a follow-up message
        const followUpMessage: ChatMessage = {
          id: `msg-${Date.now() + 2}`,
          role: 'assistant',
          content: "Your design is ready! Take a look at the preview. Want me to tweak anything, or are you happy with it? You can click the edit button to make manual adjustments too.",
          timestamp: new Date().toISOString()
        }
        setMessages((prev) => [...prev, followUpMessage])
      } else if (api.ai.shouldShowApproval(content) && designFiles.length > 0) {
        // User is approving - guide to checkout
        const approvalContent = await api.ai.getApprovalMessage()
        const approvalMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: approvalContent,
          timestamp: new Date().toISOString()
        }
        setMessages((prev) => [...prev, approvalMessage])
      } else {
        // Normal chat - get AI response
        const response = await api.ai.chat(
          [...messages, userMessage],
          selectedProduct || undefined,
          currentPrintArea,
          currentUser
        )

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        }

        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to get AI response')
    } finally {
      setIsAILoading(false)
    }
  }

  // Helper function to extract full design concept from conversation history
  const extractDesignConcept = (msgs: ChatMessage[]): string => {
    const userMessages = msgs
      .filter(m => m.role === 'user')
      .map(m => m.content)

    // Combine all user messages to get the full concept
    // Weight recent messages more heavily
    if (userMessages.length === 1) {
      return userMessages[0]
    }

    // Get the most descriptive messages (longer ones likely contain design details)
    const descriptiveMessages = userMessages
      .filter(m => m.length > 10) // Filter out short confirmations
      .slice(-3) // Take last 3 descriptive messages

    if (descriptiveMessages.length === 0) {
      return userMessages[userMessages.length - 1]
    }

    return descriptiveMessages.join('. ')
  }

  const getFormatFromDataUrl = (dataUrl: string) => {
    if (dataUrl.startsWith('data:image/svg+xml')) return 'SVG'
    if (dataUrl.startsWith('data:image/png')) return 'PNG'
    if (dataUrl.startsWith('data:image/jpeg')) return 'JPG'
    return 'IMAGE'
  }

  const getImageMetrics = (dataUrl: string, printArea: PrintArea) => new Promise<{
    widthPx: number
    heightPx: number
    dpi: number
  }>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const widthPx = img.width || printArea.widthInches * printArea.constraints.minDPI
      const heightPx = img.height || printArea.heightInches * printArea.constraints.minDPI
      const dpi = Math.round(
        Math.min(widthPx / printArea.widthInches, heightPx / printArea.heightInches)
      )
      resolve({ widthPx, heightPx, dpi })
    }
    img.onerror = () => {
      const fallbackWidth = printArea.widthInches * printArea.constraints.minDPI
      const fallbackHeight = printArea.heightInches * printArea.constraints.minDPI
      resolve({
        widthPx: fallbackWidth,
        heightPx: fallbackHeight,
        dpi: printArea.constraints.minDPI
      })
    }
    img.src = dataUrl
  })

  const generateDesign = async (prompt: string, printAreaId?: string) => {
    if (!selectedProduct) return
    const targetPrintArea = printAreaId || currentPrintArea
    if (!targetPrintArea) return

    toast.info('Generating your design...', { duration: 2000 })

    try {
      const printArea = selectedProduct.printAreas.find(pa => pa.id === targetPrintArea)
      if (!printArea) return

      const designUrl = await api.ai.generateDesign(
        prompt,
        {
          ...printArea.constraints,
          widthInches: printArea.widthInches,
          heightInches: printArea.heightInches,
        },
        currentUser || null
      )
      const metrics = await getImageMetrics(designUrl, printArea)
      
      const newDesign: DesignFile = {
        id: `design-${Date.now()}`,
        printAreaId: targetPrintArea,
        dataUrl: designUrl,
        format: getFormatFromDataUrl(designUrl),
        widthPx: metrics.widthPx,
        heightPx: metrics.heightPx,
        dpi: metrics.dpi,
        createdAt: new Date().toISOString()
      }

      setDesignFiles((prev) => {
        const filtered = prev.filter(df => df.printAreaId !== currentPrintArea)
        return [...filtered, newDesign]
      })

      toast.success('Design generated! Check the preview.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate design')
    }
  }

  const formatMap: Record<string, string[]> = {
    png: ['image/png'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    svg: ['image/svg+xml']
  }

  const getAcceptedFormats = (formats: string[]) => formats
    .map(format => format.toLowerCase())
    .filter(format => Object.keys(formatMap).includes(format))

  const getAcceptString = (formats: string[]) => {
    const acceptedFormats = getAcceptedFormats(formats)
    const extensions = acceptedFormats.map(format => `.${format}`)
    const mimeTypes = acceptedFormats.flatMap(format => formatMap[format] || [])
    const combined = [...extensions, ...mimeTypes].filter(Boolean)
    return combined.length > 0 ? combined.join(',') : 'image/*'
  }

  const getFileFormatLabel = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (extension) {
      return extension.toUpperCase()
    }
    if (file.type === 'image/png') return 'PNG'
    if (file.type === 'image/jpeg') return 'JPG'
    if (file.type === 'image/svg+xml') return 'SVG'
    return 'IMAGE'
  }

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const handleUploadDesign = (printAreaId: string) => {
    setUploadTargetArea(printAreaId)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedProduct) return

    const targetAreaId = uploadTargetArea || currentPrintArea
    if (!targetAreaId) {
      toast.error('Please select a print area before uploading.')
      return
    }

    const printArea = selectedProduct.printAreas.find(pa => pa.id === targetAreaId)
    if (!printArea) return

    const maxFileSizeBytes = printArea.constraints.maxFileSizeMB * 1024 * 1024
    if (file.size > maxFileSizeBytes) {
      toast.error(`File too large. Max size: ${printArea.constraints.maxFileSizeMB}MB.`)
      return
    }

    const allowedFormats = getAcceptedFormats(printArea.constraints.formats)
    const isTypeAllowed = allowedFormats.some(format =>
      formatMap[format]?.includes(file.type) || file.name.toLowerCase().endsWith(`.${format}`)
    )

    if (!isTypeAllowed) {
      toast.error(`Unsupported file type. Allowed: ${printArea.constraints.formats.join(', ')}`)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const metrics = await getImageMetrics(dataUrl, printArea)

      if (metrics.dpi < printArea.constraints.minDPI) {
        const minWidth = Math.ceil(printArea.widthInches * printArea.constraints.minDPI)
        const minHeight = Math.ceil(printArea.heightInches * printArea.constraints.minDPI)
        toast.error(`Low resolution. Minimum required: ${minWidth}×${minHeight}px at ${printArea.constraints.minDPI} DPI.`)
        return
      }

      const uploadedDesign: DesignFile = {
        id: `upload-${Date.now()}`,
        printAreaId: targetAreaId,
        dataUrl,
        format: getFileFormatLabel(file),
        widthPx: metrics.widthPx,
        heightPx: metrics.heightPx,
        dpi: metrics.dpi,
        createdAt: new Date().toISOString()
      }

      setDesignFiles((prev) => {
        const filtered = prev.filter(df => df.printAreaId !== targetAreaId)
        return [...filtered, uploadedDesign]
      })

      setCurrentPrintArea(targetAreaId)
      toast.success('Image uploaded! Check the preview.')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload image.')
    } finally {
      setUploadTargetArea(null)
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
    if (!selectedProduct || !selectedConfiguration) return

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      configurationId: selectedConfiguration.id,
      size: selectedConfiguration.size,
      color: selectedConfiguration.color,
      files: designFiles,
      isPublic: false,
      isNSFW: false,
      title: `Custom ${selectedProduct.name} - ${selectedConfiguration.name}`,
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
    if (!selectedProduct || !selectedConfiguration) return

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      configurationId: selectedConfiguration.id,
      size: selectedConfiguration.size,
      color: selectedConfiguration.color,
      files: designFiles,
      isPublic: true,
      isNSFW: false,
      title: `Custom ${selectedProduct.name} - ${selectedConfiguration.name}`,
      catalogSection: 'sfw-graphics',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const saved = await api.designs.save(design)
      setSavedDesigns((prev) => [...(prev || []), saved])
      toast.success('Design published to catalog!')
      
      setSelectedProduct(null)
      setSelectedConfiguration(null)
      setActiveView('products')
      setMessages([])
      setDesignFiles([])
    } catch (error) {
      toast.error('Failed to publish design')
    }
  }

  const handleAuthenticated = (user: User) => {
    console.log('handleAuthenticated: User authenticated:', user.email)
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
    setSelectedConfiguration(null)
    setActiveView('products')
    setMessages([])
    setDesignFiles([])
    setCurrentDesign(null)
  }

  const hasDesignsForAllRequiredAreas = () => {
    if (!selectedProduct || !selectedConfiguration) return false
    const requiredAreas = selectedProduct.printAreas.filter(pa => 
      selectedConfiguration.printAreas.includes(pa.id)
    )
    return requiredAreas.every(area => 
      designFiles.some(df => df.printAreaId === area.id)
    )
  }

  const getCurrentPrice = () => {
    if (!selectedProduct || !selectedConfiguration) return 0
    return selectedProduct.basePrice + selectedConfiguration.priceModifier
  }

  const handleUpdateDesign = (updatedDesign: DesignFile) => {
    setDesignFiles((currentFiles) =>
      currentFiles.map(df =>
        df.printAreaId === updatedDesign.printAreaId ? updatedDesign : df
      )
    )
  }

  const handleDeleteDesignFromManager = (printAreaId: string) => {
    setDesignFiles((currentFiles) =>
      currentFiles.filter(df => df.printAreaId !== printAreaId)
    )
  }

  const handleAddNewDesignFromManager = (printAreaId: string) => {
    setCurrentPrintArea(printAreaId)
    setActiveView('design')
  }

  // Design editing from DesignBin
  const handleEditDesignFromBin = (printAreaId: string) => {
    const design = designFiles.find(df => df.printAreaId === printAreaId)
    if (design) {
      setEditingDesign(design)
      setShowDesignEditor(true)
    }
  }

  const handleDeleteDesignFromBin = (printAreaId: string) => {
    setDesignFiles((currentFiles) =>
      currentFiles.filter(df => df.printAreaId !== printAreaId)
    )
    toast.success('Design deleted')
  }

  const handleSelectPrintArea = (printAreaId: string) => {
    setCurrentPrintArea(printAreaId)
  }

  const handleSaveEditedDesign = (updatedDesign: DesignFile) => {
    setDesignFiles((currentFiles) =>
      currentFiles.map(df =>
        df.printAreaId === updatedDesign.printAreaId ? updatedDesign : df
      )
    )
    setShowDesignEditor(false)
    setEditingDesign(null)
  }

  // Explicit design generation (from button)
  const handleGenerateDesignClick = async () => {
    if (!selectedProduct || !currentPrintArea) {
      toast.error('Please select a product and print area first')
      return
    }

    // Extract design concept from recent messages
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join('. ')

    if (!recentUserMessages) {
      toast.error('Please describe your design idea in the chat first')
      return
    }

    setIsGenerating(true)
    toast.info('Generating your design...', { duration: 3000 })

    try {
      const printArea = selectedProduct.printAreas.find(pa => pa.id === currentPrintArea)
      if (!printArea) return

      const designUrl = await api.ai.generateDesign(
        recentUserMessages,
        {
          ...printArea.constraints,
          widthInches: printArea.widthInches,
          heightInches: printArea.heightInches,
        },
        currentUser || null
      )
      const metrics = await getImageMetrics(designUrl, printArea)

      const newDesign: DesignFile = {
        id: `design-${Date.now()}`,
        printAreaId: currentPrintArea,
        dataUrl: designUrl,
        format: getFormatFromDataUrl(designUrl),
        widthPx: metrics.widthPx,
        heightPx: metrics.heightPx,
        dpi: metrics.dpi,
        createdAt: new Date().toISOString()
      }

      setDesignFiles((prev) => {
        const filtered = prev.filter(df => df.printAreaId !== currentPrintArea)
        return [...filtered, newDesign]
      })

      toast.success('Design generated! Click the edit button in Design Progress to customize it.', {
        duration: 5000
      })

      // Add an AI message acknowledging generation
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I've generated your design! 🎨 You can see it in the preview on the left and in the Design Progress panel on the right. Click the edit (pencil) button to customize it further, or let me know if you'd like me to generate a different version.",
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate design')
    } finally {
      setIsGenerating(false)
    }
  }

  const uploadAccept = (() => {
    if (!selectedProduct) return 'image/*'
    const targetAreaId = uploadTargetArea || currentPrintArea
    const printArea = selectedProduct.printAreas.find(pa => pa.id === targetAreaId)
    if (!printArea) return 'image/*'
    return getAcceptString(printArea.constraints.formats)
  })()

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadAccept}
        onChange={handleUploadFileChange}
        className="hidden"
      />
      
      {showAdminDashboard ? (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      ) : (
        <>
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={logoImage} 
                  alt="GoldenGooseTees Logo" 
                  className="h-12 w-12 rounded-full object-cover border-2 border-primary"
                />
                <div>
                  <h1 className="text-xl font-bold tracking-tight">GoldenGooseTees</h1>
                  <p className="text-xs text-muted-foreground">GoldenGooseTees</p>
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
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAccountDialog(true)}
                    >
                      <UserIcon size={16} className="mr-2" />
                      Account
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                      <UserIcon size={16} weight="fill" />
                      <span className="text-sm font-medium">{currentUser.name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAccountDialog(true)}
                    >
                      <UserIcon size={16} className="mr-2" />
                      Orders
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAuthDialog(true)}
                    >
                      <UserIcon size={16} className="mr-2" />
                      Sign In / Sign Up
                    </Button>
                  </>
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

              {activeView === 'configuration' && selectedProduct && (
                <ProductConfigurationSelector
                  key="configuration"
                  product={selectedProduct}
                  onSelect={handleConfigurationSelect}
                  onBack={handleBackToProducts}
                />
              )}

              {activeView === 'brief' && selectedProduct && selectedConfiguration && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="py-8"
                >
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold mb-2">
                      Let's Design Your {selectedProduct.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedConfiguration.name} • {selectedConfiguration.color} • Size {selectedConfiguration.size}
                    </p>
                  </div>

                  <DesignPreferencesForm
                    onSubmit={handleDesignPreferencesSubmit}
                    onSkip={handleSkipToChat}
                    onUpload={() => {
                      // Set up print area and navigate to design view, then trigger upload
                      if (selectedProduct && selectedConfiguration) {
                        const configuredProduct = {
                          ...selectedProduct,
                          printAreas: selectedProduct.printAreas.filter(pa =>
                            selectedConfiguration.printAreas.includes(pa.id)
                          )
                        }
                        const firstPrintArea = configuredProduct.printAreas[0]?.id
                        if (firstPrintArea) {
                          setCurrentPrintArea(firstPrintArea)
                          setActiveView('design')
                          // Add a small delay to ensure view transition completes
                          setTimeout(() => {
                            handleUploadDesign(firstPrintArea)
                          }, 100)
                        }
                      }
                    }}
                    isLoading={isGenerating}
                  />

                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      onClick={handleBackToProducts}
                      className="text-muted-foreground"
                    >
                      ← Back to Products
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeView === 'design' && selectedProduct && selectedConfiguration && (
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
                      onClick={handleBackToProducts}
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
                      {designFiles.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setActiveView('manager')}
                          className="gap-2"
                        >
                          <FolderOpen size={20} />
                          Manage Designs
                        </Button>
                      )}
                      <Button
                        onClick={handleProceedToCheckout}
                        disabled={!hasDesignsForAllRequiredAreas()}
                        className="gap-2"
                      >
                        <ShoppingCart size={20} weight="fill" />
                        Proceed to Checkout
                        <Badge variant="secondary" className="font-mono">
                          ${getCurrentPrice().toFixed(2)}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6 min-h-[600px]">
                    {/* Left Column: Design Preview */}
                    <DesignPreview
                      product={{
                        ...selectedProduct,
                        printAreas: selectedProduct.printAreas.filter(pa =>
                          selectedConfiguration.printAreas.includes(pa.id)
                        )
                      }}
                      designFiles={designFiles}
                      currentArea={currentPrintArea}
                      showMockupOption={true}
                      selectedColor={selectedConfiguration.color}
                      selectedSize={selectedConfiguration.size}
                    />

                    {/* Middle Column: Chat Interface with Generate Button */}
                    <div className="flex flex-col gap-4 min-h-0">
                      <div className="flex-1 min-h-0">
                        <ChatInterface
                          messages={messages}
                          onSendMessage={handleSendMessage}
                          isLoading={isAILoading}
                        />
                      </div>

                      {/* Generate Design Button */}
                      <Button
                        size="lg"
                        onClick={handleGenerateDesignClick}
                        disabled={isGenerating || isAILoading || messages.length < 2}
                        className="w-full gap-2 bg-primary hover:bg-primary/90"
                      >
                        {isGenerating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkle size={20} weight="fill" />
                            </motion.div>
                            Generating Design...
                          </>
                        ) : (
                          <>
                            <MagicWand size={20} weight="fill" />
                            Generate Design
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Right Column: Design Bin for managing designs */}
                    <DesignBin
                      product={{
                        ...selectedProduct,
                        printAreas: selectedProduct.printAreas.filter(pa =>
                          selectedConfiguration.printAreas.includes(pa.id)
                        )
                      }}
                      designFiles={designFiles}
                      currentPrintArea={currentPrintArea}
                      onSelectDesign={handleSelectPrintArea}
                      onDeleteDesign={handleDeleteDesignFromBin}
                      onEditDesign={handleEditDesignFromBin}
                      onUploadDesign={handleUploadDesign}
                      onOpenManager={() => setActiveView('manager')}
                    />
                  </div>

                  {!hasDesignsForAllRequiredAreas() && designFiles.length > 0 && selectedProduct && selectedConfiguration && (
                    <div className="p-4 bg-accent/10 border border-accent rounded-lg text-center">
                      <p className="text-sm text-accent-foreground">
                        Complete designs for all print areas before checkout: {
                          selectedProduct.printAreas
                            .filter(pa => selectedConfiguration.printAreas.includes(pa.id))
                            .filter(pa => !designFiles.some(df => df.printAreaId === pa.id))
                            .map(pa => pa.name)
                            .join(', ')
                        }
                      </p>
                    </div>
                  )}

                  {hasDesignsForAllRequiredAreas() && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="fixed bottom-8 right-8 z-50"
                    >
                      <Button
                        size="lg"
                        onClick={handleProceedToCheckout}
                        className="gap-3 shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <ShoppingCart size={24} weight="fill" />
                        <span className="font-semibold">Finalize & Checkout</span>
                        <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                          ${getCurrentPrice().toFixed(2)}
                        </Badge>
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeView === 'manager' && selectedProduct && selectedConfiguration && (
                <DesignManagerPage
                  key="manager"
                  product={{
                    ...selectedProduct,
                    printAreas: selectedProduct.printAreas.filter(pa => 
                      selectedConfiguration.printAreas.includes(pa.id)
                    )
                  }}
                  designFiles={designFiles}
                  onUpdateDesign={handleUpdateDesign}
                  onDeleteDesign={handleDeleteDesignFromManager}
                  onAddNewDesign={handleAddNewDesignFromManager}
                  onBack={() => setActiveView('design')}
                />
              )}

              {activeView === 'manager' && hasDesignsForAllRequiredAreas() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-8 right-8 z-50"
                >
                  <Button
                    size="lg"
                    onClick={handleProceedToCheckout}
                    className="gap-3 shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <ShoppingCart size={24} weight="fill" />
                    <span className="font-semibold">Finalize & Checkout</span>
                    <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                      ${getCurrentPrice().toFixed(2)}
                    </Badge>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 mt-12">
            <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
              <p className="mb-2">© 2026 GoldenGooseTees. All rights reserved.</p>
              <div className="flex items-center justify-center gap-4">
                <a href="/sitemap.xml" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                  Sitemap
                </a>
                <span>•</span>
                <a href="/robots.txt" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                  Robots.txt
                </a>
              </div>
            </div>
          </footer>

          <AuthDialog
            open={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            onAuthenticated={handleAuthenticated}
            requiresAgeVerification={requiresAgeVerification}
          />

          <AccountDialog
            open={showAccountDialog}
            onOpenChange={setShowAccountDialog}
            user={currentUser}
            onRequestSignIn={() => {
              setShowAccountDialog(false)
              setShowAuthDialog(true)
            }}
            onSignOut={handleSignOut}
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

          {/* Design Editor Dialog */}
          {showDesignEditor && editingDesign && selectedProduct && (
            <DesignEditor
              open={showDesignEditor}
              onOpenChange={setShowDesignEditor}
              design={editingDesign}
              product={selectedProduct}
              onSave={handleSaveEditedDesign}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
