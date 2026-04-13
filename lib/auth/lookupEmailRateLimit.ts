type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 24

export function rateLimitLookupEmail(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  let b = buckets.get(ip)
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(ip, b)
  }
  b.count += 1
  if (b.count > MAX_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }
  return { ok: true }
}
