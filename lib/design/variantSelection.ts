/**
 * Derive unique sizes and colors from Printful catalog variants for studio UI.
 */

export type CatalogVariantLite = {
  id: number
  name: string
  size: string
  color: string
  colorCode: string
  image?: string
}

export function parseSizeFromVariantName(name: string): string {
  const m = name.match(/\b(XXS|XS|S|M|L|XL|2XL|3XL|4XL|2X|3X)\b/i)
  if (!m) return 'M'
  const s = m[1].toUpperCase()
  if (s === '2X') return '2XL'
  if (s === '3X') return '3XL'
  return s
}

export function effectiveSize(v: CatalogVariantLite): string {
  const s = (v.size || '').trim()
  if (s) return normalizeSizeToken(s)
  return parseSizeFromVariantName(v.name)
}

function normalizeSizeToken(s: string): string {
  const u = s.toUpperCase()
  if (u === '2X') return '2XL'
  if (u === '3X') return '3XL'
  return u
}

export function colorKey(color: string): string {
  return color.trim().toLowerCase()
}

export function uniqueSizes(variants: CatalogVariantLite[]): string[] {
  const set = new Set<string>()
  for (const v of variants) {
    set.add(effectiveSize(v))
  }
  return [...set].sort(compareSizes)
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']

function compareSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a)
  const ib = SIZE_ORDER.indexOf(b)
  if (ia >= 0 && ib >= 0) return ia - ib
  if (ia >= 0) return -1
  if (ib >= 0) return 1
  return a.localeCompare(b)
}

export type ColorOption = {
  key: string
  label: string
  colorCode: string
  sampleImage: string
}

export function colorsForSize(variants: CatalogVariantLite[], size: string): ColorOption[] {
  const map = new Map<string, ColorOption>()
  for (const v of variants) {
    if (effectiveSize(v) !== size) continue
    const key = colorKey(v.color || v.name)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: (v.color || v.name || 'Color').trim(),
        colorCode: (v.colorCode || '').trim(),
        sampleImage: (v.image || '').trim(),
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export function resolveVariantId(
  variants: CatalogVariantLite[],
  size: string,
  colorKeyVal: string
): number | null {
  for (const v of variants) {
    if (effectiveSize(v) !== size) continue
    if (colorKey(v.color || v.name) === colorKeyVal) return v.id
  }
  return null
}
