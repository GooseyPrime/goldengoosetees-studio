/**
 * Nano Banana / Nano Banana Pro–style image API (configurable gateway).
 * Set NANO_BANANA_API_BASE_URL (no trailing slash), NANO_BANANA_API_KEY, optional NANO_BANANA_MODEL.
 */

function getConfig() {
  const baseUrl =
    process.env.NANO_BANANA_API_BASE_URL?.trim() ||
    process.env.NANOBANANA_API_BASE_URL?.trim() ||
    ''
  const apiKey =
    process.env.NANO_BANANA_API_KEY?.trim() ||
    process.env.NANOBANANA_API_KEY?.trim() ||
    ''
  const model =
    process.env.NANO_BANANA_MODEL?.trim() ||
    process.env.NANOBANANA_MODEL?.trim() ||
    'nano-banana-pro'
  const generatePath = process.env.NANO_BANANA_GENERATE_PATH?.trim() || '/v1/images/generations'
  const editPath = process.env.NANO_BANANA_EDIT_PATH?.trim() || '/v1/images/edits'
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, model, generatePath, editPath }
}

export function isNanoBananaConfigured(): boolean {
  const { baseUrl, apiKey } = getConfig()
  return Boolean(baseUrl && apiKey)
}

function extractImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>

  const direct =
    typeof o.image_url === 'string'
      ? o.image_url
      : typeof o.url === 'string'
        ? o.url
        : typeof o.output_url === 'string'
          ? o.output_url
          : null
  if (direct && /^https?:\/\//i.test(direct)) return direct

  const nested = o.data
  if (nested && typeof nested === 'object') {
    const d = nested as Record<string, unknown>
    if (typeof d.url === 'string' && /^https?:\/\//i.test(d.url)) return d.url
    if (Array.isArray(d) && d[0] && typeof d[0] === 'object') {
      const first = d[0] as Record<string, unknown>
      if (typeof first.url === 'string') return first.url
      if (typeof first.image_url === 'string') return first.image_url
    }
  }

  const choices = o.choices
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>
    if (typeof c0.url === 'string') return c0.url
  }

  return null
}

async function postJson(path: string, body: Record<string, unknown>): Promise<{ imageUrl: string; raw?: unknown }> {
  const { baseUrl, apiKey } = getConfig()
  if (!baseUrl || !apiKey) {
    throw new Error('Nano Banana API is not configured (NANO_BANANA_API_BASE_URL + NANO_BANANA_API_KEY)')
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Nano Banana API returned non-JSON (${res.status})`)
  }

  if (!res.ok) {
    const errMsg =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error?: { message?: string } }).error?.message || JSON.stringify(json))
        : text.slice(0, 200)
    throw new Error(`Nano Banana API error ${res.status}: ${errMsg}`)
  }

  const imageUrl = extractImageUrl(json)
  if (!imageUrl) {
    throw new Error('Nano Banana API response did not include an image URL')
  }

  return { imageUrl, raw: json }
}

export async function generateImageNanoBanana(
  prompt: string,
  options?: { aspectRatio?: string; resolution?: string }
): Promise<{ imageUrl: string }> {
  const { model, generatePath } = getConfig()
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    ...(options?.aspectRatio ? { aspect_ratio: options.aspectRatio } : {}),
    ...(options?.resolution ? { resolution: options.resolution } : {}),
  }

  const { imageUrl } = await postJson(generatePath, body)
  return { imageUrl }
}

export async function editImageNanoBanana(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<{ imageUrl: string }> {
  const { model, editPath } = getConfig()
  const body: Record<string, unknown> = {
    model,
    prompt,
    image: imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`,
  }

  const { imageUrl } = await postJson(editPath, body)
  return { imageUrl }
}
