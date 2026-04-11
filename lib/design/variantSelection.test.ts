import { describe, expect, it } from 'vitest'
import {
  colorsForSize,
  effectiveSize,
  parseSizeFromVariantName,
  resolveVariantId,
  uniqueSizes,
  type CatalogVariantLite,
} from './variantSelection'

describe('variantSelection', () => {
  const variants: CatalogVariantLite[] = [
    { id: 1, name: 'Black / M', size: 'M', color: 'Black', colorCode: '#000000' },
    { id: 2, name: 'White / M', size: 'M', color: 'White', colorCode: '#ffffff' },
    { id: 3, name: 'Black / L', size: 'L', color: 'Black', colorCode: '#000000' },
  ]

  it('uniqueSizes collects sizes', () => {
    expect(uniqueSizes(variants).sort()).toEqual(['L', 'M'])
  })

  it('colorsForSize filters by size', () => {
    const m = colorsForSize(variants, 'M')
    expect(m.map((c) => c.label).sort()).toEqual(['Black', 'White'])
  })

  it('resolveVariantId matches size and color key', () => {
    expect(resolveVariantId(variants, 'M', 'black')).toBe(1)
    expect(resolveVariantId(variants, 'L', 'black')).toBe(3)
    expect(resolveVariantId(variants, 'M', 'navy')).toBeNull()
  })

  it('parseSizeFromVariantName parses embedded size', () => {
    expect(parseSizeFromVariantName('Cool Tee / 2XL')).toBe('2XL')
    expect(parseSizeFromVariantName('Tee (5XL)')).toBe('5XL')
    expect(parseSizeFromVariantName('Youth Tee / YM')).toBe('YM')
    expect(parseSizeFromVariantName('Long name / 3X')).toBe('3XL')
  })

  it('effectiveSize uses size field when set', () => {
    expect(effectiveSize(variants[0])).toBe('M')
  })

  it('effectiveSize normalizes 5X and 6X from size field', () => {
    const v: CatalogVariantLite = {
      id: 9,
      name: 'X',
      size: '5X',
      color: 'Black',
      colorCode: '#000',
    }
    expect(effectiveSize(v)).toBe('5XL')
  })
})
