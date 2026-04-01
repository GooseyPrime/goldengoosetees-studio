import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  priceQuote,
  psychologicalRetail,
  computeQuoteInputHash,
  round2,
  inferPricingCategory,
  PRICING_VERSION,
} from '../../api/_lib/pricing'

describe('pricing', () => {
  const prev: Record<string, string | undefined> = {}

  beforeEach(() => {
    ;[
      'PRICING_STRIPE_FEE_PCT',
      'PRICING_STRIPE_FEE_FIXED',
      'PRICING_REFUND_BUFFER_PCT',
      'PRICING_MARGIN_FLOOR',
      'PRICING_PROFIT_TEE_USD',
    ].forEach((k) => {
      prev[k] = process.env[k]
      delete process.env[k]
    })
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('psychologicalRetail ends in .99 for tee', () => {
    expect(psychologicalRetail(18.2, 'tee')).toBe(18.99)
    expect(psychologicalRetail(19.99, 'tee')).toBe(19.99)
  })

  it('psychologicalRetail ends in .95 for mug', () => {
    expect(psychologicalRetail(14.1, 'mug')).toBe(14.95)
  })

  it('priceQuote sets pricingVersion', () => {
    const q = priceQuote({ printfulTotalCost: 12.5, category: 'tee' })
    expect(q.pricingVersion).toBe(PRICING_VERSION)
  })

  it('computeQuoteInputHash is stable for key order', () => {
    expect(computeQuoteInputHash({ b: 1, a: 2 })).toBe(computeQuoteInputHash({ a: 2, b: 1 }))
  })

  it('priceQuote retail is >= raw solved value (after psych rounding)', () => {
    const q = priceQuote({ printfulTotalCost: 20, category: 'tee' })
    expect(q.retailTotal).toBeGreaterThanOrEqual(round2(q.rawRetailBeforeRound) - 0.02)
  })

  it('inferPricingCategory detects hoodie from title', () => {
    expect(inferPricingCategory('apparel', 'Unisex Hoodie', 'hoodie')).toBe('hoodie_sweat')
    expect(inferPricingCategory('apparel', 'Basic Tee', 'tshirt')).toBe('tee')
  })
})
