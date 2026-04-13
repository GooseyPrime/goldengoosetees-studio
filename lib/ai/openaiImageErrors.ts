/**
 * Map OpenAI image API failures to stable UX and HTTP status for route handlers.
 */

export const OPENAI_BILLING_LIMIT_USER_MESSAGE =
  'Image generation is unavailable: your OpenAI account billing or usage limit was reached. Prefer Google Gemini for images: set GEMINI_API_KEY (and optional GEMINI_IMAGE_MODEL). Alternatively configure NANO_BANANA_API_BASE_URL and NANO_BANANA_API_KEY, or fix OpenAI billing in the dashboard.'

export class OpenAIImageServiceUnavailableError extends Error {
  readonly httpStatus = 503 as const
  readonly errorCode = 'openai_billing_or_quota' as const

  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'OpenAIImageServiceUnavailableError'
    if (options?.cause !== undefined && 'cause' in Error) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function errorStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'status' in e) {
    const s = (e as { status: unknown }).status
    return typeof s === 'number' ? s : undefined
  }
  return undefined
}

/**
 * Detects billing cap / quota style errors from OpenAI image endpoints.
 */
export function isOpenAIBillingOrQuotaError(e: unknown): boolean {
  const status = errorStatus(e)
  const msg = errorMessage(e).toLowerCase()
  if (status === 429) return true
  const billingHint =
    msg.includes('hard limit') ||
    msg.includes('billing hard limit') ||
    msg.includes('insufficient_quota') ||
    msg.includes('insufficient quota') ||
    (msg.includes('billing') &&
      (msg.includes('limit') || msg.includes('disabled') || msg.includes('exceeded')))
  if (billingHint) return true
  if (status === 400 && (msg.includes('billing') || msg.includes('quota'))) return true
  return false
}

/**
 * Re-throws as OpenAIImageServiceUnavailableError when billing/quota; otherwise rethrows original.
 */
export function rethrowIfOpenAIBillingLimit(e: unknown): never {
  console.error('[OpenAI image] request failed:', e)
  if (isOpenAIBillingOrQuotaError(e)) {
    throw new OpenAIImageServiceUnavailableError(OPENAI_BILLING_LIMIT_USER_MESSAGE, { cause: e })
  }
  throw e
}
