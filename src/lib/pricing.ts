/**
 * Client types for pricing v2 (quote + server orders).
 */

export type PricingQuoteResponse = {
  quoteId: string
  expiresAt: string
  variantId: number
  printfulCosts: Record<string, string>
  retailTotal: number
  printfulTotalCost: number
  breakdown: {
    stripeFeeEst: number
    refundBufferEst: number
    profitTarget: number
    profitEst: number
    grossMargin: number
  }
  pricingVersion: string
  quoteInputHash: string
}

export type CreateOrderV2Response = {
  orderId: string
  totalAmount: number
  pricingQuoteId: string
}
