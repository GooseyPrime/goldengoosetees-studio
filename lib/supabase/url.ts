/**
 * Guardrails so the browser does not call auth/storage against the wrong origin (e.g. Vercel URL by mistake).
 */

const SUPABASE_HOST_RE = /\.supabase\.co$/i

export function isLikelySupabaseProjectUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && SUPABASE_HOST_RE.test(u.hostname)
  } catch {
    return false
  }
}

export function supabaseUrlMisconfigurationMessage(url: string): string {
  const hint = url.length > 56 ? `${url.slice(0, 56)}…` : url
  return `NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (https://<ref>.supabase.co), not your app domain. Current value: ${hint}`
}
