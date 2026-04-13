import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type StudioSnapshot = {
  v: number
  step: string
  selectedProductId: number | null
  selectedVariantId: number | null
  selectedPlacementIds: string[]
  selectedSize: string | null
  selectedColorKey: string | null
  placements: unknown[]
  activePlacementId: string | null
  artByPlacement: Record<string, unknown>
  mockupTaskId: string | number | null
  mockupUrls: string[]
  mockupStatus: string | null
  checkoutUrl: string | null
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  imageGenCustomOnly?: boolean
  imagePromptParts?: Record<string, unknown>
  aiPrompt?: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('design_sessions')
    .select('id, current_designs, messages, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('design_sessions load:', error)
    const msg = error.message || ''
    const hint =
      msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')
        ? 'The design_sessions table is missing. Apply Supabase migrations from supabase/schema.sql or supabase/migrations so the studio can persist sessions.'
        : undefined
    return NextResponse.json(
      { success: false, error: error.message, ...(hint ? { hint } : {}) },
      { status: 500 }
    )
  }

  if (!data?.current_designs) {
    return NextResponse.json({ success: true, snapshot: null })
  }

  const snap = data.current_designs as StudioSnapshot
  const messages = Array.isArray(data.messages) ? data.messages : []
  return NextResponse.json({
    success: true,
    snapshot: snap,
    chatMessages: messages,
    sessionId: data.id,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const snapshot = body.snapshot as StudioSnapshot
    const chatMessages = Array.isArray(body.chatMessages) ? body.chatMessages : null

    if (!snapshot || typeof snapshot !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid snapshot' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('design_sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const payload = {
      user_id: user.id,
      product_id: snapshot.selectedProductId != null ? String(snapshot.selectedProductId) : null,
      current_designs: snapshot,
      messages: chatMessages ?? undefined,
      stage: snapshot.step || 'studio',
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('design_sessions')
        .update({
          product_id: payload.product_id,
          current_designs: payload.current_designs,
          ...(chatMessages ? { messages: chatMessages } : {}),
          stage: payload.stage,
          updated_at: payload.updated_at,
        })
        .eq('id', existing.id)
      if (error) {
        console.error('design_sessions update:', error)
        const msg = error.message || ''
        const hint =
          msg.includes('profiles') && msg.includes('foreign key')
            ? 'Your account profile row may be missing. Ensure the auth trigger handle_new_user is installed (see supabase/migrations/003_profiles_auth_users_alignment.sql).'
            : msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')
              ? 'Apply Supabase migrations so design_sessions exists.'
              : undefined
        return NextResponse.json(
          { success: false, error: error.message, ...(hint ? { hint } : {}) },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabase.from('design_sessions').insert({
        user_id: user.id,
        product_id: payload.product_id,
        current_designs: payload.current_designs,
        messages: chatMessages ?? [],
        stage: payload.stage,
      })
      if (error) {
        console.error('design_sessions insert:', error)
        const msg = error.message || ''
        const hint =
          msg.includes('profiles') && msg.includes('foreign key')
            ? 'Your account profile row may be missing. Ensure the auth trigger handle_new_user is installed (see supabase/migrations/003_profiles_auth_users_alignment.sql).'
            : msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')
              ? 'Apply Supabase migrations so design_sessions exists.'
              : undefined
        return NextResponse.json(
          { success: false, error: error.message, ...(hint ? { hint } : {}) },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
