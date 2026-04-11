'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
      }}
      className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
