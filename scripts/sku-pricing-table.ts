/**
 * Print markdown table: curated SKUs × Printful base, estimate total, retail, margin.
 * Usage: PRINTFUL_API_KEY=... npx tsx scripts/sku-pricing-table.ts
 */
import { getCuratedPrintfulProductIds } from '../api/_lib/offerings'
import { printfulServer, extractPrintfulEstimateTotal } from '../api/_lib/printful'
import { inferPricingCategory, priceQuote, type ProductCategoryHint } from '../api/_lib/pricing'

function hintFromProduct(p: {
  type: string
  type_name: string
  title: string
  model?: string
}): ProductCategoryHint {
  const d = `${p.type} ${p.type_name} ${p.title} ${p.model || ''}`.toLowerCase()
  if (d.includes('mug') || d.includes('cup')) return 'drinkware'
  if (d.includes('hat') || d.includes('cap') || d.includes('beanie')) return 'accessory'
  if (d.includes('poster') || d.includes('canvas')) return 'poster'
  return 'apparel'
}

const US_RECIPIENT = {
  name: 'Estimate Customer',
  address1: '123 Main St',
  city: 'Austin',
  state_code: 'TX',
  country_code: 'US',
  zip: '78701',
}

async function main() {
  if (!printfulServer.isConfigured()) {
    console.error('Set PRINTFUL_API_KEY')
    process.exit(1)
  }

  const ids = getCuratedPrintfulProductIds()
  const lines: string[] = []
  lines.push('| SKU group | ProductId | Variant | Printful base | Est total COGS | Retail | Margin % | Rounding |')
  lines.push('|---:|---:|---|---:|---:|---:|---:|---|')

  for (const pid of ids) {
    await new Promise((r) => setTimeout(r, 700))
    const [product, variants] = await Promise.all([
      printfulServer.getProduct(pid),
      printfulServer.getVariants(pid),
    ])
    const v = variants[0]
    if (!v) continue

    const base = parseFloat(String(v.price)) || 0
    const hint = hintFromProduct(product as any)
    const pcat = inferPricingCategory(hint, product.title, product.type_name)

    let estTotal = base
    try {
      const est = await printfulServer.estimateOrderCosts({
        recipient: US_RECIPIENT,
        items: [{ variant_id: v.id, quantity: 1 }],
      })
      const t = extractPrintfulEstimateTotal(est.raw)
      if (Number.isFinite(t)) estTotal = t
      await new Promise((r) => setTimeout(r, 700))
    } catch (e) {
      console.warn(`estimate failed for product ${pid}`, (e as Error).message)
    }

    const q = priceQuote({ printfulTotalCost: estTotal, category: pcat })
    const marginPct = (q.grossMargin * 100).toFixed(1)
    const rounding = pcat === 'mug' || pcat === 'poster' ? '.95' : '.99'

    lines.push(
      `| ${product.title.slice(0, 28)} | ${pid} | ${v.id} | $${base.toFixed(2)} | $${estTotal.toFixed(2)} | $${q.retailTotal.toFixed(2)} | ${marginPct}% | ends ${rounding} |`
    )
  }

  console.log(lines.join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
