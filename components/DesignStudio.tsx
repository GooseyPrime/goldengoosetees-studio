'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveStudioPlacements } from '@/lib/design/placements'

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

type Step = 'browse' | 'configure' | 'design' | 'mockups' | 'checkout'

type PlacementRow = { id: string; displayName: string; technique: string }

type PlacementArt = {
  source: 'ai' | 'upload' | null
  imageUrl: string | null
  printfulFileId: string | null
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'browse', label: 'Products' },
  { id: 'configure', label: 'Size & color' },
  { id: 'design', label: 'Your art' },
  { id: 'mockups', label: 'Mockups' },
  { id: 'checkout', label: 'Checkout' },
]

export default function DesignStudio() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('browse')
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [placements, setPlacements] = useState<PlacementRow[]>([])
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null)
  const [artByPlacement, setArtByPlacement] = useState<Record<string, PlacementArt>>({})

  const [aiPrompt, setAiPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [mockupTaskId, setMockupTaskId] = useState<string | number | null>(null)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const [mockupStatus, setMockupStatus] = useState<string | null>(null)

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

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
        setProducts(json.data ?? [])
        setCatalogError(null)
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
  }, [])

  const selectedVariant = useMemo(
    () => selectedProduct?.variants.find((v) => v.id === selectedVariantId) ?? null,
    [selectedProduct, selectedVariantId]
  )

  const resetSession = useCallback(() => {
    setStep('browse')
    setSelectedProduct(null)
    setSelectedVariantId(null)
    setPlacements([])
    setActivePlacementId(null)
    setArtByPlacement({})
    setAiPrompt('')
    setEditPrompt('')
    setMockupTaskId(null)
    setMockupUrls([])
    setMockupStatus(null)
    setCheckoutUrl(null)
    setStatusMessage(null)
  }, [])

  const selectProduct = (p: CatalogProduct) => {
    setSelectedProduct(p)
    const rows = resolveStudioPlacements(p.id, p.printfulPlacementsRaw ?? null)
    setPlacements(rows)
    setActivePlacementId(rows[0]?.id ?? null)
    const initial: Record<string, PlacementArt> = {}
    for (const r of rows) {
      initial[r.id] = { source: null, imageUrl: null, printfulFileId: null }
    }
    setArtByPlacement(initial)
    setSelectedVariantId(null)
    setMockupTaskId(null)
    setMockupUrls([])
    setMockupStatus(null)
    setCheckoutUrl(null)
    setStep('configure')
  }

  const goConfigure = () => {
    if (!selectedProduct) return
    setStep('configure')
  }

  const goDesign = () => {
    if (!selectedVariantId) {
      setStatusMessage('Choose a size and color first.')
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

  const setPlacementArt = (placementId: string, patch: Partial<PlacementArt>) => {
    setArtByPlacement((prev) => ({
      ...prev,
      [placementId]: { ...prev[placementId], ...patch },
    }))
  }

  const handleUpload = async (placementId: string, file: File) => {
    setBusy(`upload-${placementId}`)
    setStatusMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
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
    if (!aiPrompt.trim()) {
      setStatusMessage('Enter a prompt for the AI.')
      return
    }
    setBusy(`ai-gen-${placementId}`)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Generation failed')

      const fileId = await registerPrintfulFile(json.imageUrl, `ai-${placementId}-${Date.now()}.png`)
      setPlacementArt(placementId, {
        source: 'ai',
        imageUrl: json.imageUrl,
        printfulFileId: fileId,
      })
      setStatusMessage('AI image created and linked to Printful.')
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
    setBusy(`ai-edit-${placementId}`)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editPrompt, imageUrl: art.imageUrl }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Edit failed')

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

  const allPlacementsReady = useMemo(() => {
    if (placements.length === 0) return false
    return placements.every((p) => artByPlacement[p.id]?.printfulFileId)
  }, [placements, artByPlacement])

  const runMockups = async () => {
    if (!selectedProduct || !selectedVariantId || !allPlacementsReady) return
    setBusy('mockup')
    setStatusMessage(null)
    setMockupUrls([])
    setMockupStatus('pending')
    try {
      const files = placements.map((p) => ({
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
  }

  const pollMockup = async (taskId: string | number) => {
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
        setStatusMessage('Mockups are ready.')
        return
      }
      if (json.status === 'failed') {
        setStatusMessage((json.failureReasons || []).join('; ') || 'Mockup generation failed')
        return
      }
    }
    setStatusMessage('Mockups are taking longer than expected — refresh or check back.')
  }

  const startCheckout = async () => {
    if (!selectedProduct || !selectedVariantId || !allPlacementsReady) return
    if (!mockupUrls.length) {
      setStatusMessage('Wait for mockups to finish before checkout.')
      return
    }
    setBusy('checkout')
    setStatusMessage(null)
    try {
      const placementFileIds: Record<string, string> = {}
      const placementFileUrls: Record<string, string> = {}
      for (const p of placements) {
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
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🪿</div>
            <div>
              <h1 className="text-xl font-bold">Golden Goose Tees</h1>
              <p className="text-xs text-gray-600">Wear Your Truth. Loudly.</p>
            </div>
          </div>
          {selectedProduct && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Start over? Your current design session will be cleared.')) resetSession()
              }}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex flex-wrap gap-2 mb-8" aria-label="Steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                i <= stepIndex ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {i + 1}. {s.label}
            </div>
          ))}
        </nav>

        {catalogLoading && <p className="text-center text-gray-500">Loading products…</p>}

        {catalogError && !catalogLoading && (
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm mb-8">
            <p className="font-medium">Catalog unavailable</p>
            <p className="mt-1">{catalogError}</p>
          </div>
        )}

        {statusMessage && (
          <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-sm">
            {statusMessage}
          </div>
        )}

        {/* Browse */}
        {step === 'browse' && !catalogLoading && !catalogError && (
          <>
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-3xl font-bold">Choose your product</h2>
              <p className="text-slate-600">Then pick size and color, add art to each print area, preview mockups, and pay.</p>
            </div>
            {products.length === 0 ? (
              <p className="text-center text-gray-500">No products configured.</p>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => selectProduct(product)}
                      className="text-left w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 h-full flex flex-col hover:ring-2 hover:ring-slate-400 transition"
                    >
                      <div className="aspect-square bg-slate-100 relative">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-4" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No image</div>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-semibold text-lg text-slate-900">{product.name}</h3>
                        {product.basePrice != null && (
                          <p className="text-slate-700 font-medium mt-2">From ${product.basePrice.toFixed(2)}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Configure */}
        {step === 'configure' && selectedProduct && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Size & color</h2>
            <p className="text-slate-600 mb-6">{selectedProduct.name}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto">
              {selectedProduct.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`p-3 rounded-xl border text-left text-sm ${
                    selectedVariantId === v.id ? 'border-slate-900 ring-2 ring-slate-900 bg-white' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="font-medium line-clamp-2">{v.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {v.color} {v.size && `· ${v.size}`}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStep('browse')}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goDesign}
                disabled={!selectedVariantId}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-40"
              >
                Continue to art
              </button>
            </div>
          </div>
        )}

        {/* Design */}
        {step === 'design' && selectedProduct && (
          <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-1">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Print areas</h3>
              {placements.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlacementId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activePlacementId === p.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'
                  }`}
                >
                  <span className="font-medium">{p.displayName}</span>
                  {artByPlacement[p.id]?.printfulFileId ? (
                    <span className="block text-xs opacity-80">Ready</span>
                  ) : (
                    <span className="block text-xs opacity-80">Needs art</span>
                  )}
                </button>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-6 bg-white rounded-2xl border border-slate-200 p-6">
              {activePlacementId && (
                <>
                  <h2 className="text-xl font-bold">{placements.find((x) => x.id === activePlacementId)?.displayName}</h2>
                  <p className="text-sm text-slate-600">
                    Use AI or upload a PNG/JPEG for this area. Repeat for each print area before generating mockups.
                  </p>
                  {artByPlacement[activePlacementId]?.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={artByPlacement[activePlacementId]!.imageUrl!}
                        alt="Preview"
                        className="w-full h-auto object-contain max-h-64"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Upload file</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={!!busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUpload(activePlacementId, f)
                        e.target.value = ''
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-sm font-medium">AI generate (DALL·E 3)</label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Describe the graphic you want on this print area…"
                    />
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void handleAiGenerate(activePlacementId)}
                      className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-40"
                    >
                      {busy === `ai-gen-${activePlacementId}` ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-sm font-medium">AI edit (DALL·E 2)</label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="How should we change the current image?"
                    />
                    <button
                      type="button"
                      disabled={!!busy || !artByPlacement[activePlacementId]?.imageUrl}
                      onClick={() => void handleAiEdit(activePlacementId)}
                      className="px-4 py-2 rounded-lg border border-violet-600 text-violet-700 text-sm disabled:opacity-40"
                    >
                      {busy === `ai-edit-${activePlacementId}` ? 'Editing…' : 'Apply edit'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="lg:col-span-3 flex flex-wrap gap-3 justify-between items-center">
              <button type="button" onClick={goConfigure} className="px-4 py-2 rounded-lg border border-slate-300">
                Back
              </button>
              <button
                type="button"
                onClick={() => void runMockups()}
                disabled={!allPlacementsReady || !!busy}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-40"
              >
                {busy === 'mockup' ? 'Starting mockups…' : 'Generate mockups'}
              </button>
            </div>
            {!allPlacementsReady && (
              <p className="lg:col-span-3 text-sm text-amber-800">
                Add art for every print area above before generating mockups.
              </p>
            )}
          </div>
        )}

        {/* Mockups */}
        {step === 'mockups' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Mockup preview</h2>
            <p className="text-slate-600 text-sm">
              Status: <strong>{mockupStatus ?? '—'}</strong>
              {mockupTaskId != null && (
                <span className="text-slate-400 ml-2">Task {String(mockupTaskId)}</span>
              )}
            </p>
            {mockupUrls.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {mockupUrls.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Mockup ${i + 1}`} className="w-full h-auto object-contain" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Waiting for Printful mockups…</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep('design')} className="px-4 py-2 rounded-lg border border-slate-300">
                Back to art
              </button>
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={!mockupUrls.length || !!busy}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40"
              >
                Continue to checkout
              </button>
            </div>
          </div>
        )}

        {/* Checkout */}
        {step === 'checkout' && (
          <div className="max-w-lg mx-auto text-center space-y-6">
            <h2 className="text-2xl font-bold">Pay securely</h2>
            <p className="text-slate-600 text-sm">
              You will complete payment on Stripe. After payment, we submit your order to Printful for fulfillment.
            </p>
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="inline-block px-8 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
              >
                Pay with Stripe
              </a>
            ) : (
              <p className="text-red-600 text-sm">No checkout link — go back and try again.</p>
            )}
            <button type="button" onClick={() => setStep('mockups')} className="block mx-auto text-sm text-slate-600 underline">
              Back to mockups
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
