'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { resolveStudioPlacements } from '@/lib/design/placements'
import { calculateRetailPrice, getProductConfig, type PrintPlacement } from '@/lib/config/products.config'
import {
  colorKey,
  colorsForSize,
  effectiveSize,
  resolveVariantId,
  uniqueSizes,
  type CatalogVariantLite,
} from '@/lib/design/variantSelection'
import StudioChatPanel, { type AgentClientAction, type StudioContextPayload } from '@/components/StudioChatPanel'
import { createClient as createSupabaseBrowser } from '@/lib/supabase/client'
import {
  COMPOSITION_OPTIONS,
  COLOR_THEME_OPTIONS,
  defaultImagePromptParts,
  MOOD_OPTIONS,
  STYLE_OPTIONS,
  type ImagePromptParts,
} from '@/lib/ai/imagePromptParts'

export type CatalogProduct = {
  id: number
  name: string
  description: string
  imageUrl: string
  category: string
  variantCount: number
  basePrice: number | null
  currency: string
  variants: Array<{
    id: number
    name: string
    size: string
    color: string
    colorCode: string
    image: string
    catalogProductId: number
  }>
  localConfig: {
    displayName: string
    placements: Array<{ id: string; displayName: string }>
  } | null
  printfulPlacementsRaw?: unknown[] | null
}

type CatalogResponse = {
  success: boolean
  data?: CatalogProduct[]
  error?: string
  message?: string
}

type Step = 'browse' | 'configure' | 'design' | 'mockups' | 'review' | 'checkout'

type PlacementRow = { id: string; displayName: string; technique: string }

type PlacementArt = {
  source: 'ai' | 'upload' | null
  imageUrl: string | null
  printfulFileId: string | null
}

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const STEPS: { id: Step; label: string }[] = [
  { id: 'browse', label: 'Products' },
  { id: 'configure', label: 'Options' },
  { id: 'design', label: 'Your art' },
  { id: 'mockups', label: 'Mockups' },
  { id: 'review', label: 'Review' },
  { id: 'checkout', label: 'Checkout' },
]

const STEP_ORDER = STEPS.map((s) => s.id)
const SESSION_KEY = 'ggt-studio-session'
const SESSION_VERSION = 5

const LOGO_URL =
  'https://res.cloudinary.com/dksj2niho/image/upload/v1770648639/GoldenGooseTeesNOBG_Custom_dlr3dr.png'

type PersistedSession = {
  v: number
  step: Step
  selectedProductId: number | null
  selectedVariantId: number | null
  selectedPlacementIds: string[]
  selectedSize: string | null
  selectedColorKey: string | null
  placementPool: PlacementRow[]
  activePlacementId: string | null
  artByPlacement: Record<string, PlacementArt>
  mockupTaskId: string | number | null
  mockupUrls: string[]
  mockupStatus: string | null
  checkoutUrl: string | null
  chatMessages: ChatMsg[]
  /** v5: structured image generation */
  imageGenCustomOnly?: boolean
  imagePromptParts?: ImagePromptParts
  aiPrompt?: string
}

