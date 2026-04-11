/**
 * Resolve Printful catalog product IDs for the curated launch set.
 * Usage: PRINTFUL_API_KEY=... npm run printful-resolve-launch
 */
import { printfulGet } from '../lib/printful/client'
import { getCuratedCatalogProductIds } from '../lib/offerings'

async function main() {
  if (!process.env.PRINTFUL_API_KEY?.trim()) {
    console.error('Missing PRINTFUL_API_KEY')
    process.exit(1)
  }

  const ids = getCuratedCatalogProductIds()
  console.log('Curated IDs:', ids.join(', ') || '(fallback: all active from products.config)')

  for (const id of ids) {
    const res = await printfulGet<{ id?: number; name?: string; title?: string }>(
      `/catalog-products/${id}`
    )
    if (!res.success) {
      console.log(`  ${id}: ERROR — ${res.error}`)
      continue
    }
    const d = res.data as { name?: string; title?: string; id?: number }
    const name = d?.name ?? d?.title ?? '?'
    console.log(`  ${id}: ${name}`)
  }

  console.log('\nSuggested env line:')
  console.log(`PRINTFUL_CURATED_PRODUCT_IDS=${ids.join(',')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
