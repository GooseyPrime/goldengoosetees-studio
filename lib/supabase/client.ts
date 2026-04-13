'use client'

import { createBrowserClient } from '@supabase/ssr'
import { isLikelySupabaseProjectUrl, supabaseUrlMisconfigurationMessage } from '@/lib/supabase/url'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  if (!isLikelySupabaseProjectUrl(url)) {
    throw new Error(supabaseUrlMisconfigurationMessage(url))
  }
  return createBrowserClient(url, key)
}
