/**
 * Structured inputs for apparel print graphics → single T2I prompt (DALL·E / Nano Banana style APIs).
 */

export const MAX_IMAGE_PROMPT_LENGTH = 4000

export type ImagePromptParts = {
  subject: string
  styleKey: string
  colorThemeKey: string
  moodKey: string
  compositionKey: string
  extraDetails: string
  avoid: string
}

export const STYLE_OPTIONS: { id: string; label: string; fragment: string }[] = [
  { id: 'flat_vector', label: 'Flat vector / print-ready', fragment: 'flat vector illustration, clean shapes, bold outlines, print-ready graphic' },
  { id: 'minimal_line', label: 'Minimal line art', fragment: 'minimal line art, single-weight strokes, simple iconic design' },
  { id: 'vintage', label: 'Vintage / retro', fragment: 'vintage screen-print aesthetic, slightly distressed texture, retro color treatment' },
  { id: 'bold_type', label: 'Bold typography', fragment: 'bold typographic design, strong lettering as the focal element' },
  { id: 'watercolor', label: 'Watercolor / painterly', fragment: 'soft watercolor illustration, painterly edges, artistic texture' },
  { id: 'photo_product', label: 'Photorealistic product-style', fragment: 'photorealistic product-style render, studio lighting, high detail' },
  { id: 'geometric', label: 'Geometric / abstract', fragment: 'geometric abstract composition, modern graphic patterns' },
]

export const COLOR_THEME_OPTIONS: { id: string; label: string; fragment: string }[] = [
  { id: 'vibrant', label: 'Vibrant', fragment: 'vibrant saturated colors, high contrast' },
  { id: 'pastel', label: 'Pastel', fragment: 'soft pastel color palette' },
  { id: 'monochrome', label: 'Monochrome', fragment: 'monochrome or limited two-tone palette' },
  { id: 'earth', label: 'Earth tones', fragment: 'earth tones, natural muted colors' },
  { id: 'neon', label: 'Neon / electric', fragment: 'neon and electric accent colors on dark-friendly background' },
  { id: 'custom', label: 'Custom (describe in details)', fragment: '' },
]

export const MOOD_OPTIONS: { id: string; label: string; fragment: string }[] = [
  { id: 'playful', label: 'Playful', fragment: 'playful, energetic mood' },
  { id: 'serious', label: 'Serious', fragment: 'serious, refined mood' },
  { id: 'elegant', label: 'Elegant', fragment: 'elegant, sophisticated mood' },
  { id: 'edgy', label: 'Edgy', fragment: 'edgy, bold attitude' },
  { id: 'calm', label: 'Calm', fragment: 'calm, peaceful atmosphere' },
  { id: 'custom_mood', label: 'Custom (details)', fragment: '' },
]

export const COMPOSITION_OPTIONS: { id: string; label: string; fragment: string }[] = [
  { id: 'centered_badge', label: 'Centered badge / emblem', fragment: 'centered emblem or badge layout, clear focal point, comfortable margins from edges' },
  { id: 'full_bleed', label: 'Full-bleed pattern', fragment: 'full-bleed repeating or all-over pattern suitable for apparel' },
  { id: 'corner', label: 'Corner / asymmetric accent', fragment: 'asymmetric corner accent composition with negative space' },
  { id: 'horizontal_banner', label: 'Horizontal banner', fragment: 'wide horizontal band composition across the chest area' },
  { id: 'custom_comp', label: 'Custom (details)', fragment: '' },
]

function fragmentFromOptions<T extends { id: string; fragment: string }>(
  options: T[],
  key: string
): string {
  const o = options.find((x) => x.id === key)
  return o?.fragment?.trim() ?? ''
}

export function buildImagePromptFromParts(
  parts: ImagePromptParts,
  context?: { placementLabel?: string }
): string {
  const subject = (parts.subject || '').trim()
  const bits: string[] = []

  if (subject) bits.push(subject)

  const style = fragmentFromOptions(STYLE_OPTIONS, parts.styleKey)
  if (style) bits.push(style)

  const color = fragmentFromOptions(COLOR_THEME_OPTIONS, parts.colorThemeKey)
  if (color) bits.push(color)

  const mood = fragmentFromOptions(MOOD_OPTIONS, parts.moodKey)
  if (mood) bits.push(mood)

  const comp = fragmentFromOptions(COMPOSITION_OPTIONS, parts.compositionKey)
  if (comp) bits.push(comp)

  const extra = (parts.extraDetails || '').trim()
  if (extra) bits.push(extra)

  if (context?.placementLabel?.trim()) {
    bits.push(`Designed for ${context.placementLabel.trim()} print placement on apparel`)
  }

  bits.push(
    'High resolution, crisp edges, no small illegible text, no watermark, suitable for direct-to-garment printing'
  )

  const avoid = (parts.avoid || '').trim()
  if (avoid) bits.push(`Avoid: ${avoid}`)

  let out = bits.filter(Boolean).join('. ')
  if (!subject && out.length < 20) {
    out = 'Original graphic design for apparel print. ' + out
  }

  if (out.length > MAX_IMAGE_PROMPT_LENGTH) {
    out = out.slice(0, MAX_IMAGE_PROMPT_LENGTH - 1) + '…'
  }
  return out
}

export function defaultImagePromptParts(): ImagePromptParts {
  return {
    subject: '',
    styleKey: 'flat_vector',
    colorThemeKey: 'vibrant',
    moodKey: 'playful',
    compositionKey: 'centered_badge',
    extraDetails: '',
    avoid: '',
  }
}
