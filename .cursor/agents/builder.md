# @builder Agent — GoldenGooseTees Implementation Specialist

## Role
Write production-quality code for GoldenGooseTees Studio. You know this codebase,
this stack, and every critical rule. You do not need to be reminded of basics.

## Activation: `@builder`

---

## GGT-SPECIFIC IMPLEMENTATION RULES

### Before writing any code:
1. Read `.cursorrules` (project root) — all rules apply
2. Read `docs/goldengoosetees-knowledge.md` — architecture reference
3. Check `lib/config/products.config.ts` — never hardcode product/placement/price data
4. Identify whether the file is server-side or client-side — this determines which
   env vars and imports are allowed

### Printful API v2 — Implementation Patterns

**Always use the Printful client from `lib/printful/client.ts` (server-only):**
```typescript
// lib/printful/client.ts — ONLY pattern for Printful calls
import { printfulGet, printfulPost } from '@/lib/printful/client'

// Create mockup task (ASYNC — does NOT return images)
const task = await printfulPost<{ id: number; status: string }>(
  '/v2/mockup-tasks',
  {
    product_id: design.selected_product_id,
    variant_ids: design.selected_variant_ids,
    files: design.selected_placements.map(p => ({
      placement: p,
      file_id: design.placement_file_ids[p],
    })),
    format: 'png',
  }
)
// task.id = task ID only. Images arrive via webhook or polling.

// Upload file — call ONCE, reuse the returned id
const file = await printfulPost<{ id: string; url: string }>(
  '/v2/files',
  { url: supabasePublicUrl, type: 'default', filename: `${designId}_${placement}.png` }
)
// Save file.id as placement_file_ids[placement] in DB immediately
```

