import imageSize from 'image-size'
import { getPlacementConfig } from '@/lib/config/products.config'

export type ArtValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export function validateImageBufferForPlacement(
  buf: Buffer,
  catalogProductId: number,
  placementId: string
): ArtValidationResult {
  const pc = getPlacementConfig(catalogProductId, placementId)
  if (!pc) return { ok: true }

  let w = 0
  let h = 0
  try {
    const dim = imageSize(buf)
    w = dim.width ?? 0
    h = dim.height ?? 0
  } catch {
    return { ok: false, error: 'Could not read image dimensions' }
  }

  const minSide = Math.max(300, Math.floor(pc.canvasExportPx * 0.25))
  if (w > 0 && h > 0 && Math.min(w, h) < minSide) {
    return {
      ok: false,
      error: `Image is too small for this print area. Minimum ~${minSide}px on the shorter side (got ${w}×${h}px). Target about ${pc.canvasExportPx}px for best print quality.`,
    }
  }

  return { ok: true }
}

export async function validateImageUrlForPlacement(
  imageUrl: string,
  catalogProductId: number,
  placementId: string
): Promise<ArtValidationResult> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 20000)
    const res = await fetch(imageUrl, { signal: ac.signal })
    clearTimeout(t)
    if (!res.ok) return { ok: false, error: 'Could not download image for validation' }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 12 * 1024 * 1024) {
      return { ok: false, error: 'Image is too large to validate' }
    }
    return validateImageBufferForPlacement(buf, catalogProductId, placementId)
  } catch {
    return { ok: false, error: 'Could not fetch image for validation' }
  }
}
