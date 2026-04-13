'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type LookupCode = 'USE_GOOGLE' | 'USE_PASSWORD' | 'NO_ACCOUNT'

async function fetchSignInHint(email: string): Promise<LookupCode | null> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return null
  try {
    const res = await fetch('/api/auth/lookup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { success?: boolean; code?: LookupCode }
    if (data.success && data.code) return data.code
  } catch {
    /* ignore */
  }
  return null
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/studio'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function signInWithGoogle() {
    setError(null)
    setOauthLoading(true)
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (oErr) setError(oErr.message)
    } finally {
      setOauthLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signErr) {
        const hint = await fetchSignInHint(email)
        if (hint === 'USE_GOOGLE') {
          setError(
            'This email is linked to Google. Use “Continue with Google” to sign in — password sign-in is not set up for this account.'
          )
          return
        }
        if (hint === 'NO_ACCOUNT') {
          setError(`${signErr.message} If you have not created an account yet, sign up first.`)
          return
        }
        setError(signErr.message)
        return
      }
      router.push(next)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
      <h1 className="font-serif text-2xl font-semibold text-zinc-50">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">Save designs and chat history to your account.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {searchParams.get('error') === 'auth' && (
          <p className="text-sm text-red-400">Could not complete sign-in. Try again.</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-zinc-600 text-amber-500 focus:ring-amber-500/40"
            />
            Show password
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900/80 px-2 text-zinc-500">Or</span>
          </div>
        </div>
        <button
          type="button"
          disabled={loading || oauthLoading}
          onClick={() => void signInWithGoogle()}
          className="w-full rounded-lg border border-zinc-600 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        No account?{' '}
        <Link href="/signup" className="text-amber-400 hover:text-amber-300">
          Create one
        </Link>
      </p>
    </div>
  )
}
