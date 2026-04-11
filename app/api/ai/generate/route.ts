import { NextRequest, NextResponse } from 'next/server'
import { generateImageStudio } from '@/lib/ai/designAgentCore'
import { validateImageUrlForPlacement } from '@/lib/design/validateArt'
import {
  buildImagePromptFromParts,
  defaultImagePromptParts,
  MAX_IMAGE_PROMPT_LENGTH,
  type ImagePromptParts,
} from '@/lib/ai/imagePromptParts'
import { getProductConfig } from '@/lib/config/products.config'

export const dynamic = 'force-dynamic'

const OPTION_KEYS = [
  'styleKey',
  'colorThemeKey',
  'moodKey',
  'compositionKey',
] as const

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function clampField(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return t.slice(0, max)
}

function parsePromptParts(raw: unknown): ImagePromptParts | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const subject = typeof o.subject === 'string' ? o.subject : ''
  const extraDetails = typeof o.extraDetails === 'string' ? o.extraDetails : ''
  const avoid = typeof o.avoid === 'string' ? o.avoid : ''
  const def = defaultImagePromptParts()
  const pick = (key: string, fallback: string) =>
    typeof o[key] === 'string' && (o[key] as string).trim() ? (o[key] as string).trim() : fallback

  return {
    subject: clampField(subject, 2000),
    styleKey: pick('styleKey', def.styleKey),
    colorThemeKey: pick('colorThemeKey', def.colorThemeKey),
    moodKey: pick('moodKey', def.moodKey),
    compositionKey: pick('compositionKey', def.compositionKey),
    extraDetails: clampField(extraDetails, 1500),
    avoid: clampField(avoid, 500),
  }
}

function partsLookPresent(parts: ImagePromptParts): boolean {
  if (parts.subject.trim()) return true
  return OPTION_KEYS.some((k) => parts[k] !== defaultImagePromptParts()[k])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const customOnly = body.imageGenCustomOnly === true
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const parsedParts = parsePromptParts(body.promptParts)

    let prompt = ''
    if (customOnly) {
      prompt = rawPrompt
    } else if (parsedParts && partsLookPresent(parsedParts)) {
      const catalogProductId = body.catalogProductId != null ? Number(body.catalogProductId) : NaN
      const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''
      let placementLabel: string | undefined
      if (Number.isFinite(catalogProductId) && placementId) {
        const cfg = getProductConfig(catalogProductId)
        placementLabel = cfg?.placements.find((p) => p.id === placementId)?.displayName
      }
      prompt = buildImagePromptFromParts(parsedParts, { placementLabel })
    } else if (isNonEmptyString(rawPrompt)) {
      prompt = rawPrompt
    }

    if (!prompt || prompt.length > MAX_IMAGE_PROMPT_LENGTH) {
      return NextResponse.json({ success: false, error: 'Invalid prompt' }, { status: 400 })
    }

    const catalogProductId = body.catalogProductId != null ? Number(body.catalogProductId) : NaN
    const placementId = typeof body.placementId === 'string' ? body.placementId.trim() : ''

    const { imageUrl, revisedPrompt } = await generateImageStudio(prompt)

    if (Number.isFinite(catalogProductId) && placementId) {
      const v = await validateImageUrlForPlacement(imageUrl, catalogProductId, placementId)
      if (!v.ok) {
        return NextResponse.json(
          {
            success: false,
            error: v.error,
            imageUrl,
            needsRevision: true,
          },
          { status: 422 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    console.error('AI generate:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
