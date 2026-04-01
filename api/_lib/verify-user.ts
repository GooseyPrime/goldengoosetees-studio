import type { VercelRequest } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export async function getUserIdFromBearer(req: VercelRequest): Promise<string | null> {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const jwt = auth.slice(7).trim()
  if (!jwt) return null

  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    console.error('verify-user: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    return null
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user) {
    return null
  }
  return data.user.id
}
