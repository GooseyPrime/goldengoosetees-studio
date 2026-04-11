import OpenAI from 'openai'
import { printfulPost } from '@/lib/printful/client'

export async function registerPrintfulFileFromUrl(url: string, filename: string): Promise<{ fileId: string }> {
  const res = await printfulPost<{ id: string }>('/files', {
    url,
    type: 'default',
    filename,
  })
  if (!res.success || !res.data?.id) {
    throw new Error(res.error || 'Printful file registration failed')
  }
  return { fileId: res.data.id }
}

export async function generateImageDalle3(prompt: string): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  const client = new OpenAI({ apiKey: key })
  const result = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  })
  const url = result.data?.[0]?.url
  if (!url) throw new Error('No image returned from generator')
  return { imageUrl: url, revisedPrompt: result.data?.[0]?.revised_prompt }
}

export async function editImageDalle2(imageUrl: string, prompt: string): Promise<{ imageUrl: string }> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Could not fetch source image for edit')
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length > 4 * 1024 * 1024) throw new Error('Image too large for edit (max 4MB)')
  const client = new OpenAI({ apiKey: key })
  const file = await OpenAI.toFile(buf, 'source.png', { type: 'image/png' })
  const result = await client.images.edit({
    model: 'dall-e-2',
    image: file,
    prompt,
    n: 1,
    size: '1024x1024',
  })
  const url = result.data?.[0]?.url
  if (!url) throw new Error('No edited image returned')
  return { imageUrl: url }
}

export type StudioContextPayload = {
  step: string
  catalogProducts: Array<{ id: number; name: string }>
  currentProductVariants: Array<{ id: number; label: string }>
  selectedProductId: number | null
  selectedProductName: string | null
  selectedVariantId: number | null
  selectedVariantLabel: string | null
  placements: Array<{ id: string; displayName: string }>
  activePlacementId: string | null
  artByPlacement: Record<
    string,
    { hasImage: boolean; hasPrintfulFile: boolean; source: 'ai' | 'upload' | null }
  >
  allPlacementsReady: boolean
  mockupStatus: string | null
  mockupCount: number
  checkoutReady: boolean
}

