/**
 * Server-authoritative retail pricing from Printful COGS + fee stack.
 * @see Printful_Pricing_GoldenGooseTees.md
 */
import { createHash } from 'crypto'

export const PRICING_VERSION = 'v1.0.0'

export type PricingCategory = 'tee' | 'hoodie_sweat' | 'hat' | 'mug' | 'poster'

export type ProductCategoryHint = 'apparel' | 'drinkware' | 'accessory' | 'poster'

function envNum(name: string, fallback: number): number {
  const v = process.env[name]
  if (v == null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function getPricingParams() {
  return {
    pStripe: envNum('PRICING_STRIPE_FEE_PCT', 0.029),
    fStripe: envNum('PRICING_STRIPE_FEE_FIXED', 0.3),
    pRefundBuffer: envNum('PRICING_REFUND_BUFFER_PCT', 0.02),
    marginFloor: envNum('PRICING_MARGIN_FLOOR', 0.3),
    profitTee: envNum('PRICING_PROFIT_TEE_USD', 4),
    profitHoodie: envNum('PRICING_PROFIT_HOODIE_USD', 8),
    profitHat: envNum('PRICING_PROFIT_HAT_USD', 5),
    profitMug: envNum('PRICING_PROFIT_MUG_USD', 5),
    profitPoster: envNum('PRICING_PROFIT_POSTER_USD', 7),
  }
}

export function inferPricingCategory(
  hint: ProductCategoryHint,
  productTitle = '',
  typeName = ''
): PricingCategory {
  const blob = `${productTitle} ${typeName}`.toLowerCase()
  if (hint === 'drinkware') return 'mug'
  if (hint === 'poster') return 'poster'
  if (hint === 'accessory') return 'hat'
  if (blob.includes('hood') || blob.includes('zip') || blob.includes('sweatshirt') || blob.includes('crew')) {
    return 'hoodie_sweat'
  }
  return 'tee'
}

export function profitTargetForCategory(cat: PricingCategory): number {
  const p = getPricingParams()
  switch (cat) {
    case 'hoodie_sweat':
      return p.profitHoodie
    case 'hat':
      return p.profitHat
    case 'mug':
      return p.profitMug
    case 'poster':
      return p.profitPoster
    default:
      return p.profitTee
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Round up so retail ends in .99 (apparel/hats) or .95 (mug/poster). */
export function psychologicalRetail(amount: number, category: PricingCategory): number {
  const ending = category === 'mug' || category === 'poster' ? 0.95 : 0.99
  const base = Math.floor(amount + 1e-9)
  const withEnding = base + ending
  if (withEnding >= amount - 1e-9) return round2(withEnding)
  return round2(base + 1 + ending)
}

function stripeFeeOnRetail(R: number, pStripe: number, fStripe: number): number {
  return pStripe * R + fStripe
}

function refundBufferOnRetail(R: number, pRefund: number): number {
  return pRefund * R
}

function grossMargin(
  R: number,
  C: number,
  pStripe: number,
  fStripe: number,
  pRefund: number
): number {
  if (R <= 0) return 0
  const stripeF = stripeFeeOnRetail(R, pStripe, fStripe)
  const refB = refundBufferOnRetail(R, pRefund)
  return (R - C - stripeF - refB) / R
}

export interface PriceQuoteInput {
  printfulTotalCost: number
  category: PricingCategory
}

export interface PriceQuoteResult {
  pricingVersion: string
  printfulTotalCost: number
  category: PricingCategory
  rawRetailBeforeRound: number
  retailTotal: number
  stripeFeeEst: number
  refundBufferEst: number
  profitTarget: number
  profitEst: number
  grossMargin: number
  pStripe: number
  fStripe: number
  pRefundBuffer: number
  marginFloor: number
}

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  const sorted: Record<string, unknown> = {}
  for (const k of keys) sorted[k] = obj[k]
  return JSON.stringify(sorted)
}

export function computeQuoteInputHash(parts: Record<string, unknown>): string {
  return createHash('sha256').update(stableStringify(parts)).digest('hex')
}

/**
 * Solve R = (C + P_target + f_stripe) / (1 - p_stripe - p_refund_buffer), then margin check + psych rounding.
 */
export function priceQuote(input: PriceQuoteInput): PriceQuoteResult {
  const params = getPricingParams()
  const { pStripe, fStripe, pRefundBuffer, marginFloor } = params
  const C = Math.max(0, input.printfulTotalCost)
  let P = profitTargetForCategory(input.category)

  const denom = 1 - pStripe - pRefundBuffer
  if (denom <= 0) {
    throw new Error('Invalid pricing parameters: fee percentages sum to >= 1')
  }

  let R = (C + P + fStripe) / denom
  let margin = grossMargin(R, C, pStripe, fStripe, pRefundBuffer)
  let guard = 0
  while (margin < marginFloor && guard < 80) {
    P += 0.25
    R = (C + P + fStripe) / denom
    margin = grossMargin(R, C, pStripe, fStripe, pRefundBuffer)
    guard++
  }

  const rawRetailBeforeRound = R
  const retailTotal = psychologicalRetail(R, input.category)
  const stripeFeeEst = round2(stripeFeeOnRetail(retailTotal, pStripe, fStripe))
  const refundBufferEst = round2(refundBufferOnRetail(retailTotal, pRefundBuffer))
  const profitEst = round2(
    retailTotal - C - stripeFeeEst - refundBufferEst
  )
  const gm = grossMargin(retailTotal, C, pStripe, fStripe, pRefundBuffer)

  return {
    pricingVersion: PRICING_VERSION,
    printfulTotalCost: round2(C),
    category: input.category,
    rawRetailBeforeRound: round2(rawRetailBeforeRound),
    retailTotal: round2(retailTotal),
    stripeFeeEst,
    refundBufferEst,
    profitTarget: round2(P),
    profitEst,
    grossMargin: round2(gm),
    pStripe,
    fStripe,
    pRefundBuffer,
    marginFloor,
  }
}

/** Catalog "starting at" retail from a single-variant Printful base cost (no shipping). */
export function catalogStartingRetail(printfulBaseCost: number, category: PricingCategory): number {
  const c = Number(printfulBaseCost)
  const safe = Number.isFinite(c) && c >= 0 ? c : 19.99
  const q = priceQuote({ printfulTotalCost: safe, category })
  return q.retailTotal
}
