/** Coarse hint for login/signup UX — no PII in responses. */
export type SignInMethodCode = 'USE_GOOGLE' | 'USE_PASSWORD' | 'NO_ACCOUNT'

type IdentityRow = { provider?: string }

export function signInMethodFromIdentities(identities: unknown): SignInMethodCode {
  if (!Array.isArray(identities) || identities.length === 0) {
    return 'USE_PASSWORD'
  }
  const providers = new Set(
    identities
      .filter((x): x is IdentityRow => x != null && typeof x === 'object')
      .map((x) => String(x.provider || '').toLowerCase())
      .filter(Boolean)
  )
  const hasGoogle = providers.has('google')
  const hasEmail = providers.has('email')
  if (hasGoogle && !hasEmail) return 'USE_GOOGLE'
  if (hasEmail) return 'USE_PASSWORD'
  if (hasGoogle) return 'USE_GOOGLE'
  return 'USE_PASSWORD'
}
