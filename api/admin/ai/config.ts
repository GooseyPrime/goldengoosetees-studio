import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../../_lib/auth'
import { getAppConfig, setAppConfig } from '../../../_lib/config'

const ALLOWED_KEYS = new Set([
  'conversational_provider',
  'conversational_model_id',
  'image_model_primary',
  'image_model_fallback',
  'openrouter_enabled',
  'alert_email',
  'alert_phone',
  'alert_system_errors',
  'alert_rate_limiting',
  'alert_ai_failures',
  'alert_payment_orders',
  'alert_external_services'
])

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await requireAdmin(req)
  } catch (error: any) {
    const code = error.statusCode || 401
    res.status(code).json({ error: error.message || 'Unauthorized' })
    return
  }

  if (req.method === 'GET') {
    const config = await getAppConfig()
    res.status(200).json(config)
    return
  }

  if (req.method === 'PATCH') {
    const body = req.body
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Body must be an object' })
      return
    }
    const updates: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_KEYS.has(key)) {
        updates[key] = body[key]
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No allowed keys to update' })
      return
    }
    try {
      await setAppConfig(updates)
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to save config' })
      return
    }
    const config = await getAppConfig()
    res.status(200).json(config)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
