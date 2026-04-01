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
 * GET /api/admin/designs/list
 * Returns designs pending approval: is_public === true and catalog_section is null.
 * Requires admin auth.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAdmin(req)

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Supabase not configured' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('designs')
      .select('*')
      .eq('is_public', true)
      .is('catalog_section', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    const designs = (data || []).map((row: Record<string, unknown>) => designRowToDesign(row))

    res.status(200).json({ designs })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    const statusCode = err.statusCode || 500
    const message = err.message || 'Failed to list pending designs'
    res.status(statusCode).json({ error: message })
  }
}


