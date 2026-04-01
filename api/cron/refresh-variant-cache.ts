import type { VercelRequest, VercelResponse } from '@vercel/node'
import { printfulServer } from '../_lib/printful'
import { getSupabaseAdmin } from '../_lib/supabase-server'
import { getCuratedPrintfulProductIds } from '../_lib/offerings'

/**
 * Refresh printful_variant_price_cache for curated products.
 * Secure with CRON_SECRET (Authorization: Bearer <CRON_SECRET>) or Vercel cron header.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization
  const vercelCron = req.headers['x-vercel-cron']

  const okSecret = secret && auth === `Bearer ${secret}`
  const okVercel = vercelCron === '1'

  if (!okSecret && !okVercel) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    res.status(500).json({ error: 'Supabase admin not configured' })
    return
  }

  if (!printfulServer.isConfigured()) {
    res.status(503).json({ error: 'Printful not configured' })
    return
  }

  const productIds = getCuratedPrintfulProductIds()
  const rows: Array<{
    variant_id: number
    product_id: number
    currency: string
    printful_base_price: number
    availability_status: string | null
    updated_at: string
  }> = []

  try {
    for (const pid of productIds) {
      await new Promise((r) => setTimeout(r, 600))
      const variants = await printfulServer.getVariants(pid)
      for (const v of variants) {
        const price = parseFloat(String(v.price)) || 0
        const status =
          Array.isArray(v.availability_status) && v.availability_status[0]
            ? String(v.availability_status[0].status || '')
            : null
        rows.push({
          variant_id: v.id,
          product_id: v.product_id,
          currency: 'USD',
          printful_base_price: price,
          availability_status: status,
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (rows.length === 0) {
      res.status(200).json({ ok: true, updated: 0, message: 'No variants returned' })
      return
    }

    const { error } = await admin.from('printful_variant_price_cache').upsert(rows, {
      onConflict: 'variant_id',
    })

    if (error) {
      console.error('refresh-variant-cache upsert', error)
      res.status(500).json({ error: error.message })
      return
    }

    res.status(200).json({ ok: true, updated: rows.length, products: productIds.length })
  } catch (e: any) {
    console.error('refresh-variant-cache', e)
    res.status(500).json({ error: e?.message || 'Cron failed' })
  }
}
