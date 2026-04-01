/**
 * Curated Printful catalog product IDs (launch set).
 * Override with PRINTFUL_CURATED_PRODUCT_IDS="71,146,306,..."
 *
 * Defaults align with PRINTFUL_SETUP.md + spec categories:
 * 71 Bella+Canvas 3001, 146 Gildan 5000, 306 crewneck, 380 hoodie,
 * 483 11oz mug, 468 poster, 189 dad cap, 148 trucker-style cap (verify in dashboard).
 */
const DEFAULT_CURATED_PRODUCT_IDS = [
  71, 146, 306, 380, 483, 468, 189, 148,
]

export function getCuratedPrintfulProductIds(): number[] {
  const raw = process.env.PRINTFUL_CURATED_PRODUCT_IDS
  if (raw?.trim()) {
    return raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  }
  return [...DEFAULT_CURATED_PRODUCT_IDS]
}

export function isCuratedProductId(productId: number): boolean {
  return getCuratedPrintfulProductIds().includes(productId)
}
