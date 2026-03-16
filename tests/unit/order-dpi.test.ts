import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  computeDpiFromDimensions,
  meetsMinDpi
} from '../../src/lib/order-dpi'

describe('roundCurrency', () => {
  it('rounds to two decimal places', () => {
    expect(roundCurrency(10.999)).toBe(11)
    expect(roundCurrency(10.994)).toBe(10.99)
    expect(roundCurrency(5.99 + 5.99)).toBe(11.98)
  })

  it('handles order total with shipping', () => {
    const subtotal = 24.99 + 2
    const shipping = 5.99
    expect(roundCurrency(subtotal + shipping)).toBe(32.98)
  })
})

describe('computeDpiFromDimensions', () => {
  it('computes DPI from pixel and inch dimensions', () => {
    const widthPx = 2400
    const heightPx = 3000
    const widthInches = 8
    const heightInches = 10
    expect(computeDpiFromDimensions(widthPx, heightPx, widthInches, heightInches)).toBe(300)
  })

  it('uses minimum of width/height DPI', () => {
    expect(computeDpiFromDimensions(1500, 3000, 5, 10)).toBe(300)
    expect(computeDpiFromDimensions(3000, 1500, 10, 5)).toBe(300)
  })

  it('returns 0 when inches are zero', () => {
    expect(computeDpiFromDimensions(100, 100, 0, 10)).toBe(0)
  })
})

describe('meetsMinDpi', () => {
  it('returns true when computed DPI >= minDpi', () => {
    expect(meetsMinDpi(2400, 3000, 8, 10, 300)).toBe(true)
    expect(meetsMinDpi(2400, 3000, 8, 10, 150)).toBe(true)
  })

  it('returns false when computed DPI < minDpi', () => {
    expect(meetsMinDpi(800, 1000, 8, 10, 300)).toBe(false)
  })
})