export const DESIGN_AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'select_product',
      description:
        'Choose a catalog product by Printful catalog_product_id. Only works from the product browse step; user must be viewing the grid.',
      parameters: {
        type: 'object',
        properties: {
          catalog_product_id: { type: 'integer', description: 'Printful catalog product id from context' },
        },
        required: ['catalog_product_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_variant',
      description:
        'Select size/color by catalog_variant_id after a product is chosen. Use when on Size & color step.',
      parameters: {
        type: 'object',
        properties: {
          catalog_variant_id: { type: 'integer' },
        },
        required: ['catalog_variant_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_studio_status',
      description:
        'Return structured studio state (step, product, variant, placements, art, mockups). Use when the user asks what to do next or where they are.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_step',
      description: 'Navigate to a workflow step if prerequisites are satisfied.',
      parameters: {
        type: 'object',
        properties: {
          step: {
            type: 'string',
            enum: ['browse', 'configure', 'design', 'mockups', 'review', 'checkout'],
          },
        },
        required: ['step'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_active_placement',
      description: 'Focus a print area in the design step (e.g. front, back, sleeve_left).',
      parameters: {
        type: 'object',
        properties: { placement_id: { type: 'string' } },
        required: ['placement_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_design',
      description:
        'Generate a new image with DALL·E 3 and register it with Printful for a print placement. Requires product selected.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          placement_id: { type: 'string', description: 'Defaults to active placement' },
        },
        required: ['prompt'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_mockups',
      description:
        'Submit the current designs to Printful to generate product mockups. Requires all placements filled and a variant selected.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_checkout',
      description:
        'Create the Stripe checkout session after mockups completed. User must pass review checklist.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_design',
      description:
        'Edit existing placement artwork with DALL·E 2. Requires image already on that placement.',
      parameters: {
        type: 'object',
        properties: {
          instructions: { type: 'string' },
          placement_id: { type: 'string', description: 'Defaults to active placement' },
        },
        required: ['instructions'],
        additionalProperties: false,
      },
    },
  },
]

export type ClientAction =
  | { type: 'SELECT_PRODUCT'; catalogProductId: number }
  | { type: 'SELECT_VARIANT'; catalogVariantId: number }
  | { type: 'SET_STEP'; step: string }
  | { type: 'SET_ACTIVE_PLACEMENT'; placementId: string }
  | { type: 'START_MOCKUPS' }
  | { type: 'PREPARE_CHECKOUT' }
  | {
      type: 'SET_PLACEMENT_ART'
      placementId: string
      imageUrl: string
      printfulFileId: string
      source: 'ai' | 'upload'
    }

function resolvePlacementId(
  requested: string | undefined,
  active: string | null,
  placements: Array<{ id: string }>
): string | null {
  if (requested && placements.some((p) => p.id === requested)) return requested
  if (active && placements.some((p) => p.id === active)) return active
  return placements[0]?.id ?? null
}

function canNavigateToStep(target: string, ctx: StudioContextPayload): { ok: boolean; reason?: string } {
  if (target === 'browse') return { ok: true }
  if (target === 'configure') {
    if (!ctx.selectedProductId) return { ok: false, reason: 'Select a product first' }
    return { ok: true }
  }
  if (target === 'design') {
    if (!ctx.selectedProductId) return { ok: false, reason: 'Select a product first' }
    if (ctx.selectedVariantId == null) return { ok: false, reason: 'Pick a size/color variant first' }
    return { ok: true }
  }
  if (target === 'mockups') {
    const ok =
      !!ctx.selectedProductId &&
      ctx.selectedVariantId != null &&
      (ctx.allPlacementsReady || ctx.mockupCount > 0)
    if (!ok)
      return {
        ok: false,
        reason: 'Need product, variant, and art on all placements (or an active mockup task)',
      }
    return { ok: true }
  }
  if (target === 'review') {
    if (ctx.mockupCount === 0 || ctx.mockupStatus !== 'completed')
      return { ok: false, reason: 'Wait until mockups complete' }
    return { ok: true }
  }
  if (target === 'checkout') {
    if (!ctx.checkoutReady) return { ok: false, reason: 'Open checkout from Review after session is created' }
    return { ok: true }
  }
  return { ok: false, reason: 'Unknown step' }
}

export async function executeDesignAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: StudioContextPayload,
  artUrls: Record<string, string | null>,
  actions: ClientAction[]
): Promise<string> {
  switch (name) {
    case 'select_product': {
      const id = Number(args.catalog_product_id)
      if (!Number.isFinite(id)) {
        return JSON.stringify({ success: false, error: 'Invalid catalog_product_id' })
      }
      if (ctx.step !== 'browse') {
        return JSON.stringify({
          success: false,
          error: 'Product selection only from the Products step — navigate to browse first.',
        })
      }
      if (!ctx.catalogProducts.some((p) => p.id === id)) {
        return JSON.stringify({
          success: false,
          error: `Product id ${id} not in current catalog list.`,
        })
      }
      actions.push({ type: 'SELECT_PRODUCT', catalogProductId: id })
      return JSON.stringify({ success: true, selected_catalog_product_id: id })
    }
    case 'select_variant': {
      const vid = Number(args.catalog_variant_id)
      if (!Number.isFinite(vid)) {
        return JSON.stringify({ success: false, error: 'Invalid catalog_variant_id' })
      }
      if (!ctx.selectedProductId) {
        return JSON.stringify({ success: false, error: 'Select a product first' })
      }
      if (ctx.step !== 'configure') {
        return JSON.stringify({
          success: false,
          error: 'Variant selection works on the Size & color step — navigate to configure.',
        })
      }
      if (!ctx.currentProductVariants.some((v) => v.id === vid)) {
        return JSON.stringify({ success: false, error: `Variant ${vid} not available for this product.` })
      }
      actions.push({ type: 'SELECT_VARIANT', catalogVariantId: vid })
      return JSON.stringify({ success: true, selected_variant_id: vid })
    }
    case 'get_studio_status':
      return JSON.stringify(ctx, null, 2)
    case 'start_mockups': {
      if (!ctx.selectedProductId || ctx.selectedVariantId == null) {
        return JSON.stringify({ success: false, error: 'Need product and variant first' })
      }
      if (!ctx.allPlacementsReady) {
        return JSON.stringify({ success: false, error: 'Add art to all print areas first' })
      }
      actions.push({ type: 'START_MOCKUPS' })
      return JSON.stringify({ success: true, message: 'Mockup task will start in the app.' })
    }
    case 'prepare_checkout': {
      if (ctx.mockupStatus !== 'completed' || ctx.mockupCount === 0) {
        return JSON.stringify({ success: false, error: 'Complete mockups before checkout' })
      }
      if (!ctx.allPlacementsReady || ctx.selectedVariantId == null) {
        return JSON.stringify({ success: false, error: 'Incomplete design or variant' })
      }
      actions.push({ type: 'PREPARE_CHECKOUT' })
      return JSON.stringify({ success: true, message: 'Checkout session will be prepared.' })
    }
    case 'navigate_to_step': {
      const step = String(args.step || '')
      const gate = canNavigateToStep(step, ctx)
      if (!gate.ok) return JSON.stringify({ success: false, error: gate.reason })
      actions.push({ type: 'SET_STEP', step })
      return JSON.stringify({ success: true, navigated_to: step })
    }
    case 'set_active_placement': {
      const pid = String(args.placement_id || '')
      if (!ctx.placements.some((p) => p.id === pid)) {
        return JSON.stringify({
          success: false,
          error: `Unknown placement "${pid}". Valid: ${ctx.placements.map((p) => p.id).join(', ')}`,
        })
      }
      actions.push({ type: 'SET_ACTIVE_PLACEMENT', placementId: pid })
      return JSON.stringify({ success: true, active_placement: pid })
    }
    case 'generate_design': {
      const prompt = String(args.prompt || '').trim()
      if (!prompt) return JSON.stringify({ success: false, error: 'Missing prompt' })
      if (!ctx.selectedProductId) {
        return JSON.stringify({ success: false, error: 'Select a product before generating' })
      }
      const placementId = resolvePlacementId(
        args.placement_id ? String(args.placement_id) : undefined,
        ctx.activePlacementId,
        ctx.placements
      )
      if (!placementId) {
        return JSON.stringify({ success: false, error: 'No print placements available' })
      }
      try {
        const { imageUrl } = await generateImageDalle3(prompt)
        const { fileId } = await registerPrintfulFileFromUrl(
          imageUrl,
          `agent-${placementId}-${Date.now()}.png`
        )
        actions.push({
          type: 'SET_PLACEMENT_ART',
          placementId,
          imageUrl,
          printfulFileId: fileId,
          source: 'ai',
        })
        return JSON.stringify({
          success: true,
          placement_id: placementId,
          message: 'Generated and linked to Printful.',
        })
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : 'Generation failed',
        })
      }
    }
    case 'edit_design': {
      const instructions = String(args.instructions || '').trim()
      if (!instructions) return JSON.stringify({ success: false, error: 'Missing instructions' })
      const placementId = resolvePlacementId(
        args.placement_id ? String(args.placement_id) : undefined,
        ctx.activePlacementId,
        ctx.placements
      )
      if (!placementId) {
        return JSON.stringify({ success: false, error: 'No placement to edit' })
      }
      const art = ctx.artByPlacement[placementId]
      if (!art?.hasImage) {
        return JSON.stringify({
          success: false,
          error: `No artwork on "${placementId}" yet — generate or upload first.`,
        })
      }
      const imageUrl = artUrls[placementId]
      if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
        return JSON.stringify({
          success: false,
          error: 'No image URL on file for this placement — add art in the UI then retry.',
        })
      }
      try {
        const { imageUrl: out } = await editImageDalle2(imageUrl, instructions)
        const { fileId } = await registerPrintfulFileFromUrl(
          out,
          `agent-edit-${placementId}-${Date.now()}.png`
        )
        actions.push({
          type: 'SET_PLACEMENT_ART',
          placementId,
          imageUrl: out,
          printfulFileId: fileId,
          source: 'ai',
        })
        return JSON.stringify({
          success: true,
          placement_id: placementId,
          message: 'Edited and new file registered with Printful.',
        })
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : 'Edit failed',
        })
      }
    }
    default:
      return JSON.stringify({ success: false, error: `Unknown tool ${name}` })
  }
}
