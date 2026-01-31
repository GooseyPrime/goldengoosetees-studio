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
import { api, AgeVerificationRequiredError } from '@/lib/api'
import { kvService } from '@/lib/kv'
import {
  Product,
  ProductConfiguration,
  ProductVariantType,
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

type StudioStage = 'SELECT_PRODUCT' | 'CONFIGURE_VARIANTS' | 'EDIT_DESIGN' | 'PREVIEW' | 'CHECKOUT'
type ViewState = 'landing' | 'manager' | StudioStage

function App() {
  const [currentUser, setCurrentUser] = useAppKV<User | null>('current-user', null)
  const [, setSavedDesigns] = useAppKV<Design[]>('saved-designs', [])
  const [activeView, setActiveView] = useState<ViewState>('landing')
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedConfiguration, setSelectedConfiguration] = useState<ProductConfiguration | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([])
  const [currentPrintArea, setCurrentPrintArea] = useState<string>()
  const [showDesignBrief, setShowDesignBrief] = useState(false)

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

  const isDesignStage = activeView === 'EDIT_DESIGN' || activeView === 'PREVIEW' || activeView === 'CHECKOUT'

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleNavigateToLanding = (sectionId?: string) => {
    if (activeView !== 'landing') {
      setActiveView('landing')
      if (sectionId) {
        window.setTimeout(() => scrollToSection(sectionId), 80)
      }
      return
    }
    if (sectionId) {
      scrollToSection(sectionId)
    }
  }

  const handleSignOut = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔐 handleSignOut: Starting sign out process')
      }
      await api.auth.signOut()
      if (import.meta.env.DEV) {
        console.log('🔐 handleSignOut: Sign out completed, clearing user state')
      }
      setCurrentUser(null)
      toast.success('Signed out successfully.')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('🔐 handleSignOut: Sign out error:', error)
      }
      // Clear user state locally even if remote sign-out fails
      setCurrentUser(null)
      toast.info('Signed out locally. Remote session may still be active.')
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
  // This must be set up once on mount to properly catch OAuth callbacks
  useEffect(() => {
    // Set up the listener with proper event handling
    const subscription = api.auth.onAuthStateChange(async (event, session) => {
      // Log auth state changes in development for debugging
      if (import.meta.env.DEV) {
        console.log('🔐 Auth state change:', event, session?.user?.email || 'no email')
      }

      try {
        if (event === 'SIGNED_IN') {
          // User signed in - get or create user profile
          // Note: We don't check session?.user because after OAuth redirect,
          // the session object may exist but the user property might not be
          // populated immediately. We fetch the current user directly instead.
          if (import.meta.env.DEV) {
            console.log('🔐 Processing SIGNED_IN event, fetching user...')
          }
          const user = await api.auth.getCurrentUser()
          if (user) {
            if (import.meta.env.DEV) {
              console.log('🔐 Setting current user from auth state change:', user.email)
            }
            setCurrentUser(user)
            // Show welcome toast only on new sign-in (not on page refresh)
            if (!isOAuthRedirect()) {
              toast.success(`Welcome, ${user.name || user.email}!`)
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn('🔐 SIGNED_IN event but no user returned from getCurrentUser')
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (import.meta.env.DEV) {
            console.log('🔐 Processing SIGNED_OUT event')
          }
          setCurrentUser(null)
        } else if (event === 'TOKEN_REFRESHED') {
          // Session was refreshed - silently update user data if needed
          if (import.meta.env.DEV) {
            console.log('🔐 Processing TOKEN_REFRESHED event')
          }
          const user = await api.auth.getCurrentUser()
          if (user) {
            setCurrentUser(user)
          }
        } else if (event === 'USER_UPDATED') {
          // User data was updated - refresh the user object
          if (import.meta.env.DEV) {
            console.log('🔐 Processing USER_UPDATED event')
          }
          const user = await api.auth.getCurrentUser()
          if (user) {
            setCurrentUser(user)
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('🔐 Error handling auth state change:', error)
        }
      }
    })

    if (import.meta.env.DEV) {
      console.log('🔐 Auth state change listener registered')
    }

    return () => {
      if (import.meta.env.DEV) {
        console.log('🔐 Auth state change listener unsubscribing')
      }
      if (subscription?.data?.subscription) {
        subscription.data.subscription.unsubscribe()
      }
    }
  }, []) // Empty dependency array - only set up once on mount to avoid race conditions

  // Only auto-load initial message if we skip the brief form and land directly in design view
  // This is a fallback for edge cases - normally handleSkipToChat or handleDesignPreferencesSubmit handle this
  useEffect(() => {
    if (isDesignStage && !showDesignBrief && selectedProduct && selectedConfiguration && messages.length === 0) {
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
  }, [isDesignStage, showDesignBrief, selectedProduct, selectedConfiguration, messages.length])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setSelectedConfiguration(null)
    setActiveView('CONFIGURE_VARIANTS')
    setShowDesignBrief(false)
    setMessages([])
    setDesignFiles([])
    setDesignPreferences(null)
    setCurrentDesign(null)
  }

  const handleConfigurationSelect = (config: ProductConfiguration) => {
    setSelectedConfiguration(config)
    setActiveView('EDIT_DESIGN')
    setShowDesignBrief(true)
    setMessages([])
    setDesignFiles([])
    setDesignPreferences(null)
    setCurrentDesign(null)
  }

  const handleProductSwitch = (productId: string) => {
    const nextProduct = MOCK_PRODUCTS.find(product => product.id === productId)
    if (!nextProduct) return
    setSelectedProduct(nextProduct)
    setSelectedConfiguration(null)
    setActiveView('CONFIGURE_VARIANTS')
    setShowDesignBrief(false)
    setMessages([])
    setDesignFiles([])
    setDesignPreferences(null)
    setCurrentDesign(null)
    setCurrentPrintArea(undefined)
    setShowDesignEditor(false)
    setEditingDesign(null)
    setShowCheckout(false)
  }

  // Handle design preferences form submission - generate immediately
  const handleDesignPreferencesSubmit = async (preferences: DesignPreferences) => {
    setDesignPreferences(preferences)
    setActiveView('EDIT_DESIGN')
    setShowDesignBrief(false)

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

      const creatingContent = await api.ai.getDesignPhaseMessage('creating', {
        concept: preferences.concept,
        style: preferences.style,
        text: preferences.text
      })
      const generatingMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: creatingContent,
        timestamp: new Date().toISOString()
      }
      setMessages([contextMessage, generatingMessage])

      try {
        await generateDesign(prompt, configuredProduct.printAreas[0]?.id)
        const readyContent = await api.ai.getDesignPhaseMessage('ready')
        const followUpMessage: ChatMessage = {
          id: `msg-${Date.now() + 2}`,
          role: 'assistant',
          content: readyContent,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, followUpMessage])
      } catch (err: any) {
        const errorContent = await api.ai.getDesignPhaseMessage('error', { error: err?.message })
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now() + 2}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
        toast.error(err?.message || 'Failed to generate design')
      }
    }
  }

  // Skip the form and go directly to chat
  const handleSkipToChat = async () => {
    setActiveView('EDIT_DESIGN')
    setShowDesignBrief(false)

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
    setActiveView('SELECT_PRODUCT')
    setSelectedProduct(null)
    setSelectedConfiguration(null)
    setMessages([])
    setDesignFiles([])
    setDesignPreferences(null)
    setCurrentDesign(null)
    setShowDesignBrief(false)
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

      const result = await api.ai.generateDesign(
        prompt,
        {
          ...printArea.constraints,
          widthInches: printArea.widthInches,
          heightInches: printArea.heightInches,
        },
        currentUser || null
      )
      
      const designUrl = result.imageUrl
      const isNSFW = result.isNSFW
      
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

      // Show NSFW warning if content is flagged
      if (isNSFW) {
        toast.warning('⚠️ This design contains mature content (18+ only). This may include language, themes, or references not suitable for minors.')
      }

      toast.success('Design generated! Check the preview.')
    } catch (error: any) {
      // Check if error is due to age verification requirement
      if (error instanceof AgeVerificationRequiredError) {
        setRequiresAgeVerification(true)
        setShowAuthDialog(true)
        toast.error('Age verification required to generate NSFW content.')
      } else {
        toast.error(error.message || 'Failed to generate design')
      }
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
      setActiveView('CHECKOUT')
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

    const variantSelections = selectedConfiguration.variantSelections || {}
    const size = variantSelections.size
    const color = variantSelections.color

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      configurationId: selectedConfiguration.id,
      variantSelections,
      size,
      color,
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
      setActiveView('CHECKOUT')
    } catch (error) {
      toast.error('Failed to save design')
    }
  }

  const saveDesignToCatalog = async () => {
    if (!selectedProduct || !selectedConfiguration) return

    const variantSelections = selectedConfiguration.variantSelections || {}
    const size = variantSelections.size
    const color = variantSelections.color

    const design: Design = {
      id: `design-${Date.now()}`,
      userId: currentUser?.id,
      productId: selectedProduct.id,
      configurationId: selectedConfiguration.id,
      variantSelections,
      size,
      color,
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
      setActiveView('SELECT_PRODUCT')
      setMessages([])
      setDesignFiles([])
      setDesignPreferences(null)
      setShowDesignBrief(false)
    } catch (error) {
      toast.error('Failed to publish design')
    }
  }

  const handleAuthenticated = (user: User) => {
    if (import.meta.env.DEV) {
      console.log('handleAuthenticated: User authenticated:', user.email)
    }
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
    setActiveView('SELECT_PRODUCT')
    setMessages([])
    setDesignFiles([])
    setCurrentDesign(null)
    setShowDesignBrief(false)
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

  const designsComplete = hasDesignsForAllRequiredAreas()

  useEffect(() => {
    if (activeView === 'EDIT_DESIGN' && designsComplete) {
      setActiveView('PREVIEW')
    }
    if (activeView === 'PREVIEW' && !designsComplete) {
      setActiveView('EDIT_DESIGN')
    }
  }, [activeView, designsComplete])

  const getCurrentPrice = () => {
    if (!selectedProduct || !selectedConfiguration) return 0
    return selectedProduct.basePrice + selectedConfiguration.priceModifier
  }

  const formatVariantSummary = (
    product: Product | null,
    selections?: Partial<Record<ProductVariantType, string>>
  ) => {
    if (!product || !selections) return ''
    const parts = product.variants
      .map(variant => {
        const value = selections[variant.id]
        if (!value) return null
        return `${variant.name}: ${value}`
      })
      .filter(Boolean)
    return parts.join(' / ')
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
    setActiveView('EDIT_DESIGN')
    setShowDesignBrief(false)
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

      const result = await api.ai.generateDesign(
        recentUserMessages,
        {
          ...printArea.constraints,
          widthInches: printArea.widthInches,
          heightInches: printArea.heightInches,
        },
        currentUser || null
      )
      
      const designUrl = result.imageUrl
      const isNSFW = result.isNSFW
      
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

      // Show NSFW warning if content is flagged
      if (isNSFW) {
        toast.warning('⚠️ This design contains mature content (18+ only). This may include language, themes, or references not suitable for minors.')
      }

      toast.success('Design generated! Click the edit button in Design Progress to customize it.', {
        duration: 5000
      })

      const readyContent = await api.ai.getDesignPhaseMessage('ready')
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: readyContent,
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate design')
      const errorContent = await api.ai.getDesignPhaseMessage('error', { error: error?.message })
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, errorMessage])
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

  const cartDisabled = !designsComplete
  const heroProduct = MOCK_PRODUCTS[0]
  const selectedVariantSummary = selectedProduct && selectedConfiguration
    ? formatVariantSummary(selectedProduct, selectedConfiguration.variantSelections)
    : ''

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-72 w-72 rounded-full bg-[#D4AF37]/15 blur-[140px]" />
        <div className="absolute top-1/3 left-[-10%] h-80 w-80 rounded-full bg-white/10 blur-[160px]" />
      </div>
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
          <header className="sticky top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between rounded-full px-4 sm:px-6 h-16 glass-panel">
                <button
                  onClick={() => handleNavigateToLanding()}
                  className="flex items-center gap-3 group"
                >
                  <img
                    src={logoImage}
                    alt="GoldenGooseTees Logo"
                    className="h-10 w-10 rounded-full object-cover border border-white/20 shadow-lg"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold tracking-tight">GoldenGooseTees</p>
                    <p className="text-xs text-muted-foreground">Design Studio</p>
                  </div>
                </button>

                <nav className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigateToLanding('gallery')}
                    className="rounded-full px-4 text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Gallery
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView('SELECT_PRODUCT')}
                    className="rounded-full px-4 text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Studio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProceedToCheckout}
                    disabled={cartDisabled}
                    className="rounded-full border-white/20 bg-white/5 px-4 text-sm font-semibold hover:bg-white/10"
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Cart
                    {selectedProduct && (
                      <Badge variant="secondary" className="ml-2 font-mono rounded-full">
                        ${getCurrentPrice().toFixed(2)}
                      </Badge>
                    )}
                  </Button>
                </nav>

                <div className="flex md:hidden items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleNavigateToLanding('gallery')}
                    className="rounded-full text-foreground/70 hover:text-foreground"
                  >
                    <Sparkle size={18} weight="fill" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveView('SELECT_PRODUCT')}
                    className="rounded-full text-foreground/70 hover:text-foreground"
                  >
                    <TShirt size={18} weight="fill" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleProceedToCheckout}
                    disabled={cartDisabled}
                    className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    <ShoppingCart size={18} weight="fill" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser?.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdminDashboard(true)}
                      className="rounded-full text-foreground/70 hover:text-foreground"
                    >
                      <Gear size={16} className="mr-2" />
                      Admin
                    </Button>
                  )}
                  {currentUser ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAccountDialog(true)}
                        className="rounded-full text-foreground/70 hover:text-foreground"
                      >
                        <UserIcon size={16} className="mr-2" />
                        Account
                      </Button>
                      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <UserIcon size={14} weight="fill" />
                        <span className="text-xs font-medium">{currentUser.name}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAccountDialog(true)}
                        className="rounded-full text-foreground/70 hover:text-foreground"
                      >
                        <UserIcon size={16} className="mr-2" />
                        Orders
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAuthDialog(true)}
                        className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                      >
                        <UserIcon size={16} className="mr-2" />
                        Sign In
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16">
            <AnimatePresence mode="wait">
              {activeView === 'landing' && (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-20 pt-6"
                >
                  <section className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <Badge variant="secondary" className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]">
                        Golden Studio
                      </Badge>
                      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight gold-text-glow">
                        Craft premium tees with an AI‑powered design concierge.
                      </h2>
                      <p className="text-lg text-muted-foreground max-w-xl">
                        Build your next drop in minutes. Precision mockups, premium typography, and
                        a studio workflow tailored for high‑conversion merchandise.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="lg"
                          className="rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-black/30"
                          onClick={() => setActiveView('SELECT_PRODUCT')}
                        >
                          Start Designing
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="rounded-full px-8 h-12 border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => handleNavigateToLanding('gallery')}
                        >
                          Explore Gallery
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="glass-surface rounded-full px-4 py-2">Printful‑ready mockups</span>
                        <span className="glass-surface rounded-full px-4 py-2">Instant AI iterations</span>
                        <span className="glass-surface rounded-full px-4 py-2">Premium dark UI</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="glass-panel rounded-3xl p-6 shadow-2xl">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10">
                          <img
                            src={heroProduct?.imageUrl}
                            alt={heroProduct?.name || 'Featured tee'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{heroProduct?.name}</p>
                              <p className="text-xs text-muted-foreground">Studio‑ready mockup</p>
                            </div>
                            <Badge variant="secondary" className="font-mono">
                              ${heroProduct?.basePrice}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-6 -left-6 glass-surface rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Sparkle size={18} weight="fill" className="text-primary" />
                          <div>
                            <p className="text-xs font-semibold">AI powered</p>
                            <p className="text-[11px] text-muted-foreground">Live creative guidance</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="grid md:grid-cols-3 gap-6">
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                        <MagicWand size={22} weight="fill" className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Concierge AI</h3>
                        <p className="text-sm text-muted-foreground">
                          Guided prompts, instant concepts, and premium artwork generation.
                        </p>
                      </div>
                    </div>
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                        <TShirt size={22} weight="fill" className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Precision Mockups</h3>
                        <p className="text-sm text-muted-foreground">
                          See every print area with buttery‑smooth front/back transitions.
                        </p>
                      </div>
                    </div>
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                        <Sparkle size={22} weight="fill" className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Conversion‑ready</h3>
                        <p className="text-sm text-muted-foreground">
                          Premium checkout flows and gallery‑grade presentation.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section id="gallery" className="space-y-8 scroll-mt-24">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold">Studio Gallery</h3>
                        <p className="text-sm text-muted-foreground">
                          Pick a base tee to begin your design journey.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                        onClick={() => setActiveView('SELECT_PRODUCT')}
                      >
                        View All Products
                      </Button>
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
                  </section>
                </motion.div>
              )}
              {activeView === 'SELECT_PRODUCT' && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="mb-10 text-center max-w-2xl mx-auto glass-panel rounded-3xl p-8">
                    <Badge variant="secondary" className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      Studio View
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-semibold mt-4 mb-3 tracking-tight">
                      Design Your Perfect Tee
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground">
                      Choose a product and let our AI assistant help you create a custom design.
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

              {activeView === 'CONFIGURE_VARIANTS' && selectedProduct && (
                <ProductConfigurationSelector
                  key="configuration"
                  product={selectedProduct}
                  onSelect={handleConfigurationSelect}
                  onBack={handleBackToProducts}
                />
              )}

              {activeView === 'EDIT_DESIGN' && showDesignBrief && selectedProduct && selectedConfiguration && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="py-8"
                >
                  <div className="glass-panel rounded-3xl p-8 space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-2">
                        Let's Design Your {selectedProduct.name}
                      </h2>
                      <p className="text-muted-foreground">
                        {selectedConfiguration.name}
                        {selectedVariantSummary ? ` / ${selectedVariantSummary}` : ''}
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
                            setActiveView('EDIT_DESIGN')
                            setShowDesignBrief(false)
                            // Add a small delay to ensure view transition completes
                            setTimeout(() => {
                              handleUploadDesign(firstPrintArea)
                            }, 100)
                          }
                        }
                      }}
                      isLoading={isGenerating}
                    />
                  </div>

                  <div className="mt-6 text-center">
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

              {isDesignStage && !showDesignBrief && selectedProduct && selectedConfiguration && (
                <motion.div
                  key="design"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 glass-panel rounded-2xl p-4">
                    <Button
                      variant="outline"
                      onClick={handleBackToProducts}
                      className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                    >
                      ← Back to Products
                    </Button>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={handlePublishToCatalog}
                        disabled={designFiles.length === 0}
                        className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                      >
                        <UploadSimple size={20} className="mr-2" />
                        Publish to Catalog
                      </Button>
                      {designFiles.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setActiveView('manager')}
                          className="gap-2 rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                        >
                          <FolderOpen size={20} />
                          Manage Designs
                        </Button>
                      )}
                      <Button
                        onClick={handleProceedToCheckout}
                        disabled={!designsComplete}
                        className="gap-2 rounded-full"
                      >
                        <ShoppingCart size={20} weight="fill" />
                        Proceed to Checkout
                        <Badge variant="secondary" className="font-mono rounded-full">
                          ${getCurrentPrice().toFixed(2)}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-6 min-h-[640px]">
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
                      selectedVariants={selectedConfiguration.variantSelections}
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
                        className="w-full gap-2 rounded-full bg-primary hover:bg-primary/90"
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

                  {!designsComplete && designFiles.length > 0 && selectedProduct && selectedConfiguration && (
                    <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl text-center">
                      <p className="text-sm text-foreground">
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

                  {designsComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="fixed bottom-6 right-4 sm:right-8 z-50"
                    >
                      <Button
                        size="lg"
                        onClick={handleProceedToCheckout}
                        className="gap-3 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <ShoppingCart size={24} weight="fill" />
                        <span className="font-semibold">Finalize & Checkout</span>
                        <Badge variant="secondary" className="font-mono text-base px-3 py-1 rounded-full">
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
                  onBack={() => setActiveView(designsComplete ? 'PREVIEW' : 'EDIT_DESIGN')}
                />
              )}

              {activeView === 'manager' && designsComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-6 right-4 sm:right-8 z-50"
                >
                  <Button
                    size="lg"
                    onClick={handleProceedToCheckout}
                    className="gap-3 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <ShoppingCart size={24} weight="fill" />
                    <span className="font-semibold">Finalize & Checkout</span>
                    <Badge variant="secondary" className="font-mono text-base px-3 py-1 rounded-full">
                      ${getCurrentPrice().toFixed(2)}
                    </Badge>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="border-t border-white/10 bg-white/5 backdrop-blur py-6 mt-12">
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
              onOpenChange={(open) => {
                setShowCheckout(open)
                if (!open && activeView === 'CHECKOUT') {
                  setActiveView(designsComplete ? 'PREVIEW' : 'EDIT_DESIGN')
                }
              }}
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
              products={MOCK_PRODUCTS}
              onSwitchProduct={handleProductSwitch}
              onSave={handleSaveEditedDesign}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
