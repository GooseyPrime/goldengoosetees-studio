import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { rateLimitLookupEmail } from '@/lib/auth/lookupEmailRateLimit'
import { signInMethodFromIdentities } from '@/lib/auth/signInMethodHint'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Auth lookup is not configured' },
      { status: 503 }
    )
  }

  const ip = clientIp(req)
  const limited = rateLimitLookupEmail(ip)
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', retryAfterSec: limited.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const emailRaw = body && typeof body === 'object' && 'email' in body ? String((body as { email: unknown }).email) : ''
  const email = normalizeEmail(emailRaw)
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const perPage = 200
    const maxPages = 15

    for (let page = 1; page <= maxPages; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error('auth.admin.listUsers:', error)
        return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 })
      }
      const users = data?.users ?? []
      const match = users.find((u) => (u.email || '').toLowerCase() === email)
      if (match) {
        const code = signInMethodFromIdentities(match.identities)
        return NextResponse.json({ success: true, code })
      }
      if (users.length < perPage) break
    }

    return NextResponse.json({ success: true, code: 'NO_ACCOUNT' as const })
  } catch (e) {
    console.error('lookup-email:', e)
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 })
  }
}
