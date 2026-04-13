'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function signInWithGoogle() {
    setError(null)
    setNotice(null)
    setOauthLoading(true)
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin}/auth/callback` },
      })
      if (oErr) setError(oErr.message)
    } finally {
      setOauthLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const hint = await fetchSignInHint(email)
      if (hint === 'USE_GOOGLE') {
        setError(
          'An account with this email already uses Google. Sign in with “Continue with Google” instead of creating a new password.'
        )
        return
      }
      if (hint === 'USE_PASSWORD') {
        setError('An account with this email already exists. Sign in with your email and password.')
        return
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { full_name: fullName.trim() || undefined, name: fullName.trim() || undefined },
        },
      })
      if (signErr) {
        setError(signErr.message)
        return
      }
      setNotice('Check your email to confirm your account, or sign in if confirmation is disabled.')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
      <Link href="/studio" className="mb-8 text-amber-400/90 hover:text-amber-300 text-sm">
        ← Back to studio
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <h1 className="font-serif text-2xl font-semibold text-zinc-50">Create account</h1>
        <p className="mt-1 text-sm text-zinc-400">Save your shirt designs and assistant conversations.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-1">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={6}
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
            {loading ? 'Creating…' : 'Sign up'}
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
          Already have an account?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