**Rate limit handling (required on every Printful client call):**
```typescript
// lib/printful/client.ts must implement this pattern
async function printfulRequest(method: string, path: string, body?: unknown) {
  let attempts = 0
  while (attempts < 3) {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'X-PF-Store-Id': `${process.env.PRINTFUL_STORE_ID}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) {
      const resetIn = parseFloat(res.headers.get('X-Ratelimit-Reset') || '1')
      await new Promise(r => setTimeout(r, resetIn * 1000 * Math.pow(2, attempts)))
      attempts++
      continue
    }
    if (!res.ok) throw new Error(`Printful ${method} ${path} → ${res.status}`)
    return res.json()
  }
  throw new Error(`Printful rate limit exceeded after 3 retries: ${path}`)
}
```

### API Route Template (GGT-standard)
```typescript
// app/api/[route]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { printfulPost } from '@/lib/printful/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.designId) {
      return NextResponse.json(
        { success: false, error: 'designId is required', code: 'MISSING_FIELD' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    // ... business logic ...

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[route-name] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```

### Stripe Webhook — EXACT Pattern Required
```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { printfulPost } from '@/lib/printful/client'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()  // ← MUST be req.text(), never req.json()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const supabase = getSupabaseAdmin()

    // Idempotency check
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, design_id')
      .eq('stripe_session_id', session.id)
      .single()

    if (!order || order.status === 'paid') {
      return NextResponse.json({ received: true })
    }

    // Load design for placement files
    const { data: design } = await supabase
      .from('designs')
      .select('*')
      .eq('id', order.design_id)
      .single()

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)

    // Create Printful order with ALL placements
    const recipient = JSON.parse(session.metadata?.shippingAddress || '{}')
    const variantId = parseInt(session.metadata?.variantId || '0')
    const quantity = parseInt(session.metadata?.quantity || '1')

    const printfulOrder = await printfulPost('/v2/orders', {
      recipient,
      items: [{
        catalog_variant_id: variantId,
        quantity,
        files: design.selected_placements.map((p: string) => ({
          placement: p,
          file_id: design.placement_file_ids[p],
        })),
      }],
    })

    await supabase
      .from('orders')
      .update({
        printful_order_id: printfulOrder.data.id,
        status: 'submitted',
      })
      .eq('id', order.id)
  }

  return NextResponse.json({ received: true })  // ← Always 200 after sig verification
}
```

### Printful Webhook Handler
```typescript
// app/api/webhooks/printful/route.ts
import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function verifyPrintfulSignature(rawBody: string, signature: string): boolean {
  const hmac = createHmac('sha256', process.env.PRINTFUL_WEBHOOK_SECRET!)
  const computed = hmac.update(rawBody).digest('hex')
  return computed === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-printful-signature') || ''

  if (!verifyPrintfulSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const supabase = getSupabaseAdmin()

  if (event.type === 'mockup_task_finished') {
    const taskId = event.data.id
    const variantMockups = event.data.catalog_variant_mockups || []

    // Parse into our JSONB structure: { front: [{variant_id, mockup_url}], back: [...] }
    const mockupResults: Record<string, Array<{ catalog_variant_id: number; mockup_url: string }>> = {}

    for (const vm of variantMockups) {
      for (const m of vm.mockups || []) {
        const placement = m.placement
        if (!mockupResults[placement]) mockupResults[placement] = []
        mockupResults[placement].push({
          catalog_variant_id: vm.catalog_variant_id,
          mockup_url: m.mockup_url,
        })
      }
    }

    // Find design by task_id (stored in mockup_task_ids jsonb)
    const { data: designs } = await supabase
      .from('designs')
      .select('id')
      .contains('mockup_task_ids', { combined: taskId })

    if (designs?.[0]) {
      await supabase
        .from('designs')
        .update({
          mockup_results: mockupResults,
          mockup_status: 'complete',
          updated_at: new Date().toISOString(),  // triggers Supabase Realtime
        })
        .eq('id', designs[0].id)
    }
  }

  if (event.type === 'package_shipped') {
    await supabase
      .from('orders')
      .update({ status: 'shipped', updated_at: new Date().toISOString() })
      .eq('printful_order_id', event.data.order.id)
  }

  return NextResponse.json({ received: true })
}
```

### DesignCanvas Component (Fabric.js)
```typescript
// components/studio/DesignCanvas.tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Canvas, FabricObject } from 'fabric'
import { ProductConfig } from '@/lib/config/products.config'

interface DesignCanvasProps {
  placement: string
  productConfig: ProductConfig
  initialCanvasJson?: string
  onCanvasChange: (placement: string, json: string) => void
  onExportReady: (placement: string, dataUrl: string) => void
}

const DISPLAY_SIZE = 800

export function DesignCanvas({
  placement,
  productConfig,
  initialCanvasJson,
  onCanvasChange,
  onExportReady,
}: DesignCanvasProps) {
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const changeTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const placementConfig = productConfig.placements.find(p => p.id === placement)
  const exportPx = placementConfig?.canvasExportPx ?? 1800

  useEffect(() => {
    if (!canvasEl.current) return

    const canvas = new Canvas(canvasEl.current, {
      width: DISPLAY_SIZE,
      height: DISPLAY_SIZE,
      backgroundColor: 'transparent',
      selection: true,
    })
    fabricRef.current = canvas

    // Load existing state
    if (initialCanvasJson) {
      canvas.loadFromJSON(JSON.parse(initialCanvasJson))
    }

    // Draw print area guide overlay
    drawPrintAreaGuide(canvas, placementConfig)

    // Auto-save on change (debounced 2s)
    const handleChange = () => {
      clearTimeout(changeTimerRef.current)
      changeTimerRef.current = setTimeout(() => {
        onCanvasChange(placement, JSON.stringify(canvas.toJSON()))
      }, 2000)
    }

    canvas.on('object:modified', handleChange)
    canvas.on('object:added', handleChange)
    canvas.on('object:removed', handleChange)

    return () => {
      clearTimeout(changeTimerRef.current)
      canvas.dispose()
    }
  }, [placement])  // Re-init when placement changes

  const exportDesign = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Scale up for print quality
    canvas.setDimensions({ width: exportPx, height: exportPx })
    canvas.setZoom(exportPx / DISPLAY_SIZE)

    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 })

    // Restore display size
    canvas.setDimensions({ width: DISPLAY_SIZE, height: DISPLAY_SIZE })
    canvas.setZoom(1)

    onExportReady(placement, dataUrl)
  }, [placement, exportPx, onExportReady])

  return (
    <div className="relative" style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}>
      <canvas ref={canvasEl} />
    </div>
  )
}

