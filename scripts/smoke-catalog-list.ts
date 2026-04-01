/**
 * Invoke the catalog list handler like GET /api/printful/catalog/list (smoke test).
 * Loads `.env.local` when present so PRINTFUL / VITE_PRINTFUL keys apply before imports.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'

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

const { default: handler } = await import('../api/printful/catalog/list')

const state = { statusCode: 200, body: '' }
const res = {
  get statusCode() {
    return state.statusCode
  },
  set statusCode(code: number) {
    state.statusCode = code
  },
  setHeader(_name: string, _value: string) {},
  end(chunk?: string | Buffer) {
    if (chunk != null) state.body += String(chunk)
  },
} as VercelResponse

const req = { method: 'GET', query: {} } as unknown as VercelRequest

await handler(req, res)

const json = JSON.parse(state.body) as { success?: boolean; products?: unknown[]; error?: string }

if (!json.success || !Array.isArray(json.products) || json.products.length === 0) {
  console.error('Smoke failed:', json.error || state.body.slice(0, 500))
  process.exit(1)
}

console.log(`OK: catalog list returned ${json.products.length} curated products.`)