function swatchBackground(c: { colorCode: string; sampleImage: string }): CSSProperties {
  const code = (c.colorCode || '').trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(code)
  const img = (c.sampleImage || '').trim()
  if (hex) {
    return { backgroundColor: code }
  }
  if (img) {
    return {
      backgroundImage: `url(${img})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return {
    backgroundImage:
      'linear-gradient(135deg, #3f3f46 0%, #52525b 35%, #71717a 50%, #52525b 65%, #3f3f46 100%)',
  }
}

function defaultPlacementIds(catalogProductId: number, pool: PlacementRow[]): string[] {
  if (!pool.length) return []
  const cfg = getProductConfig(catalogProductId)
  const poolIds = new Set(pool.map((p) => p.id))
  if (!cfg?.placements?.length) {
    const frontOnly = pool.filter((p) => p.id === 'front').map((p) => p.id)
    if (frontOnly.length > 0) return frontOnly
    return [pool[0].id]
  }
  const defaults = cfg.placements.filter((p) => p.isDefault && poolIds.has(p.id)).map((p) => p.id)
  if (defaults.length > 0) return defaults
  return [pool[0].id]
}

function placementSpecMap(
  catalogProductId: number,
  ids: string[]
): Record<string, { targetPx: number; widthIn: number; heightIn: number; dpi: number }> {
  const cfg = getProductConfig(catalogProductId)
  const out: Record<string, { targetPx: number; widthIn: number; heightIn: number; dpi: number }> = {}
  if (!cfg) return out
  for (const id of ids) {
    const p = cfg.placements.find((x) => x.id === id) as PrintPlacement | undefined
    if (p) {
      out[id] = {
        targetPx: p.canvasExportPx,
        widthIn: p.printAreaWidth,
        heightIn: p.printAreaHeight,
        dpi: p.dpi,
      }
    }
  }
  return out
}

export default function DesignStudio() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('browse')
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [placementPool, setPlacementPool] = useState<PlacementRow[]>([])
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColorKey, setSelectedColorKey] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null)
  const [artByPlacement, setArtByPlacement] = useState<Record<string, PlacementArt>>({})

  const [aiPrompt, setAiPrompt] = useState('')
  const [imagePromptParts, setImagePromptParts] = useState<ImagePromptParts>(() => defaultImagePromptParts())
  const [imageGenCustomOnly, setImageGenCustomOnly] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [mockupTaskId, setMockupTaskId] = useState<string | number | null>(null)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const [mockupStatus, setMockupStatus] = useState<string | null>(null)

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [sessionRestored, setSessionRestored] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serverSessionLoadedFor = useRef<string | null>(null)

  const variantsLite = useMemo((): CatalogVariantLite[] => {
    if (!selectedProduct) return []
    return selectedProduct.variants.map((v) => ({
      id: v.id,
      name: v.name,
      size: v.size,
      color: v.color,
      colorCode: v.colorCode,
      image: v.image,
    }))
  }, [selectedProduct])

  const sizeOptions = useMemo(() => uniqueSizes(variantsLite), [variantsLite])
  const colorOptions = useMemo(
    () => (selectedSize ? colorsForSize(variantsLite, selectedSize) : []),
    [variantsLite, selectedSize]
  )

  const activePlacements = useMemo(
    () => placementPool.filter((p) => selectedPlacementIds.includes(p.id)),
    [placementPool, selectedPlacementIds]
  )

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowser()
      void supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email ?? null)
      })
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, session) => {
        setUserEmail(session?.user?.email ?? null)
        if (!session?.user) serverSessionLoadedFor.current = null
      })
      return () => subscription.unsubscribe()
    } catch {
      setUserEmail(null)
    }
  }, [])

  const applyPersistedSession = useCallback((p: PersistedSession, prod: CatalogProduct) => {
    const pool =
      p.placementPool?.length > 0
        ? p.placementPool
        : resolveStudioPlacements(prod.id, prod.printfulPlacementsRaw ?? null)
    setSelectedProduct(prod)
    setPlacementPool(pool)
    setSelectedPlacementIds(
      p.selectedPlacementIds?.length ? p.selectedPlacementIds : defaultPlacementIds(prod.id, pool)
    )
    setSelectedSize(p.selectedSize ?? null)
    setSelectedColorKey(p.selectedColorKey ?? null)
    setSelectedVariantId(p.selectedVariantId)
    setImagePromptParts({ ...defaultImagePromptParts(), ...p.imagePromptParts })
    setImageGenCustomOnly(Boolean(p.imageGenCustomOnly))
    setAiPrompt(typeof p.aiPrompt === 'string' ? p.aiPrompt : '')
    setActivePlacementId(p.activePlacementId)
    const mergedArt: Record<string, PlacementArt> = {}
    for (const r of pool) {
      mergedArt[r.id] = p.artByPlacement[r.id] ?? { source: null, imageUrl: null, printfulFileId: null }
    }
    setArtByPlacement(mergedArt)
    setMockupTaskId(p.mockupTaskId)
    setMockupUrls(p.mockupUrls ?? [])
    setMockupStatus(p.mockupStatus)
    setCheckoutUrl(p.checkoutUrl)
    let restoreStep = p.step
    if (restoreStep === 'checkout' && !p.checkoutUrl) restoreStep = 'review'
    if (restoreStep === 'review' && !(p.mockupUrls?.length) && p.mockupStatus !== 'completed')
      restoreStep = 'mockups'
    if (['mockups', 'review', 'checkout'].includes(restoreStep) && !p.selectedVariantId)
      restoreStep = 'configure'
    setStep(restoreStep)
    if (p.chatMessages?.length) setChatMessages(p.chatMessages)
  }, [])

  useEffect(() => {
    if (!userEmail || products.length === 0) return
    if (serverSessionLoadedFor.current === userEmail) return
    serverSessionLoadedFor.current = userEmail
    let cancelled = false
    void (async () => {
      try {
        const sRes = await fetch('/api/studio/session', { cache: 'no-store' })
        const sJson = await sRes.json()
        if (cancelled || !sJson.success) return
        if (!sJson.snapshot || sJson.snapshot.v !== SESSION_VERSION) return
        const p = sJson.snapshot as PersistedSession
        const prod = products.find((x) => x.id === p.selectedProductId)
        if (!prod) return
        applyPersistedSession(p, prod)
        if (Array.isArray(sJson.chatMessages) && sJson.chatMessages.length > 0) {
          setChatMessages(sJson.chatMessages)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userEmail, products, applyPersistedSession])

  useEffect(() => {
    if (!selectedSize || !selectedColorKey) {
      setSelectedVariantId(null)
      return
    }
    const vid = resolveVariantId(variantsLite, selectedSize, selectedColorKey)
    setSelectedVariantId(vid)
  }, [selectedSize, selectedColorKey, variantsLite])

  useEffect(() => {
    if (!selectedSize) return
    if (colorOptions.length === 0) return
    if (selectedColorKey && !colorOptions.some((c) => c.key === selectedColorKey)) {
      setSelectedColorKey(null)
      setSelectedVariantId(null)
    }
  }, [selectedSize, colorOptions, selectedColorKey])

  const persistLocal = useCallback(
    (payload: PersistedSession) => {
      if (typeof window === 'undefined') return
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
      } catch {
        /* ignore */
      }
    },
    []
  )

  const buildSnapshot = useCallback((): PersistedSession => {
    return {
      v: SESSION_VERSION,
      step,
      selectedProductId: selectedProduct?.id ?? null,
      selectedVariantId,
      selectedPlacementIds,
      selectedSize,
      selectedColorKey,
      placementPool,
      activePlacementId,
      artByPlacement,
      mockupTaskId,
      mockupUrls,
      mockupStatus,
      checkoutUrl,
      chatMessages,
      imageGenCustomOnly,
      imagePromptParts,
      aiPrompt,
    }
  }, [
    step,
    selectedProduct,
    selectedVariantId,
    selectedPlacementIds,
    selectedSize,
    selectedColorKey,
    placementPool,
    activePlacementId,
    artByPlacement,
    mockupTaskId,
    mockupUrls,
    mockupStatus,
    checkoutUrl,
    chatMessages,
    imageGenCustomOnly,
    imagePromptParts,
    aiPrompt,
  ])

  useEffect(() => {
    const snap = buildSnapshot()
    persistLocal(snap)
    if (!userEmail) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void fetch('/api/studio/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: snap, chatMessages }),
      }).catch(() => {})
    }, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [buildSnapshot, persistLocal, userEmail, chatMessages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/printful/catalog', { cache: 'no-store' })
        const json = (await res.json()) as CatalogResponse
        if (cancelled) return
        if (!json.success) {
          setCatalogError(json.error || 'Could not load catalog')
          setProducts([])
          return
        }
        const list = json.data ?? []
        setProducts(list)
        setCatalogError(null)

        if (!sessionRestored && typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem(SESSION_KEY)
            if (raw) {
              const p = JSON.parse(raw) as PersistedSession
              if (p.v === SESSION_VERSION && p.selectedProductId) {
                const prod = list.find((x) => x.id === p.selectedProductId)
                if (prod) applyPersistedSession(p, prod)
              }
            }
          } catch {
            /* ignore */
          }
        }
        setSessionRestored(true)
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : 'Network error')
          setProducts([])
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionRestored, userEmail])

  const selectedVariant = useMemo(
    () => selectedProduct?.variants.find((v) => v.id === selectedVariantId) ?? null,
    [selectedProduct, selectedVariantId]
  )

  const estimatedTotal = useMemo(() => {
    if (!selectedProduct || !selectedSize) return null
    try {
      return calculateRetailPrice(selectedProduct.id, selectedPlacementIds, selectedSize)
    } catch {
      return selectedProduct.basePrice
    }
  }, [selectedProduct, selectedSize, selectedPlacementIds])

  const allPlacementsReady = useMemo(() => {
    if (activePlacements.length === 0) return false
    return activePlacements.every((p) => artByPlacement[p.id]?.printfulFileId)
  }, [activePlacements, artByPlacement])

  const canNavigateTo = useCallback(
    (target: Step): boolean => {
      if (target === 'browse') return true
      if (target === 'configure') return !!selectedProduct
      if (target === 'design')
        return (
          !!selectedProduct &&
          selectedVariantId != null &&
          selectedPlacementIds.length > 0
        )
      if (target === 'mockups')
        return (
          !!selectedProduct &&
          selectedVariantId != null &&
          selectedPlacementIds.length > 0 &&
          (allPlacementsReady || mockupTaskId != null)
        )
      if (target === 'review')
        return mockupUrls.length > 0 && mockupStatus === 'completed'
      if (target === 'checkout') return !!checkoutUrl && mockupUrls.length > 0
      return false
    },
    [
      selectedProduct,
      selectedVariantId,
      selectedPlacementIds.length,
      allPlacementsReady,
      mockupUrls.length,
      mockupStatus,
      checkoutUrl,
      mockupTaskId,
    ]
  )

  const goToStep = useCallback(
    (target: Step) => {
      if (!canNavigateTo(target)) return
      setStep(target)
      setStatusMessage(null)
    },
    [canNavigateTo]
  )

  const resetSession = useCallback(() => {
    setStep('browse')
    setSelectedProduct(null)
    setPlacementPool([])
    setSelectedPlacementIds([])
    setSelectedSize(null)
    setSelectedColorKey(null)
    setSelectedVariantId(null)
    setActivePlacementId(null)
    setArtByPlacement({})
    setAiPrompt('')
    setImagePromptParts(defaultImagePromptParts())
    setImageGenCustomOnly(false)
    setEditPrompt('')
    setMockupTaskId(null)
    setMockupUrls([])
    setMockupStatus(null)
    setCheckoutUrl(null)
    setStatusMessage(null)
    setChatMessages([])
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const selectProduct = useCallback((p: CatalogProduct) => {
    setSelectedProduct(p)
    const pool = resolveStudioPlacements(p.id, p.printfulPlacementsRaw ?? null)
    setPlacementPool(pool)
    const defaults = defaultPlacementIds(p.id, pool)
    setSelectedPlacementIds(defaults)
    setSelectedSize(null)
    setSelectedColorKey(null)
    setSelectedVariantId(null)
    const initial: Record<string, PlacementArt> = {}
    for (const r of pool) {
      initial[r.id] = { source: null, imageUrl: null, printfulFileId: null }
    }
    setArtByPlacement(initial)
    setActivePlacementId(defaults[0] ?? pool[0]?.id ?? null)
    setMockupTaskId(null)
    setMockupUrls([])
    setMockupStatus(null)
    setCheckoutUrl(null)
    setStep('configure')
  }, [])

  const togglePlacement = useCallback((id: string, checked: boolean) => {
    setSelectedPlacementIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev
        return [...prev, id]
      }
      const next = prev.filter((x) => x !== id)
      setArtByPlacement((a) => {
        const copy = { ...a }
        copy[id] = { source: null, imageUrl: null, printfulFileId: null }
        return copy
      })
      setActivePlacementId((cur) => (cur === id ? next[0] ?? null : cur))
      return next
    })
  }, [])

  const goDesign = () => {
    if (!selectedVariantId) {
      setStatusMessage('Choose a size and color first.')
      return
    }
    if (selectedPlacementIds.length === 0) {
      setStatusMessage('Select at least one print location.')
      return
    }
    setStatusMessage(null)
    setStep('design')
  }

  const registerPrintfulFile = async (url: string, filename: string) => {
    const res = await fetch('/api/printful/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, filename }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Printful file registration failed')
    return json.fileId as string
  }

  const setPlacementArt = useCallback((placementId: string, patch: Partial<PlacementArt>) => {
    setArtByPlacement((prev) => ({
      ...prev,
      [placementId]: { ...prev[placementId], ...patch },
    }))
  }, [])

  const handleUpload = async (placementId: string, file: File) => {
    if (!selectedProduct) return
    setBusy(`upload-${placementId}`)
    setStatusMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('catalogProductId', String(selectedProduct.id))
      fd.append('placementId', placementId)
      const up = await fetch('/api/designs/upload', { method: 'POST', body: fd })
      const upJson = await up.json()
      if (!upJson.success) throw new Error(upJson.error || 'Upload failed')

      const fileId = await registerPrintfulFile(upJson.publicUrl, file.name || `design-${placementId}.png`)
      setPlacementArt(placementId, {
        source: 'upload',
        imageUrl: upJson.publicUrl,
        printfulFileId: fileId,
      })
      setStatusMessage('Image uploaded and linked to Printful.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Upload error')
    } finally {
      setBusy(null)
    }
  }

  const handleAiGenerate = async (placementId: string) => {
    if (imageGenCustomOnly) {
      if (!aiPrompt.trim()) {
        setStatusMessage('Enter a custom prompt or turn off “custom prompt only”.')
        return
      }
    } else if (!imagePromptParts.subject.trim()) {
      setStatusMessage('Describe the main subject or idea for your graphic.')
      return
    }
    if (!selectedProduct) return
    setBusy(`ai-gen-${placementId}`)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imageGenCustomOnly ? aiPrompt : undefined,
          promptParts: imageGenCustomOnly ? undefined : imagePromptParts,
          imageGenCustomOnly,
          catalogProductId: selectedProduct.id,
          placementId,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        if (json.imageUrl && json.needsRevision) {
          setStatusMessage(json.error || 'Image needs adjustment for print quality.')
          return
        }
        throw new Error(json.error || 'Generation failed')
      }

      const fileId = await registerPrintfulFile(json.imageUrl, `ai-${placementId}-${Date.now()}.png`)
      setPlacementArt(placementId, {
        source: 'ai',
        imageUrl: json.imageUrl,
        printfulFileId: fileId,
      })
      setStatusMessage('Art generated and linked to Printful.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'AI error')
    } finally {
      setBusy(null)
    }
  }

  const handleAiEdit = async (placementId: string) => {
    const art = artByPlacement[placementId]
    if (!art?.imageUrl) {
      setStatusMessage('Generate or upload an image first, then edit.')
      return
    }
    if (!editPrompt.trim()) {
      setStatusMessage('Enter how you want to change the design.')
      return
    }
    if (!selectedProduct) return
    setBusy(`ai-edit-${placementId}`)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt,
          imageUrl: art.imageUrl,
          catalogProductId: selectedProduct.id,
          placementId,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        if (json.imageUrl && json.needsRevision) {
          setStatusMessage(json.error || 'Edited image still needs adjustment for print.')
          return
        }
        throw new Error(json.error || 'Edit failed')
      }

      const fileId = await registerPrintfulFile(json.imageUrl, `edit-${placementId}-${Date.now()}.png`)
      setPlacementArt(placementId, {
        source: 'ai',
        imageUrl: json.imageUrl,
        printfulFileId: fileId,
      })
      setStatusMessage('Edited image saved.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Edit error')
    } finally {
      setBusy(null)
    }
  }

  const pollMockup = useCallback(async (taskId: string | number) => {
    const max = 40
    for (let i = 0; i < max; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const res = await fetch(`/api/printful/mockup-task?id=${encodeURIComponent(String(taskId))}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!json.success) {
        setStatusMessage(json.error || 'Poll failed')
        return
      }
      setMockupStatus(json.status)
      if (json.status === 'completed' && json.mockupUrls?.length) {
        setMockupUrls(json.mockupUrls)
        setStatusMessage('Mockups are ready — review your order below.')
        setStep('review')
        return
      }
      if (json.status === 'failed') {
        setStatusMessage((json.failureReasons || []).join('; ') || 'Mockup generation failed')
        return
      }
    }
    setStatusMessage('Mockups are taking longer than expected — stay on this page or try again.')
  }, [])

  const runMockups = useCallback(async () => {
    if (!selectedProduct || !selectedVariantId || !allPlacementsReady) return
    setBusy('mockup')
    setStatusMessage(null)
    setMockupUrls([])
    setMockupStatus('pending')
    try {
      const files = activePlacements.map((p) => ({
        placement: p.id,
        file_id: artByPlacement[p.id]!.printfulFileId!,
      }))
      const res = await fetch('/api/printful/mockup-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogProductId: selectedProduct.id,
          catalogVariantId: selectedVariantId,
          files,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Mockup task failed')
      setMockupTaskId(json.taskId)
      setStep('mockups')
      await pollMockup(json.taskId)
    } catch (e) {
      setMockupStatus('failed')
      setStatusMessage(e instanceof Error ? e.message : 'Mockup error')
    } finally {
      setBusy(null)
    }
  }, [
    selectedProduct,
    selectedVariantId,
    allPlacementsReady,
    activePlacements,
    artByPlacement,
    pollMockup,
  ])

  const reviewChecklist = useMemo(() => {
    const items: { ok: boolean; label: string }[] = [
      { ok: !!selectedProduct, label: 'Product selected' },
      { ok: selectedVariantId != null, label: 'Size and color selected' },
      {
        ok: selectedPlacementIds.length > 0,
        label: 'Print location(s) chosen',
      },
      {
        ok: allPlacementsReady,
        label: `Art ready for all ${activePlacements.length} selected print area(s)`,
      },
      {
        ok: mockupUrls.length > 0 && mockupStatus === 'completed',
        label: 'Printful mockups completed',
      },
    ]
    return items
  }, [
    selectedProduct,
    selectedVariantId,
    selectedPlacementIds.length,
    allPlacementsReady,
    activePlacements.length,
    mockupUrls.length,
    mockupStatus,
  ])

  const reviewReady = reviewChecklist.every((x) => x.ok)

  const startCheckout = useCallback(async () => {
    if (!userEmail) {
      setStatusMessage('Sign in to continue to payment — your design will be saved to your account.')
      return
    }
    const placementsReady =
      activePlacements.length > 0 && activePlacements.every((p) => artByPlacement[p.id]?.printfulFileId)
    const mockDone = mockupUrls.length > 0 && mockupStatus === 'completed'
    if (!selectedProduct || selectedVariantId == null || !placementsReady || !mockDone) {
      setStatusMessage('Complete every item in the checklist before paying.')
      return
    }
    setBusy('checkout')
    setStatusMessage(null)
    try {
      const placementFileIds: Record<string, string> = {}
      const placementFileUrls: Record<string, string> = {}
      for (const p of activePlacements) {
        const a = artByPlacement[p.id]
        if (a?.printfulFileId) placementFileIds[p.id] = a.printfulFileId
        if (a?.imageUrl) placementFileUrls[p.id] = a.imageUrl
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogProductId: selectedProduct.id,
          catalogVariantId: selectedVariantId,
          placementFileIds,
          placementFileUrls,
          mockupTaskId,
          mockupUrls,
          productName: selectedProduct.name,
          variantLabel: selectedVariant?.name ?? '',
          quantity: 1,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Checkout failed')
      setCheckoutUrl(json.checkoutUrl)
      setStep('checkout')
      setStatusMessage('Redirect to Stripe when you are ready.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Checkout error')
    } finally {
      setBusy(null)
    }
  }, [
    userEmail,
    selectedProduct,
    selectedVariantId,
    activePlacements,
    artByPlacement,
    mockupTaskId,
    mockupUrls,
    mockupStatus,
    selectedVariant,
  ])

  const placementSpecs = useMemo(() => {
    if (!selectedProduct) return {}
    return placementSpecMap(selectedProduct.id, selectedPlacementIds)
  }, [selectedProduct, selectedPlacementIds])

  const chatContext = useMemo((): StudioContextPayload => {
    const artSummary: StudioContextPayload['artByPlacement'] = {}
    for (const p of activePlacements) {
      const a = artByPlacement[p.id]
      artSummary[p.id] = {
        hasImage: !!a?.imageUrl,
        hasPrintfulFile: !!a?.printfulFileId,
        source: a?.source ?? null,
      }
    }
    return {
      step,
      catalogProducts: products.map((p) => ({ id: p.id, name: p.name })),
      currentProductVariants:
        selectedProduct?.variants.map((v) => ({ id: v.id, label: v.name })) ?? [],
      selectedProductId: selectedProduct?.id ?? null,
      selectedProductName: selectedProduct?.name ?? null,
      selectedVariantId,
      selectedVariantLabel: selectedVariant?.name ?? null,
      resolvedPlacementIds: placementPool.map((p) => p.id),
      selectedPlacementIds,
      selectedSize,
      selectedColorKey,
      availableSizes: sizeOptions,
      availableColorOptions: colorOptions.map((c) => ({ key: c.key, label: c.label })),
      placementSpecs,
      placements: activePlacements.map((p) => ({ id: p.id, displayName: p.displayName })),
      activePlacementId,
      artByPlacement: artSummary,
      allPlacementsReady,
      mockupStatus,
      mockupCount: mockupUrls.length,
      checkoutReady: !!checkoutUrl && mockupUrls.length > 0,
    }
  }, [
    step,
    products,
    selectedProduct,
    selectedVariantId,
    selectedVariant,
    placementPool,
    selectedPlacementIds,
    selectedSize,
    selectedColorKey,
    sizeOptions,
    colorOptions,
    placementSpecs,
    activePlacements,
    activePlacementId,
    artByPlacement,
    allPlacementsReady,
    mockupStatus,
    mockupUrls.length,
    checkoutUrl,
  ])

  const chatArtUrls = useMemo(() => {
    const m: Record<string, string | null> = {}
    for (const p of activePlacements) {
      m[p.id] = artByPlacement[p.id]?.imageUrl ?? null
    }
    return m
  }, [activePlacements, artByPlacement])

  const handleAgentActions = useCallback(
    (actions: AgentClientAction[]) => {
      for (const a of actions) {
        if (a.type === 'SELECT_PRODUCT') {
          const p = products.find((x) => x.id === a.catalogProductId)
          if (p) selectProduct(p)
        } else if (a.type === 'SELECT_VARIANT') {
          setSelectedVariantId(a.catalogVariantId)
          const v = selectedProduct?.variants.find((x) => x.id === a.catalogVariantId)
          if (v) {
            setSelectedSize(effectiveSize(v as CatalogVariantLite))
            setSelectedColorKey(colorKey(v.color || v.name))
          }
        } else if (a.type === 'SET_SIZE') {
          setSelectedSize(a.size)
          setSelectedColorKey(null)
        } else if (a.type === 'SET_COLOR') {
          setSelectedColorKey(a.colorKey)
        } else if (a.type === 'SET_PRINT_LOCATIONS') {
          const allowed = new Set(placementPool.map((p) => p.id))
          const next = a.placementIds.filter((id) => allowed.has(id))
          if (next.length > 0) {
            setSelectedPlacementIds(next)
            setArtByPlacement((prev) => {
              const copy = { ...prev }
              for (const id of placementPool.map((p) => p.id)) {
                if (!next.includes(id)) {
                  copy[id] = { source: null, imageUrl: null, printfulFileId: null }
                }
              }
              return copy
            })
            setActivePlacementId((cur) => (cur && next.includes(cur) ? cur : next[0]))
          }
        } else if (a.type === 'SET_STEP') {
          goToStep(a.step as Step)
        } else if (a.type === 'SET_ACTIVE_PLACEMENT') {
          setActivePlacementId(a.placementId)
        } else if (a.type === 'SET_PLACEMENT_ART') {
          setArtByPlacement((prev) => ({
            ...prev,
            [a.placementId]: {
              source: a.source,
              imageUrl: a.imageUrl,
              printfulFileId: a.printfulFileId,
            },
          }))
        } else if (a.type === 'START_MOCKUPS') {
          void runMockups()
        } else if (a.type === 'PREPARE_CHECKOUT') {
          void startCheckout()
        }
      }
    },
    [products, selectProduct, selectedProduct, placementPool, goToStep, runMockups, startCheckout]
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image
              src={LOGO_URL}
              alt="Golden Goose Tees"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
            <div className="hidden sm:block min-w-0">
              <p className="font-serif text-lg font-semibold text-zinc-100 leading-tight">Golden Goose Tees</p>
              <p className="text-xs text-zinc-500">Wear your truth. Loudly.</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {userEmail ? (
              <>
                <span className="text-zinc-500 truncate max-w-[140px]">{userEmail}</span>
                <Link href="/account" className="text-amber-400/90 hover:text-amber-300">
                  Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-zinc-400 hover:text-zinc-200">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-zinc-950 hover:bg-amber-400"
                >
                  Sign up
                </Link>
              </>
            )}
            {selectedProduct && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Start over? Your current design session will be cleared.')) resetSession()
                }}
                className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1680px] mx-auto flex flex-col lg:flex-row lg:items-stretch w-full">
        <main className="flex-1 min-w-0 px-4 py-8 w-full">
          <nav className="flex flex-wrap gap-2 mb-8" aria-label="Steps">
            {STEPS.map((s, i) => {
              const allowed = canNavigateTo(s.id)
              const active = s.id === step
              const done = STEP_ORDER.indexOf(s.id) < STEP_ORDER.indexOf(step)
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!allowed}
                  onClick={() => goToStep(s.id)}
                  title={!allowed ? 'Complete previous steps first' : undefined}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                      : allowed
                        ? done
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                        : 'bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed'
                  }`}
                >
                  {i + 1}. {s.label}
                </button>
              )
            })}
          </nav>

          {catalogLoading && <p className="text-center text-zinc-500">Loading products…</p>}

          {catalogError && !catalogLoading && (
            <div className="max-w-xl mx-auto p-4 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-sm mb-8">
              <p className="font-medium">Catalog unavailable</p>
              <p className="mt-1 text-amber-200/80">{catalogError}</p>
            </div>
          )}

          {statusMessage && (
            <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm">
              {statusMessage}
              {!userEmail && statusMessage.includes('Sign in') && (
                <Link href="/login" className="block mt-2 text-amber-400 hover:text-amber-300 font-medium">
                  Go to sign in →
                </Link>
              )}
            </div>
          )}

          {step === 'browse' && !catalogLoading && !catalogError && (
            <>
              <div className="text-center space-y-2 mb-10">
                <h2 className="font-serif text-3xl md:text-4xl font-semibold text-zinc-50 tracking-tight">
                  Choose your product
                </h2>
                <p className="text-zinc-400 max-w-xl mx-auto">
                  Pick your garment, then size, color, and print locations. We will guide your art to print-ready quality.
                </p>
              </div>
              {products.length === 0 ? (
                <p className="text-center text-zinc-500">No products configured.</p>
              ) : (
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => selectProduct(product)}
                        className="text-left w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 h-full flex flex-col hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-900/10 transition group"
                      >
                        <div className="aspect-square bg-zinc-950 relative">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="w-full h-full object-contain p-6 group-hover:scale-[1.02] transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col border-t border-zinc-800">
                          <h3 className="font-medium text-lg text-zinc-100">{product.name}</h3>
                          {product.basePrice != null && (
                            <p className="text-amber-400/90 font-medium mt-2">From ${product.basePrice.toFixed(2)}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {step === 'configure' && selectedProduct && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-zinc-50">Size, color & print areas</h2>
                <p className="text-zinc-500 mt-1">{selectedProduct.name}</p>
              </div>

              {estimatedTotal != null && (
                <p className="text-sm text-zinc-400">
                  Estimated item total (selected print areas, before tax/shipping):{' '}
                  <strong className="text-amber-400/90">${estimatedTotal.toFixed(2)} USD</strong>
                </p>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setSelectedSize(sz)
                        setSelectedColorKey(null)
                      }}
                      className={`min-w-[3rem] px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedSize === sz
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Color</h3>
                {!selectedSize ? (
                  <p className="text-sm text-zinc-500">Select a size first.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setSelectedColorKey(c.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition ${
                          selectedColorKey === c.key
                            ? 'bg-amber-500/15 border-amber-500/50 text-zinc-100'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-md border border-zinc-500 shrink-0 shadow-inner"
                          style={swatchBackground(c)}
                          aria-hidden
                        />
                        <span className="font-medium">{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                  Print locations
                </h3>
                <p className="text-sm text-zinc-500 mb-3">
                  Add or remove areas independently; each may add to your total. Choose at least one to continue to art.
                </p>
                <ul className="space-y-2">
                  {placementPool.map((p) => {
                    const checked = selectedPlacementIds.includes(p.id)
                    return (
                      <li key={p.id}>
                        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => togglePlacement(p.id, e.target.checked)}
                            className="rounded border-zinc-600 text-amber-500 focus:ring-amber-500/40"
                          />
                          <span className="text-zinc-200">{p.displayName}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => goToStep('browse')}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goDesign}
                  disabled={!selectedVariantId || selectedPlacementIds.length === 0}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to art
                </button>
              </div>
              {(!selectedVariantId || selectedPlacementIds.length === 0) && (
                <p className="text-sm text-amber-200/80">
                  Select size, color, and at least one print location to continue (you can change locations anytime
                  before continuing).
                </p>
              )}
            </div>
          )}

          {step === 'design' && selectedProduct && (
            <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Print areas</h3>
                {activePlacements.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePlacementId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${
                      activePlacementId === p.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-zinc-50'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="font-medium">{p.displayName}</span>
                    {artByPlacement[p.id]?.printfulFileId ? (
                      <span className="block text-xs text-emerald-400/90">Ready</span>
                    ) : (
                      <span className="block text-xs text-zinc-500">Needs art</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="lg:col-span-2 space-y-6 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-6">
                {activePlacementId && (
                  <>
                    <h2 className="font-serif text-xl font-semibold text-zinc-50">
                      {activePlacements.find((x) => x.id === activePlacementId)?.displayName}
                    </h2>
                    {placementSpecs[activePlacementId] && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400 space-y-1">
                        <p className="text-zinc-200 font-medium text-xs uppercase tracking-wide">Print spec</p>
                        <p>
                          Target resolution about{' '}
                          <strong className="text-zinc-200">{placementSpecs[activePlacementId].targetPx}px</strong>{' '}
                          on the long side for best results.
                        </p>
                        <p>
                          Print area ≈ {placementSpecs[activePlacementId].widthIn}&quot; ×{' '}
                          {placementSpecs[activePlacementId].heightIn}&quot; at{' '}
                          {placementSpecs[activePlacementId].dpi} DPI.
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-zinc-500">
                      Upload PNG, JPEG, or WebP, or generate with AI. Files below the minimum size for this area are
                      rejected with guidance to fix them.
                    </p>
                    {artByPlacement[activePlacementId]?.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-w-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={artByPlacement[activePlacementId]!.imageUrl!}
                          alt="Preview"
                          className="w-full h-auto object-contain max-h-64"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-zinc-300">Upload file</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={!!busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleUpload(activePlacementId, f)
                          e.target.value = ''
                        }}
                        className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200"
                      />
                    </div>
                    <div className="space-y-4 border-t border-zinc-800 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300">AI generate</label>
                        <p className="text-xs text-zinc-500 mt-1">
                          Answer a few prompts — we combine them into one image brief for the generator.
                        </p>
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-zinc-400">
                        <input
                          type="checkbox"
                          checked={imageGenCustomOnly}
                          onChange={(e) => setImageGenCustomOnly(e.target.checked)}
                          className="mt-1 rounded border-zinc-600 text-amber-500 focus:ring-amber-500/40"
                        />
                        <span>Use custom prompt only (single text field; skips the builder)</span>
                      </label>
                      {imageGenCustomOnly ? (
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          rows={4}
                          className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          placeholder="Full prompt for the image model…"
                        />
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                              Main subject
                            </label>
                            <textarea
                              value={imagePromptParts.subject}
                              onChange={(e) =>
                                setImagePromptParts((prev) => ({ ...prev, subject: e.target.value }))
                              }
                              rows={3}
                              className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              placeholder="What should the graphic show? (e.g. a geometric goose, a mountain sunset logo…)"
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-zinc-500">Style</label>
                              <select
                                value={imagePromptParts.styleKey}
                                onChange={(e) =>
                                  setImagePromptParts((prev) => ({ ...prev, styleKey: e.target.value }))
                                }
                                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100"
                              >
                                {STYLE_OPTIONS.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-zinc-500">Color theme</label>
                              <select
                                value={imagePromptParts.colorThemeKey}
                                onChange={(e) =>
                                  setImagePromptParts((prev) => ({ ...prev, colorThemeKey: e.target.value }))
                                }
                                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100"
                              >
                                {COLOR_THEME_OPTIONS.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-zinc-500">Mood</label>
                              <select
                                value={imagePromptParts.moodKey}
                                onChange={(e) =>
                                  setImagePromptParts((prev) => ({ ...prev, moodKey: e.target.value }))
                                }
                                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100"
                              >
                                {MOOD_OPTIONS.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-zinc-500">Layout</label>
                              <select
                                value={imagePromptParts.compositionKey}
                                onChange={(e) =>
                                  setImagePromptParts((prev) => ({ ...prev, compositionKey: e.target.value }))
                                }
                                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100"
                              >
                                {COMPOSITION_OPTIONS.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Extra details (optional)</label>
                            <textarea
                              value={imagePromptParts.extraDetails}
                              onChange={(e) =>
                                setImagePromptParts((prev) => ({ ...prev, extraDetails: e.target.value }))
                              }
                              rows={2}
                              className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              placeholder="Textures, symbols, text to include, references…"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Avoid (optional)</label>
                            <input
                              type="text"
                              value={imagePromptParts.avoid}
                              onChange={(e) =>
                                setImagePromptParts((prev) => ({ ...prev, avoid: e.target.value }))
                              }
                              className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              placeholder="e.g. photorealistic faces, busy backgrounds"
                            />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void handleAiGenerate(activePlacementId)}
                        className="px-4 py-2 rounded-lg bg-amber-500/90 text-zinc-950 text-sm font-semibold disabled:opacity-40 hover:bg-amber-400"
                      >
                        {busy === `ai-gen-${activePlacementId}` ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                    <div className="space-y-2 border-t border-zinc-800 pt-4">
                      <label className="block text-sm font-medium text-zinc-300">AI edit</label>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        rows={2}
                        className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        placeholder="How should we change the current image?"
                      />
                      <button
                        type="button"
                        disabled={!!busy || !artByPlacement[activePlacementId]?.imageUrl}
                        onClick={() => void handleAiEdit(activePlacementId)}
                        className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-200/90 text-sm disabled:opacity-40 hover:bg-amber-500/10"
                      >
                        {busy === `ai-edit-${activePlacementId}` ? 'Editing…' : 'Apply edit'}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="lg:col-span-3 flex flex-wrap gap-3 justify-between items-center">
                <button
                  type="button"
                  onClick={() => goToStep('configure')}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void runMockups()}
                  disabled={!allPlacementsReady || !!busy}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-zinc-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400"
                >
                  {busy === 'mockup' ? 'Starting mockups…' : 'Generate mockups'}
                </button>
              </div>
              {!allPlacementsReady && (
                <p className="lg:col-span-3 text-sm text-amber-200/80">
                  Add art for every selected print area before generating mockups.
                </p>
              )}
            </div>
          )}

          {step === 'mockups' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="font-serif text-2xl font-semibold text-zinc-50">Mockup preview</h2>
              <p className="text-zinc-400 text-sm">
                Status: <strong className="text-zinc-200">{mockupStatus ?? '—'}</strong>
                {mockupTaskId != null && <span className="text-zinc-600 ml-2">Task {String(mockupTaskId)}</span>}
              </p>
              {mockupUrls.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {mockupUrls.map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Mockup ${i + 1}`} className="w-full h-auto object-contain" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">Waiting for Printful mockups…</p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToStep('design')}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300"
                >
                  Back to art
                </button>
                <button
                  type="button"
                  onClick={() => goToStep('review')}
                  disabled={!canNavigateTo('review')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-500"
                >
                  Continue to review
                </button>
                <button
                  type="button"
                  onClick={() => mockupTaskId && void pollMockup(mockupTaskId)}
                  disabled={!mockupTaskId || !!busy}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-sm text-zinc-300 disabled:opacity-40"
                >
                  Refresh status
                </button>
              </div>
            </div>
          )}

          {step === 'review' && selectedProduct && (
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="font-serif text-2xl font-semibold text-zinc-50">Review your order</h2>
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 space-y-4">
                <h3 className="font-medium text-zinc-200">Checklist</h3>
                <ul className="space-y-2">
                  {reviewChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className={item.ok ? 'text-emerald-400' : 'text-amber-400/90'} aria-hidden>
                        {item.ok ? '✓' : '○'}
                      </span>
                      <span className={item.ok ? 'text-zinc-300' : 'text-zinc-500'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 space-y-3 text-sm">
                <p>
                  <span className="text-zinc-500">Product</span>
                  <br />
                  <span className="font-medium text-zinc-200">{selectedProduct.name}</span>
                </p>
                <p>
                  <span className="text-zinc-500">Variant</span>
                  <br />
                  <span className="font-medium text-zinc-200">{selectedVariant?.name ?? '—'}</span>
                </p>
                <p>
                  <span className="text-zinc-500">Print areas</span>
                  <br />
                  <span className="font-medium text-zinc-200">{selectedPlacementIds.join(', ')}</span>
                </p>
                {estimatedTotal != null && (
                  <p>
                    <span className="text-zinc-500">Estimated item total (USD)</span>
                    <br />
                    <span className="font-medium text-lg text-amber-400/90">${estimatedTotal.toFixed(2)}</span>
                    <span className="text-zinc-500"> — tax and shipping at Stripe</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {activePlacements.map((p) => {
                    const art = artByPlacement[p.id]
                    return (
                      <div key={p.id} className="text-xs border border-zinc-800 rounded-lg p-2 w-24">
                        <div className="text-zinc-500 truncate">{p.displayName}</div>
                        {art?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={art.imageUrl} alt="" className="w-full h-16 object-cover rounded mt-1" />
                        ) : (
                          <div className="h-16 bg-zinc-800 rounded mt-1" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {!userEmail && (
                <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
                  Sign in to continue to payment and save this design to your account.
                  <Link href="/login" className="block mt-2 font-medium text-amber-400 hover:text-amber-300">
                    Sign in →
                  </Link>
                </div>
              )}
              {mockupUrls.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mockupUrls.slice(0, 4).map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Mockup ${i + 1}`} className="w-full h-auto object-contain" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToStep('mockups')}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300"
                >
                  Back to mockups
                </button>
                <button
                  type="button"
                  onClick={() => void startCheckout()}
                  disabled={!reviewReady || !!busy || !userEmail}
                  className="px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400"
                >
                  {busy === 'checkout' ? 'Preparing checkout…' : 'Continue to payment'}
                </button>
              </div>
              {!reviewReady && (
                <p className="text-sm text-amber-200/80">
                  Complete all checklist items above. If mockups failed, go back and try &quot;Generate mockups&quot;
                  again.
                </p>
              )}
            </div>
          )}

          {step === 'checkout' && (
            <div className="max-w-lg mx-auto text-center space-y-6">
              <h2 className="font-serif text-2xl font-semibold text-zinc-50">Pay securely</h2>
              <p className="text-zinc-400 text-sm">
                Complete payment on Stripe. We will submit your order to Printful after payment.
              </p>
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="inline-block px-8 py-3 rounded-xl bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400"
                >
                  Pay with Stripe
                </a>
              ) : (
                <p className="text-red-400 text-sm">No checkout link — return to review and try again.</p>
              )}
              <button
                type="button"
                onClick={() => goToStep('review')}
                className="block mx-auto text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Back to review
              </button>
            </div>
          )}
        </main>
        <StudioChatPanel
          context={chatContext}
          artUrls={chatArtUrls}
          onAgentActions={handleAgentActions}
          messages={chatMessages}
          onMessagesChange={setChatMessages}
        />
      </div>
    </div>
  )
}