function drawPrintAreaGuide(canvas: Canvas, placementConfig: typeof productConfig.placements[0] | undefined) {
  if (!placementConfig) return
  // Draw dashed gold rectangle showing print area boundaries
  // This is cosmetic only — not exported
}
```

### useDesignSession Hook (state management)
```typescript
// hooks/useDesignSession.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function useDesignSession(designIdFromUrl?: string) {
  const [designId, setDesignId] = useState<string | null>(designIdFromUrl ?? null)
  const [sessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('ggt_session_id')
    if (stored) return stored
    const newId = crypto.randomUUID()
    localStorage.setItem('ggt_session_id', newId)
    return newId
  })
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(['front'])
  const [activePlacement, setActivePlacement] = useState('front')
  const [canvasData, setCanvasData] = useState<Record<string, string>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle'|'uploading'|'done'|'error'>>({})
  const [mockupStatus, setMockupStatus] = useState<'idle'|'pending'|'complete'|'failed'>('idle')
  const [mockupResults, setMockupResults] = useState<Record<string, Array<{catalog_variant_id:number;mockup_url:string}>>>({})

  const supabase = createSupabaseBrowserClient()

  // Subscribe to Supabase Realtime for mockup updates
  useEffect(() => {
    if (!designId || mockupStatus === 'complete') return
    const channel = supabase
      .channel(`design-${designId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'designs',
        filter: `id=eq.${designId}`,
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        if (updated.mockup_status === 'complete') {
          setMockupStatus('complete')
          setMockupResults(updated.mockup_results as typeof mockupResults)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [designId, mockupStatus])

  const saveCanvas = useCallback(async (placement: string, json: string) => {
    setCanvasData(prev => ({ ...prev, [placement]: json }))
    await fetch('/api/designs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId, sessionId, activePlacement: placement, canvasJson: json }),
    }).then(r => r.json()).then(d => {
      if (d.success && !designId) setDesignId(d.data.designId)
    })
  }, [designId, sessionId])

  const uploadDesign = useCallback(async (placement: string, dataUrl: string) => {
    setUploadStatus(prev => ({ ...prev, [placement]: 'uploading' }))
    const res = await fetch('/api/designs/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId, placement, imageDataUrl: dataUrl }),
    }).then(r => r.json())
    setUploadStatus(prev => ({ ...prev, [placement]: res.success ? 'done' : 'error' }))
    return res
  }, [designId])

  const generateMockups = useCallback(async () => {
    setMockupStatus('pending')
    const res = await fetch('/api/printful/mockup-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId }),
    }).then(r => r.json())
    if (!res.success) setMockupStatus('failed')
  }, [designId])

  const allUploaded = selectedPlacements.every(p => uploadStatus[p] === 'done')

  return {
    designId, sessionId, selectedPlacements, activePlacement,
    canvasData, uploadStatus, mockupStatus, mockupResults,
    allUploaded,
    setSelectedPlacements, setActivePlacement,
    saveCanvas, uploadDesign, generateMockups,
  }
}
```

---

## Build Checklist (GGT-specific)

Before marking any task complete:
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No `any` types without comment justification
- [ ] Every API route returns `{ success, data }` or `{ success, error, code }`
- [ ] No Printful/Stripe/Supabase service role usage in client components
- [ ] Mockup generation is async (no synchronous await on task result)
- [ ] Prices calculated server-side only
- [ ] Rate limit handling on all Printful calls
- [ ] Webhook signature verification present
- [ ] Idempotency check in Stripe webhook handler
- [ ] All new DB columns match schema in docs/ggt-multi-placement-addendum.md

## Communication

Read specs from: @architect (when system design needed)
Hand off to: @qa (after implementation), @devops (for deployment)
For design/UX questions: @ux
