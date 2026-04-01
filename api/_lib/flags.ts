/**
 * Feature flags (env). Opt-in: set to "true" to enable.
 * @see Printful_Pricing_GoldenGooseTees.md rollout section
 */
export function isPricingV2Enabled(): boolean {
  return process.env.PRICING_V2_ENABLED === 'true'
}

export function isServerFulfillmentEnabled(): boolean {
  return process.env.SERVER_FULFILLMENT_ENABLED === 'true'
}

export function isDynamicShippingEnabled(): boolean {
  return process.env.DYNAMIC_SHIPPING_ENABLED !== 'false'
}
