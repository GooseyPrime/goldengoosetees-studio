import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../_lib/auth'
import { createClient } from '@supabase/supabase-js'
import type { Design } from '../../../src/lib/types'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

function designRowToDesign(row: Record<string, unknown>): Design {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    productId: row.product_id as string,
    configurationId: row.configuration_id as string | undefined,
    variantSelections: row.variant_selections as Design['variantSelections'],
    size: row.size as string | undefined,
    color: row.color as string | undefined,
    files: (row.files as Design['files']) || [],
    isPublic: Boolean(row.is_public),
    isNSFW: Boolean(row.is_nsfw),
    title: (row.title as string) || 'Untitled Design',
    description: row.description as string | undefined,
    catalogSection: row.catalog_section as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

/**
 * PATCH /api/admin/designs/update
 * Body: { designId: string, catalogSection?: string, isNSFW?: boolean }
 * For approve: set catalogSection to 'sfw-graphics' or 'nsfw-graphics'.
 * For reject: set catalogSection to 'rejected' or omit to leave pending.
 * Requires admin auth.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAdmin(req)

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Supabase not configured' })
      return
    }

    const body = req.body as { designId?: string; catalogSection?: string; isNSFW?: boolean }
    const { designId, catalogSection, isNSFW } = body

    if (!designId) {
      res.status(400).json({ error: 'designId is required' })
      return
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    if (catalogSection !== undefined) updates.catalog_section = catalogSection
    if (isNSFW !== undefined) updates.is_nsfw = isNSFW

    const { data, error } = await supabaseAdmin
      .from('designs')
      .update(updates)
      .eq('id', designId)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      res.status(404).json({ error: 'Design not found' })
      return
    }

    res.status(200).json({ design: designRowToDesign(data as Record<string, unknown>) })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    const statusCode = err.statusCode || 500
    const message = err.message || 'Failed to update design'
    res.status(statusCode).json({ error: message })
  }
}
