/**
 * Resolve Printful catalog product rows that match the launch spec (keyword table).
 * Uses one GET /products call (no per-product variant fanout).
 *
 * Usage:
 *   PRINTFUL_API_KEY=... npx tsx scripts/printful-resolve-launch-products.ts
 *
 * If `.env.local` exists, unset keys are loaded from it (PRINTFUL_API_KEY / VITE_PRINTFUL_API_KEY).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function tryLoadEnvLocal(): void {
  const path = join(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

tryLoadEnvLocal()

const { printfulServer } = await import('../api/_lib/printful')
type PrintfulProduct = import('../api/_lib/printful').PrintfulProduct

type SpecRow = {
  label: string
  /** All tokens must appear somewhere in the haystack (after normalization). */
  mustInclude: string[]
  /** If any token appears, the product is excluded. */
  excludeIfIncludes?: string[]
}

/** Order matches spec: apparel → headwear → drinkware → wall art. */
const SPEC_ROWS: SpecRow[] = [
  {
    label: 'Bella+Canvas 3001 (staple tee)',
    mustInclude: ['3001', 'bella'],
  },
  {
    label: 'Gildan 64000 (value tee)',
    mustInclude: ['64000'],
    excludeIfIncludes: ['5000'],
  },
  {
    label: 'Crewneck sweatshirt',
    mustInclude: ['crew'],
    excludeIfIncludes: ['hoodie', 'hood'],
  },
  {
    label: 'Hoodie',
    mustInclude: ['hoodie'],
  },
  {
    label: 'Dad cap (embroidered)',
    mustInclude: ['dad'],
  },
  {
    label: 'Trucker cap',
    mustInclude: ['trucker'],
  },
  {
    label: 'Beanie (embroidered)',
    mustInclude: ['beanie'],
  },
  {
    label: '11 oz mug',
    mustInclude: ['mug', 'ceramic'],
    excludeIfIncludes: ['enamel', 'travel', 'insulated'],
  },
  {
    label: 'Unframed poster',
    mustInclude: ['poster'],
    excludeIfIncludes: ['framed', 'canvas'],
  },
]

function haystack(p: PrintfulProduct): string {
  return [p.title, p.type, p.type_name, p.model, p.brand || '']
    .join(' ')
    .toLowerCase()
}

function matchesRow(p: PrintfulProduct, row: SpecRow): boolean {
  const h = haystack(p)
  if (!row.mustInclude.every((t) => h.includes(t.toLowerCase()))) return false
  if (row.excludeIfIncludes?.some((t) => h.includes(t.toLowerCase()))) return false
  return true
}

function pickBest(products: PrintfulProduct[], row: SpecRow): PrintfulProduct | undefined {
  const hits = products.filter((p) => !p.is_discontinued && matchesRow(p, row))
  if (hits.length === 0) return undefined
  // Prefer exact model hints when multiple hits (e.g. several “crew” products).
  hits.sort((a, b) => a.id - b.id)
  return hits[0]
}

function pad(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w - 1) + '…' : s + ' '.repeat(w - s.length)
}

async function main(): Promise<void> {
  tryLoadEnvLocal()

  if (!printfulServer.isConfigured()) {
    console.error('Set PRINTFUL_API_KEY (or VITE_PRINTFUL_API_KEY) or add it to .env.local')
    process.exit(1)
  }

  const products = await printfulServer.getProducts()
  console.log(`Loaded ${products.length} catalog products.\n`)

  const chosen: Array<{ row: SpecRow; product?: PrintfulProduct }> = []
  for (const row of SPEC_ROWS) {
    chosen.push({ row, product: pickBest(products, row) })
  }

  console.log(`${pad('id', 6)} ${pad('type_name', 22)} title`)
  console.log(`${'-'.repeat(6)} ${'-'.repeat(22)} ${'-'.repeat(60)}`)
  for (const { row, product } of chosen) {
    if (!product) {
      console.log(`${pad('—', 6)} ${pad('(no match)', 22)} ${row.label}`)
      continue
    }
    console.log(
      `${pad(String(product.id), 6)} ${pad(product.type_name || '', 22)} ${product.title}`,
    )
    console.log(`       spec: ${row.label}`)
  }

  const ids = chosen
    .map(({ product }) => product?.id)
    .filter((id): id is number => id != null)

  console.log('\nSuggested env (comma-separated catalog product IDs, spec order):')
  console.log(`PRINTFUL_CURATED_PRODUCT_IDS=${ids.join(',')}`)

  const missing = chosen.filter((c) => !c.product).map((c) => c.row.label)
  if (missing.length) {
    console.log('\nNo unique/disambiguated match for:', missing.join('; '))
    console.log('Refine keywords in SPEC_ROWS or pick IDs manually from the full catalog.')
    process.exitCode = 2
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
