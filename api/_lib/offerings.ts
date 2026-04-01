/**
 * Curated Printful catalog product IDs (launch set).
 * In production, set PRINTFUL_CURATED_PRODUCT_IDS (comma-separated) in Vercel — that list
 * replaces these defaults entirely. Repo defaults are for local/preview without env.
 *
 * Order: apparel → headwear → drinkware → wall art (Printful_Pricing_GoldenGooseTees.md).
 * IDs verified via scripts/printful-resolve-launch-products.ts against Catalog API.
 */
const DEFAULT_CURATED_PRODUCT_IDS = [
  71, // Bella+Canvas 3001 — Unisex Staple T-Shirt
  12, // Gildan 64000 — Unisex Basic Softstyle (spec value tee; not Gildan 5000)
  145, // Gildan 18000 — Unisex Crew Neck Sweatshirt
  146, // Gildan 18500 — Unisex Heavy Blend Hoodie
  206, // Yupoong 6245CM — Classic Dad Hat (embroidered)
  100, // Yupoong 6006 — 5 Panel Trucker Cap
  81, // Otto Cap 82-480 — Knit Beanie (embroidered)
  19, // White Glossy Mug (11 oz ceramic)
  1, // Enhanced Matte Paper Poster (in) — unframed poster
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
