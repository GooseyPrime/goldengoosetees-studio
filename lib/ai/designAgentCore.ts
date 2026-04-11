import OpenAI from 'openai'
import { printfulPost } from '@/lib/printful/client'
import {
  editImageNanoBanana,
  generateImageNanoBanana,
  isNanoBananaConfigured,
  shouldFallbackFromNanoBananaError,
} from '@/lib/ai/nanoBananaClient'
import { validateImageUrlForPlacement } from '@/lib/design/validateArt'

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

async function generateImageOpenAI(prompt: string): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('Configure NANO_BANANA_API_* or OPENAI_API_KEY for image generation')
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

export async function generateImageStudio(
  prompt: string,
  options?: { aspectRatio?: string; resolution?: string }
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  if (isNanoBananaConfigured()) {
    try {
      const { imageUrl } = await generateImageNanoBanana(prompt, options)
      return { imageUrl }
    } catch (e) {
      if (shouldFallbackFromNanoBananaError(e) && process.env.OPENAI_API_KEY?.trim()) {
        console.warn('[generateImageStudio] Nano Banana failed; falling back to OpenAI:', e)
        return generateImageOpenAI(prompt)
      }
      throw e
    }
  }
  return generateImageOpenAI(prompt)
}

export async function editImageStudio(imageUrl: string, prompt: string): Promise<{ imageUrl: string }> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Could not fetch source image for edit')
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length > 12 * 1024 * 1024) throw new Error('Image too large for edit (max 12MB)')
  const mime = imgRes.headers.get('content-type') || 'image/png'

  if (isNanoBananaConfigured()) {
    try {
      const b64 = buf.toString('base64')
      return await editImageNanoBanana(prompt, b64, mime)
    } catch (e) {
      if (shouldFallbackFromNanoBananaError(e) && process.env.OPENAI_API_KEY?.trim()) {
        console.warn('[editImageStudio] Nano Banana failed; falling back to OpenAI:', e)
        // fall through to DALL·E below
      } else {
        throw e
      }
    }
  }

  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('Configure NANO_BANANA_API_* or OPENAI_API_KEY for image editing')
  if (buf.length > 4 * 1024 * 1024) throw new Error('Image too large for DALL·E edit (max 4MB)')
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
  /** All placement ids supported for this product (from Printful + local config) */
  resolvedPlacementIds: string[]
  /** Subset the customer is printing on */
  selectedPlacementIds: string[]
  selectedSize: string | null
  selectedColorKey: string | null
  availableSizes: string[]
  availableColorOptions: Array<{ key: string; label: string }>
  placementSpecs: Record<string, { targetPx: number; widthIn: number; heightIn: number; dpi: number }>
  placements: Array<{ id: string; displayName: string }>
  activePlacementId: string | null
  artByPlacement: Record<
    string,
    { hasImage: boolean; hasPrintfulFile: boolean; source: 'ai' | 'upload' | null }
  >
  /** True when every selected placement has a Printful file */
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
        'Select the exact Printful catalog_variant_id when you know the id. Prefer set_size + set_color when helping the customer choose.',
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
      name: 'set_size',
      description:
        'Set garment size on the Size & color step (e.g. M, L, 2XL). Must match an entry in context.available_sizes.',
      parameters: {
        type: 'object',
        properties: { size: { type: 'string' } },
        required: ['size'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_color',
      description:
        'Set garment color using the color key from context.available_color_options (after size is chosen).',
      parameters: {
        type: 'object',
        properties: { color_key: { type: 'string' } },
        required: ['color_key'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_print_locations',
      description:
        'Choose which print areas the order uses (subset of context.resolved_placement_ids). Always include default placements the customer wants.',
      parameters: {
        type: 'object',
        properties: {
          placement_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Print placement ids e.g. front, back, sleeve_left',
          },
        },
        required: ['placement_ids'],
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
        'Generate a new image (Nano Banana / configured image API) and register it with Printful for a print placement. Requires product selected.',
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
        'Submit the current designs to Printful to generate product mockups. Requires art on every selected print area and a variant selected.',
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
        'Edit existing placement artwork (image-to-image via configured API). Requires image already on that placement.',
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
  | { type: 'SET_SIZE'; size: string }
  | { type: 'SET_COLOR'; colorKey: string }
  | { type: 'SET_PRINT_LOCATIONS'; placementIds: string[] }
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
        reason: 'Need product, variant, and art on every selected print area (or an active mockup task)',
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
      if (!ctx.currentProductVariants.some((v) => v.id === vid)) {
        return JSON.stringify({ success: false, error: `Variant ${vid} not available for this product.` })
      }
      actions.push({ type: 'SELECT_VARIANT', catalogVariantId: vid })
      return JSON.stringify({ success: true, selected_variant_id: vid })
    }
    case 'set_size': {
      const size = String(args.size || '').trim().toUpperCase()
      if (!size) return JSON.stringify({ success: false, error: 'Missing size' })
      if (!ctx.selectedProductId) {
        return JSON.stringify({ success: false, error: 'Select a product first' })
      }
      if (!ctx.availableSizes.map((s) => s.toUpperCase()).includes(size)) {
        return JSON.stringify({
          success: false,
          error: `Size "${size}" not available. Options: ${ctx.availableSizes.join(', ')}`,
        })
      }
      actions.push({ type: 'SET_SIZE', size })
      return JSON.stringify({ success: true, size })
    }
    case 'set_color': {
      const colorKey = String(args.color_key || '').trim().toLowerCase()
      if (!colorKey) return JSON.stringify({ success: false, error: 'Missing color_key' })
      if (!ctx.selectedProductId) {
        return JSON.stringify({ success: false, error: 'Select a product first' })
      }
      if (!ctx.selectedSize) {
        return JSON.stringify({ success: false, error: 'Pick a size first' })
      }
      if (!ctx.availableColorOptions.some((c) => c.key === colorKey)) {
        return JSON.stringify({
          success: false,
          error: `Unknown color key. Valid: ${ctx.availableColorOptions.map((c) => c.key).join(', ')}`,
        })
      }
      actions.push({ type: 'SET_COLOR', colorKey })
      return JSON.stringify({ success: true, color_key: colorKey })
    }
    case 'set_print_locations': {
      const raw = args.placement_ids
      if (!Array.isArray(raw) || raw.length === 0) {
        return JSON.stringify({ success: false, error: 'placement_ids must be a non-empty array' })
      }
      const ids = raw.map((x) => String(x).trim()).filter(Boolean)
      const allowed = new Set(ctx.resolvedPlacementIds)
      for (const id of ids) {
        if (!allowed.has(id)) {
          return JSON.stringify({
            success: false,
            error: `Invalid placement "${id}". Valid: ${ctx.resolvedPlacementIds.join(', ')}`,
          })
        }
      }
      actions.push({ type: 'SET_PRINT_LOCATIONS', placementIds: ids })
      return JSON.stringify({ success: true, placement_ids: ids })
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
        const { imageUrl } = await generateImageStudio(prompt)
        if (ctx.selectedProductId) {
          const v = await validateImageUrlForPlacement(imageUrl, ctx.selectedProductId, placementId)
          if (!v.ok) {
            return JSON.stringify({
              success: false,
              error: v.error,
              hint: 'Ask the user to adjust the prompt for higher resolution or simpler layout, then retry.',
            })
          }
        }
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
        const { imageUrl: out } = await editImageStudio(imageUrl, instructions)
        if (ctx.selectedProductId) {
          const v = await validateImageUrlForPlacement(out, ctx.selectedProductId, placementId)
          if (!v.ok) {
            return JSON.stringify({
              success: false,
              error: v.error,
              hint: 'Suggest uploading a larger source or changing the edit instructions.',
            })
          }
        }
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
